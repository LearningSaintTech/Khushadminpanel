import { apiConnector } from "../services/Apiconnector";

const getData = (res) => res?.data ?? res;

export const moduleAccessApi = {
  getMeta: () => apiConnector("GET", "/admin/module-access/meta").then(getData),
  getRoleAccess: (role) =>
    apiConnector("GET", `/admin/module-access/${role}`).then(getData),
  setRoleAccess: ({ role, allowedModules }) =>
    apiConnector("PUT", "/admin/module-access", { role, allowedModules }).then(getData),
};

