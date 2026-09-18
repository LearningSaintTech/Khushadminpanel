import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useModuleAccess } from "../context/ModuleAccessContext";
import {
  canAccessPanelPath,
  getRequiredModulesForPanelPath,
} from "../config/adminPanelModuleMap";
import AccessDenied from "./AccessDenied";
import ViewOnlyGuard from "./ViewOnlyGuard";

export default function SubadminModuleGate({ children }) {
  const location = useLocation();
  const { basePath, filterByModules, isFullAdmin, canUse, canMutate, loading } = useModuleAccess();

  if (!filterByModules || isFullAdmin) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-stone-500">
        <span className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
          Loading permissions…
        </span>
      </div>
    );
  }

  const { adminOnly, exempt, modules } = getRequiredModulesForPanelPath(
    location.pathname,
    basePath,
  );

  const allowed = exempt ||
    canAccessPanelPath({
      pathname: location.pathname,
      basePath,
      isFullAdmin,
      canUse,
    });

  if (!allowed) {
    const reason = adminOnly
      ? "This area is restricted to full administrators only."
      : modules?.length
        ? `Required module access: ${modules.join(", ")}`
        : undefined;
    return <AccessDenied basePath={basePath} reason={reason} />;
  }

  const viewOnly = !exempt && !adminOnly && Boolean(modules?.length) && !canMutate(modules);
  const writePath = /\/(create|edit|add|new)(?:\/|$)/i.test(location.pathname);

  if (viewOnly && writePath) {
    return (
      <AccessDenied
        basePath={basePath}
        reason="View-only access: you can browse this module but cannot open create or edit screens."
      />
    );
  }

  return <ViewOnlyGuard enabled={viewOnly}>{children}</ViewOnlyGuard>;
}
