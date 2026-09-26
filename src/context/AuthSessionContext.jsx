import { createContext, useContext, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import appStore from "../redux/Appstore";
import { setToken, setRole } from "../redux/GlobalSlice";
import { clearLegacyAuthStorage } from "../utils/apiConfig";
import { refreshAccessTokenWithFallback, resolveRefreshRole } from "../utils/authSession";
import { decodeTokenRole, isTokenExpired, normalizeRole } from "../utils/authRole";
import { performLogout } from "../utils/sessionLogout";
import { getUserProfile } from "../admin/apis/Authapi";
import { subadminApi } from "../subadmin/apis/subadminApi";
import { designerApi } from "../designer/apis/designerApi";
import { driverGetProfile } from "../driver/apis/driverApi";
import { getInfluencerProfile } from "../influencer/influencerapis/authapi";
import { getMySupportTickets } from "../supportAgent/apis/supportAgentApi";

const AuthSessionContext = createContext({ sessionReady: false });

const VALIDATED_PANEL_ROLES = new Set([
  "ADMIN",
  "SUBADMIN",
  "DESIGNER",
  "DRIVER",
  "INFLUENCER",
  "AGENT",
]);

function authErrorStatus(err) {
  return (
    err?.status ||
    err?.response?.status ||
    (typeof err?.message === "string" && /\b401\b/.test(err.message) ? 401 : null)
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}

async function validateSessionWithServer(role) {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "ADMIN":
      await getUserProfile();
      return;
    case "SUBADMIN":
      await subadminApi.getMyModuleAccess();
      return;
    case "DESIGNER":
      await designerApi.getProfile();
      return;
    case "DRIVER":
      await driverGetProfile();
      return;
    case "INFLUENCER":
      await getInfluencerProfile();
      return;
    case "AGENT":
      await getMySupportTickets({ page: 1, limit: 1 });
      return;
    default:
      return;
  }
}

/** Restore access token from persist / httpOnly refresh cookie after page load. */
export function AuthSessionProvider({ children }) {
  const dispatch = useDispatch();
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const token = useSelector((state) => state.global?.token);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (rehydrated !== true) return;

    let cancelled = false;

    (async () => {
      clearLegacyAuthStorage();

      const state = appStore.getState().global;
      let currentToken = state?.token;
      const hadValidPersisted =
        Boolean(currentToken) && !isTokenExpired(currentToken);
      const needsRefresh = !currentToken || isTokenExpired(currentToken);
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";

      console.log("[AuthSession] boot", {
        pathname,
        hasToken: Boolean(currentToken),
        expired: currentToken ? isTokenExpired(currentToken) : null,
        role: state?.role,
        needsRefresh,
      });

      if (needsRefresh) {
        const refreshRole = resolveRefreshRole({
          token: currentToken,
          role: state?.role,
          pathname,
        });

        if (refreshRole && normalizeRole(refreshRole) !== "ORDER_AGENT") {
          try {
            const newToken = await refreshAccessTokenWithFallback(
              refreshRole,
              pathname,
            );
            if (!cancelled && newToken) {
              currentToken = newToken;
              dispatch(setToken(newToken));
              dispatch(setRole(decodeTokenRole(newToken)));
              console.log("[AuthSession] refresh ok", {
                role: decodeTokenRole(newToken),
              });
            } else if (!cancelled && !newToken) {
              // Keep a still-valid persisted token; only logout when nothing usable.
              if (!hadValidPersisted) {
                console.warn(
                  "[AuthSession] refresh returned empty — logging out",
                );
                await performLogout({ server: false });
                currentToken = null;
              } else {
                console.warn(
                  "[AuthSession] refresh failed — keeping persisted token",
                );
              }
            }
          } catch (err) {
            console.warn("[AuthSession] refresh error", err);
            if (!cancelled && !hadValidPersisted) {
              await performLogout({ server: false });
              currentToken = null;
            }
          }
        } else if (!cancelled && !hadValidPersisted) {
          // No role hint and no token — stay logged out quietly.
          currentToken = null;
        }
      }

      if (!cancelled && currentToken && !isTokenExpired(currentToken)) {
        const role = decodeTokenRole(currentToken) || state?.role;
        if (role) dispatch(setRole(role));

        const normalized = normalizeRole(role);
        if (VALIDATED_PANEL_ROLES.has(normalized)) {
          try {
            await validateSessionWithServer(role);
            console.log("[AuthSession] profile validate ok", { role: normalized });
          } catch (err) {
            const status = authErrorStatus(err);
            console.warn("[AuthSession] profile validate failed", {
              role: normalized,
              status,
              err,
            });
            // Only force logout on auth rejection — network blips should not kick the user out.
            if (!cancelled && (status === 401 || status === 403)) {
              await performLogout({ server: true });
              currentToken = null;
            }
          }
        }
      }

      if (!cancelled) setSessionReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [rehydrated, dispatch]);

  useEffect(() => {
    if (rehydrated === true && token && !isTokenExpired(token) && !sessionReady) {
      setSessionReady(true);
    }
  }, [rehydrated, token, sessionReady]);

  if (rehydrated !== true || !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-600">
        Loading…
      </div>
    );
  }

  return (
    <AuthSessionContext.Provider value={{ sessionReady }}>
      {children}
    </AuthSessionContext.Provider>
  );
}
