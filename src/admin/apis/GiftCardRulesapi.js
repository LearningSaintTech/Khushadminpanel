import { apiConnector } from "../services/Apiconnector";

const BASE = "/gift-card/rules";

export const listGiftCardRules = (page = 1, limit = 20, isActive) => {
  let url = `${BASE}?page=${page}&limit=${limit}`;
  if (typeof isActive === "boolean") {
    url += `&isActive=${isActive}`;
  }
  return apiConnector("GET", url);
};

export const getActiveGiftCardRules = () => apiConnector("GET", `${BASE}/active`);

export const getGiftCardRuleById = (id) => apiConnector("GET", `${BASE}/${id}`);

export const createGiftCardRules = (formData) => apiConnector("POST", BASE, formData);

export const updateGiftCardRules = (id, formData) =>
  apiConnector("PUT", `${BASE}/${id}`, formData);

export const toggleGiftCardRulesActive = (id, isActive) =>
  apiConnector("PATCH", `${BASE}/${id}/toggle-active`, { isActive });

export const deleteGiftCardRules = (id) => apiConnector("DELETE", `${BASE}/${id}`);

export const previewGiftCardCredit = (faceValue) =>
  apiConnector("GET", `${BASE}/preview-credit`, null, {}, { faceValue });
