import { apiConnector } from "../services/Apiconnector";

export const deliveryEndpoints = {
  CREATE_DELIVERY: "/delivery/create",
  GET_DELIVERIES: "/delivery/getAll",
  UPDATE_DELIVERY: "/delivery/update",
  DELETE_DELIVERY: "/delivery/delete",
  CHECK_DELIVERY: "/delivery/check",   // ✅ Added
};

// 🔹 Create Delivery
export const createDelivery = (data) => {
  return apiConnector("POST", deliveryEndpoints.CREATE_DELIVERY, data);
};

// 🔹 Get All Deliveries
export const getDeliveries = (page = 1, limit = 10) => {
  return apiConnector("GET", deliveryEndpoints.GET_DELIVERIES, null, null, { page, limit });
};

// 🔹 Update Delivery
export const updateDelivery = (id, data) => {
  return apiConnector(
    "PUT",
    `${deliveryEndpoints.UPDATE_DELIVERY}/${id}`,
    data
  );
};

// 🔹 Delete Delivery
export const deleteDelivery = (id) => {
  return apiConnector(
    "DELETE",
    `${deliveryEndpoints.DELETE_DELIVERY}/${id}`
  );
};

// 🔹 Check Delivery by Pincode ✅ NEW
export const checkDeliveryByPincode = (pinCode) => {
  return apiConnector(
    "GET",
    `${deliveryEndpoints.CHECK_DELIVERY}/${pinCode}`
  );
};
