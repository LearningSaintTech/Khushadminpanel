import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { subadminApi } from "../subadmin/apis/subadminApi";
import { decodeTokenRole, getRawRoleFromToken, getValidTokenRole, normalizeRole } from "../utils/authRole";

const ModuleAccessContext = createContext(null);

export function ModuleAccessProvider({ basePath = "/admin", filterByModules = false, children }) {
  const reduxToken = useSelector((s) => s.global?.token);
  const reduxRole = useSelector((s) => s.global?.role);
  const token = reduxToken;

  const tokenRole = getValidTokenRole(token) || decodeTokenRole(token);
  const normalizedRole = normalizeRole(tokenRole || reduxRole);
  const rawRole = getRawRoleFromToken(token);
  const isFullAdmin =
    normalizedRole === "ADMIN" || (basePath === "/admin" && !filterByModules);

  const [allowedModules, setAllowedModules] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const shouldFetch =
    filterByModules &&
    !isFullAdmin &&
    (normalizedRole === "SUBADMIN" ||
      rawRole === "super_subadmin" ||
      String(reduxRole || "").trim().toUpperCase() === "SUPER_SUBADMIN");

  const loadModules = useCallback(async () => {
    if (!shouldFetch) {
      setAllowedModules(null);
      setSource(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await subadminApi.getMyModuleAccess();
      const list = res?.data?.allowedModules ?? res?.allowedModules ?? [];
      setAllowedModules(new Set(Array.isArray(list) ? list : []));
      setSource(res?.data?.source ?? res?.source ?? "role");
    } catch (e) {
      setAllowedModules(new Set());
      setError(e?.message || "Failed to load module access");
    } finally {
      setLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const canUse = useCallback(
    (keys) => {
      if (isFullAdmin) return true;
      if (!keys?.length) return true;
      if (!shouldFetch) return true;
      if (allowedModules === null) return false;
      return keys.some((k) => allowedModules.has(k));
    },
    [isFullAdmin, shouldFetch, allowedModules],
  );

  const value = useMemo(
    () => ({
      basePath,
      filterByModules,
      isFullAdmin,
      normalizedRole,
      rawRole,
      allowedModules,
      source,
      loading,
      error,
      canUse,
      refetch: loadModules,
    }),
    [
      basePath,
      filterByModules,
      isFullAdmin,
      normalizedRole,
      rawRole,
      allowedModules,
      source,
      loading,
      error,
      canUse,
      loadModules,
    ],
  );

  return (
    <ModuleAccessContext.Provider value={value}>{children}</ModuleAccessContext.Provider>
  );
}

export function useModuleAccess() {
  const ctx = useContext(ModuleAccessContext);
  if (!ctx) {
    return {
      basePath: "/admin",
      filterByModules: false,
      isFullAdmin: true,
      normalizedRole: "ADMIN",
      rawRole: "admin",
      allowedModules: null,
      source: null,
      loading: false,
      error: "",
      canUse: () => true,
      refetch: () => Promise.resolve(),
    };
  }
  return ctx;
}

export default ModuleAccessContext;
