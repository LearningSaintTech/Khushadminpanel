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

/** Restore access token from httpOnly refresh cookie after page load. */
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
      const needsRefresh = !currentToken || isTokenExpired(currentToken);
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";

      if (needsRefresh) {
        const refreshRole = resolveRefreshRole({
          token: currentToken,
          role: state?.role,
          pathname,
        });

        if (refreshRole && normalizeRole(refreshRole) !== "ORDER_AGENT") {
          try {
            const newToken = await refreshAccessTokenWithFallback(refreshRole, pathname);
            if (!cancelled && newToken) {
              currentToken = newToken;
              dispatch(setToken(newToken));
              dispatch(setRole(decodeTokenRole(newToken)));
            } else if (!cancelled && !newToken) {
              await performLogout({ server: false });
              currentToken = null;
            }
          } catch {
            if (!cancelled) {
              await performLogout({ server: false });
              currentToken = null;
            }
          }
        }
      }

      if (!cancelled && currentToken && !isTokenExpired(currentToken)) {
        const role = decodeTokenRole(currentToken);
        if (role) dispatch(setRole(role));

        const normalized = normalizeRole(role);
        if (VALIDATED_PANEL_ROLES.has(normalized)) {
          try {
            await validateSessionWithServer(role);
          } catch {
            if (!cancelled) {
              await performLogout({ server: true });
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
