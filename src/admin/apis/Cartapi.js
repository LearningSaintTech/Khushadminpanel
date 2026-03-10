import { apiConnector } from "../services/Apiconnector";

// API endpoints
const CART_CHARGE_API = {
  CREATE: "/cart-charges/create",
  GET_ALL: "/cart-charges/getAll",
  GET_SINGLE: "/cart-charges/getSingle",
  UPDATE: "/cart-charges/update",
  TOGGLE_STATUS: "/cart-charges",
  DELETE: "/cart-charges/delete",
};

// ✅ Create Cart Charges
export const createCartCharges = (data) => {
  return apiConnector("POST", CART_CHARGE_API.CREATE, data);
};

// ✅ Get All Cart Charges with pagination
export const getCartCharges = (page = 1, limit = 10) => {
  return apiConnector("GET", `${CART_CHARGE_API.GET_ALL}?page=${page}&limit=${limit}`);
};

// ✅ Get Single Cart Charge by ID
export const getSingleCartCharge = (id) => {
  return apiConnector("GET", `${CART_CHARGE_API.GET_SINGLE}/${id}`);
};

// ✅ Update Cart Charges
export const updateCartCharges = (id, data) => {
  return apiConnector("PATCH", `${CART_CHARGE_API.UPDATE}/${id}`, data);
};

// ✅ Toggle Active Status
export const toggleCartChargeStatus = (id) => {
  return apiConnector("PATCH", `${CART_CHARGE_API.TOGGLE_STATUS}/${id}/toggle`);
};

// ✅ Delete Cart Charges
export const deleteCartCharges = (id) => {
  return apiConnector("DELETE", `${CART_CHARGE_API.DELETE}/${id}`);
};
