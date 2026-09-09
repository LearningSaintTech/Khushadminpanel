import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { subadminApi } from "../subadmin/apis/subadminApi";
import { decodeTokenRole, getRawRoleFromToken, getValidTokenRole, normalizeRole } from "../utils/authRole";
import {
  ACCESS_LEVEL_FULL,
  ACCESS_LEVEL_VIEW,
  parseModuleAccessResponse,
} from "../utils/moduleAccessLevels";

const ModuleAccessContext = createContext(null);

const fullAccessFallback = {
  basePath: "/admin",
  filterByModules: false,
  isFullAdmin: true,
  normalizedRole: "ADMIN",
  rawRole: "admin",
  allowedModules: null,
  moduleLevels: {},
  source: null,
  loading: false,
  error: "",
  canUse: () => true,
  canMutate: () => true,
  getModuleLevel: () => ACCESS_LEVEL_FULL,
  refetch: () => Promise.resolve(),
};

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
  const [moduleLevels, setModuleLevels] = useState({});
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
      setModuleLevels({});
      setSource(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await subadminApi.getMyModuleAccess();
      const parsed = parseModuleAccessResponse(res);
      setAllowedModules(new Set(parsed.allowedModules));
      setModuleLevels(parsed.moduleLevels);
      setSource(parsed.source || "role");
    } catch (e) {
      setAllowedModules(new Set());
      setModuleLevels({});
      setError(e?.message || "Failed to load module access");
    } finally {
      setLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const getModuleLevel = useCallback(
    (key) => {
      if (isFullAdmin || !shouldFetch) return ACCESS_LEVEL_FULL;
      if (!key) return ACCESS_LEVEL_FULL;
      return moduleLevels[key] === ACCESS_LEVEL_VIEW ? ACCESS_LEVEL_VIEW : ACCESS_LEVEL_FULL;
    },
    [isFullAdmin, shouldFetch, moduleLevels],
  );

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

  const canMutate = useCallback(
    (keys) => {
      if (isFullAdmin) return true;
      if (!keys?.length) return true;
      if (!shouldFetch) return true;
      if (allowedModules === null) return false;
      return keys.some(
        (k) => allowedModules.has(k) && moduleLevels[k] !== ACCESS_LEVEL_VIEW,
      );
    },
    [isFullAdmin, shouldFetch, allowedModules, moduleLevels],
  );

  const value = useMemo(
    () => ({
      basePath,
      filterByModules,
      isFullAdmin,
      normalizedRole,
      rawRole,
      allowedModules,
      moduleLevels,
      source,
      loading,
      error,
      canUse,
      canMutate,
      getModuleLevel,
      refetch: loadModules,
    }),
    [
      basePath,
      filterByModules,
      isFullAdmin,
      normalizedRole,
      rawRole,
      allowedModules,
      moduleLevels,
      source,
      loading,
      error,
      canUse,
      canMutate,
      getModuleLevel,
      loadModules,
    ],
  );

  return (
    <ModuleAccessContext.Provider value={value}>{children}</ModuleAccessContext.Provider>
  );
}

export function useModuleAccess() {
  const ctx = useContext(ModuleAccessContext);
  if (!ctx) return fullAccessFallback;
  return ctx;
}

export default ModuleAccessContext;
