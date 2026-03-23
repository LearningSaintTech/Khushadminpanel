import { createContext, useContext, useMemo } from "react";

const AdminPanelBasePathContext = createContext("/admin");

export function AdminPanelBasePathProvider({ basePath = "/admin", children }) {
  const value = useMemo(() => {
    const normalized = String(basePath || "/admin").replace(/\/$/, "") || "/admin";
    return normalized;
  }, [basePath]);
  return (
    <AdminPanelBasePathContext.Provider value={value}>
      {children}
    </AdminPanelBasePathContext.Provider>
  );
}

export function useAdminPanelBasePath() {
  return useContext(AdminPanelBasePathContext);
}
