import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { setRole, setToken } from "../../../redux/GlobalSlice";
import { clearOtherPanelSessions, getValidTokenRole } from "../../../utils/authRole";
import { designerApi } from "../../apis/designerApi";
import { LayoutGrid, Loader2, Search, User } from "lucide-react";

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

export default function DesignerSelectPanel() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const reduxToken = useSelector((state) => state.global?.token);
  const [panels, setPanels] = useState(() => readCachedPanels());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (rehydrated !== true) return;
    const role = getValidTokenRole(reduxToken);
    if (role === "DESIGNER") {
      navigate("/designer/dashboard", { replace: true });
      return;
    }
    if (role !== "DESIGNER_OPS") {
      navigate("/designer/login", { replace: true });
    }
  }, [rehydrated, reduxToken, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await designerApi.listPanels();
        const payload = res?.data ?? res;
        const list = payload?.designers || payload?.data?.designers || [];
        if (!cancelled) {
          setPanels(Array.isArray(list) ? list : []);
          sessionStorage.setItem("designerPanelOptions", JSON.stringify(list || []));
        }
      } catch (err) {
        if (!cancelled && panels.length === 0) {
          setError(typeof err === "string" ? err : err?.message || "Failed to load designer panels");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (getValidTokenRole(reduxToken) === "DESIGNER_OPS") {
      load();
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxToken]);

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
      const res = await designerApi.selectPanel({ designerId });
      const payload = res?.data ?? res;
      const token = payload?.accessToken;
      if (!token) throw new Error("Could not open designer panel");
      let role = String(payload?.role || "").toUpperCase();
      if (!role) role = String(jwtDecode(token)?.role || "").toUpperCase();
      if (role !== "DESIGNER") throw new Error("Invalid panel token");
      clearOtherPanelSessions(role);
      dispatch(setToken(token));
      dispatch(setRole(role));
      sessionStorage.removeItem("designerPanelOptions");
      if (payload?.designer?.name) {
        sessionStorage.setItem("designerPanelName", String(payload.designer.name));
      }
      navigate("/designer/dashboard", { replace: true });
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Failed to open panel");
    } finally {
      setSelectingId("");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <LayoutGrid size={24} />
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">Choose designer panel</h1>
        <p className="mt-1 text-center text-sm text-gray-600">
          OTP is done. Open the panel you want to manage — product and listing edits stay open for
          this session with no further OTP.
        </p>

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
            return (
              <button
                key={String(id)}
                type="button"
                disabled={Boolean(selectingId)}
                onClick={() => handleSelect(id)}
                className="flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/60 disabled:opacity-60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700">
                  {panel.profileImage ? (
                    <img src={panel.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{panel.name || "Designer"}</p>
                  <p className="truncate text-xs text-gray-500">
                    {[panel.phoneNumber, panel.employeeId, panel.city].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-indigo-700">
                  {busy ? "Opening…" : "Open"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
