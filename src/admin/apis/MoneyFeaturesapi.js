import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/wallet";

export const getWalletOverview = () => apiConnector("GET", `${BASE}/overview`);

export const getCashWallets = (page = 1, limit = 20, search = "") => {
  let url = `${BASE}/cash-wallets?page=${page}&limit=${limit}`;
  if (search?.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
  return apiConnector("GET", url);
};

export const getCashTransactions = (
  page = 1,
  limit = 20,
  { source = "", type = "", status = "" } = {},
) => {
  let url = `${BASE}/cash-transactions?page=${page}&limit=${limit}`;
  if (source) url += `&source=${encodeURIComponent(source)}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  return apiConnector("GET", url);
};

export const getRewardWallets = (page = 1, limit = 20, search = "") => {
  let url = `${BASE}/reward-wallets?page=${page}&limit=${limit}`;
  if (search?.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
  return apiConnector("GET", url);
};

export const getRewardTransactions = (
  page = 1,
  limit = 20,
  { type = "", source = "" } = {},
) => {
  let url = `${BASE}/reward-transactions?page=${page}&limit=${limit}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  if (source) url += `&source=${encodeURIComponent(source)}`;
  return apiConnector("GET", url);
};

/** POST /admin/wallet/adjust — credit or debit cash or reward wallet */
export const adjustWallet = (body) =>
  apiConnector("POST", `${BASE}/adjust`, body);
