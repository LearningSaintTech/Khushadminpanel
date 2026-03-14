import { apiConnector } from "../services/Apiconnector";

export const deliveryEndpoints = {
  CREATE_DELIVERY: "/delivery/create",
  GET_DELIVERIES: "/delivery/getAll",
  GET_SINGLE_DELIVERY: "/delivery/getSingle", // ✅ NEW
  UPDATE_DELIVERY: "/delivery/update",
  DELETE_DELIVERY: "/delivery/delete",
  CHECK_DELIVERY: "/delivery/check",
};

// 🔹 Create Delivery
export const createDelivery = (data) => {
  return apiConnector("POST", deliveryEndpoints.CREATE_DELIVERY, data);
};

// 🔹 Get All Deliveries
export const getDeliveries = (page = 1, limit = 10) => {
  return apiConnector(
    "GET",
    deliveryEndpoints.GET_DELIVERIES,
    null,
    null,
    { page, limit }
  );
};

// 🔹 Get Single Delivery ✅ NEW
export const getSingleDelivery = (id) => {
  return apiConnector(
    "GET",
    `${deliveryEndpoints.GET_SINGLE_DELIVERY}/${id}`
  );
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

// 🔹 Check Delivery by Pincode
export const checkDeliveryByPincode = (pinCode) => {
  return apiConnector(
    "GET",
    `${deliveryEndpoints.CHECK_DELIVERY}/${pinCode}`
  );
};
