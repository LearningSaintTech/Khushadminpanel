import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { setRole, setToken } from "../../../redux/GlobalSlice";
import {
  canSwitchDesignerPanels,
  clearOtherPanelSessions,
  decodeTokenRole,
  getStashedDesignerOpsToken,
  getValidTokenRole,
  isTokenExpired,
  markDesignerPanelSwitchable,
  stashDesignerOpsToken,
} from "../../../utils/authRole";
import { designerApi } from "../../apis/designerApi";
import { ArrowLeft, LayoutGrid, Loader2, Search, User } from "lucide-react";

function readCachedPanels() {
  try {
    const raw = sessionStorage.getItem("designerPanelOptions");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readPanelName() {
  try {
    return sessionStorage.getItem("designerPanelName") || "";
  } catch {
    return "";
  }
}

/**
 * Choose / switch designer panel.
 * - DESIGNER_OPS after OTP → pick first panel
 * - DESIGNER with ?switch=1 (sidebar "Back to designers") → pick another without logout
 */
export default function DesignerSelectPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const reduxToken = useSelector((state) => state.global?.token);

  const switchMode =
    searchParams.get("switch") === "1" ||
    Boolean(location.state?.switch) ||
    canSwitchDesignerPanels();

  const [panels, setPanels] = useState(() => readCachedPanels());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const currentName = readPanelName();

  useEffect(() => {
    if (rehydrated !== true) return;

    const validRole = getValidTokenRole(reduxToken);
    const decodedRole = decodeTokenRole(reduxToken);

    // Switching panels while already working as a designer — stay on this page.
    if (validRole === "DESIGNER" && switchMode) {
      setReady(true);
      return;
    }

    if (validRole === "DESIGNER" && !switchMode) {
      navigate("/designer/dashboard", { replace: true });
      return;
    }

    if (validRole === "DESIGNER_OPS") {
      setReady(true);
      return;
    }

    // Expired ops token in stash — try restore for switch / list.
    const stashed = getStashedDesignerOpsToken();
    if (stashed && (!reduxToken || isTokenExpired(reduxToken) || decodedRole === "DESIGNER")) {
      if (!isTokenExpired(stashed)) {
        console.log("[Designer] select-panel: restoring ops token from stash");
        dispatch(setToken(stashed));
        dispatch(setRole("DESIGNER_OPS"));
        setReady(true);
        return;
      }
    }

    // Still have a designer token but switch flag — allow list (API may accept designer JWT).
    if (validRole === "DESIGNER" || decodedRole === "DESIGNER") {
      setReady(true);
      return;
    }

    console.warn("[Designer] select-panel: no session — login", {
      validRole,
      decodedRole,
      switchMode,
      hasStash: Boolean(stashed),
    });
    navigate("/designer/login", { replace: true });
  }, [rehydrated, reduxToken, navigate, switchMode, dispatch]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      const roleNow = getValidTokenRole(reduxToken);
      const stashedOps = getStashedDesignerOpsToken();
      const opsHeaders =
        stashedOps && !isTokenExpired(stashedOps)
          ? { Authorization: `Bearer ${stashedOps}` }
          : {};

      const tryLoad = async (headers = {}) => {
        const res = await designerApi.listPanels(headers);
        const payload = res?.data ?? res;
        return payload?.designers || payload?.data?.designers || [];
      };

      try {
        console.log("[Designer] listPanels →", { role: roleNow, switchMode });
        // Prefer ops token for list when switching as DESIGNER.
        const headers =
          roleNow === "DESIGNER" && opsHeaders.Authorization ? opsHeaders : {};
        let list = await tryLoad(headers);
        if (!cancelled) {
          setPanels(Array.isArray(list) ? list : []);
          sessionStorage.setItem("designerPanelOptions", JSON.stringify(list || []));
        }
      } catch (err) {
        console.warn("[Designer] listPanels failed — retry with ops stash", err);
        if (opsHeaders.Authorization) {
          try {
            const list = await tryLoad(opsHeaders);
            if (!cancelled) {
              setPanels(Array.isArray(list) ? list : []);
              sessionStorage.setItem("designerPanelOptions", JSON.stringify(list || []));
              setError("");
              return;
            }
          } catch (err2) {
            console.error("[Designer] listPanels with ops token failed", err2);
          }
        }
        if (!cancelled && panels.length === 0) {
          setError(
            typeof err === "string"
              ? err
              : err?.message || "Failed to load designer panels",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reduxToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return panels;
    return panels.filter((p) => {
      const hay = `${p.name || ""} ${p.phoneNumber || ""} ${p.employeeId || ""} ${p.city || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [panels, query]);

  const handleSelect = async (designerId) => {
    if (!designerId || selectingId) return;
    setSelectingId(String(designerId));
    setError("");
    try {
      const roleNow = getValidTokenRole(reduxToken);
      if (roleNow === "DESIGNER_OPS" && reduxToken) {
        stashDesignerOpsToken(reduxToken);
      }
      markDesignerPanelSwitchable();

      // select-panel requires DESIGNER_OPS. When switching (Anisha → Sakshi) we are DESIGNER —
      // call the API with the stashed ops token without putting OPS into Redux (avoids login redirect).
      const stashedOps = getStashedDesignerOpsToken();
      const authTokenForSelect =
        roleNow === "DESIGNER_OPS"
          ? reduxToken
          : stashedOps && !isTokenExpired(stashedOps)
            ? stashedOps
            : reduxToken;

      const headers =
        authTokenForSelect && authTokenForSelect !== reduxToken
          ? { Authorization: `Bearer ${authTokenForSelect}` }
          : {};

      console.log("[Designer] selectPanel →", {
        designerId,
        roleNow,
        usingOpsStash: Boolean(
          authTokenForSelect &&
            stashedOps &&
            authTokenForSelect === stashedOps &&
            roleNow !== "DESIGNER_OPS",
        ),
      });

      const res = await designerApi.selectPanel({ designerId }, headers);
      const payload = res?.data ?? res;
      const token = payload?.accessToken;
      if (!token) throw new Error("Could not open designer panel");
      let role = String(payload?.role || "").toUpperCase();
      if (!role) role = String(jwtDecode(token)?.role || "").toUpperCase();
      if (role !== "DESIGNER") throw new Error("Invalid panel token");

      // Keep ops stash for the next switch; only clear unrelated panel sessions.
      clearOtherPanelSessions(role);
      markDesignerPanelSwitchable();
      if (stashedOps && !isTokenExpired(stashedOps)) {
        stashDesignerOpsToken(stashedOps);
      }

      dispatch(setToken(token));
      dispatch(setRole(role));
      if (payload?.designer?.name) {
        sessionStorage.setItem("designerPanelName", String(payload.designer.name));
      }
      console.log("[Designer] panel opened", {
        designerId,
        name: payload?.designer?.name,
        role,
      });
      navigate("/designer/dashboard", { replace: true });
    } catch (err) {
      console.error("[Designer] selectPanel failed", err);
      const status = err?.status || err?.response?.status;
      const msg =
        typeof err === "string"
          ? err
          : err?.message || "Failed to open panel";
      if (status === 401) {
        setError(
          "Could not switch panel (session expired for designer list). Please open the list again or log in once more.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setSelectingId("");
    }
  };

  const goBackToCurrentPanel = () => {
    if (getValidTokenRole(reduxToken) === "DESIGNER") {
      navigate("/designer/dashboard");
      return;
    }
    navigate(-1);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-indigo-100">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <LayoutGrid size={24} />
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">
          {switchMode && getValidTokenRole(reduxToken) === "DESIGNER"
            ? "Switch designer panel"
            : "Choose designer panel"}
        </h1>
        <p className="mt-1 text-center text-sm text-gray-600">
          {switchMode && getValidTokenRole(reduxToken) === "DESIGNER" ? (
            <>
              Working as{" "}
              <span className="font-semibold text-indigo-700">
                {currentName || "current designer"}
              </span>
              . Pick another designer to open their panel — no logout needed.
            </>
          ) : (
            <>
              OTP is done. Open the panel you want to manage — you can switch designers later from
              the sidebar.
            </>
          )}
        </p>

        {switchMode && getValidTokenRole(reduxToken) === "DESIGNER" ? (
          <button
            type="button"
            onClick={goBackToCurrentPanel}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900"
          >
            <ArrowLeft size={16} />
            Stay on {currentName || "current panel"}
          </button>
        ) : null}

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, employee ID…"
            className="w-full rounded-xl border border-indigo-100 bg-indigo-50/30 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {loading && panels.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading panels…
            </div>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No designer panels found.</p>
          ) : null}
          {filtered.map((panel) => {
            const id = panel.designerId || panel._id;
            const busy = selectingId && selectingId === String(id);
            const isCurrent =
              currentName &&
              String(panel.name || "").toLowerCase() === String(currentName).toLowerCase();
            return (
              <button
                key={String(id)}
                type="button"
                disabled={Boolean(selectingId)}
                onClick={() => handleSelect(id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:opacity-60 ${
                  isCurrent
                    ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                    : "border-indigo-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/60"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700">
                  {panel.profileImage ? (
                    <img src={panel.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">
                    {panel.name || "Designer"}
                    {isCurrent ? (
                      <span className="ml-2 text-[10px] font-medium text-indigo-600">Current</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[panel.phoneNumber, panel.employeeId, panel.city].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-indigo-700">
                  {busy ? "Opening…" : isCurrent ? "Re-open" : "Open"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
