import { apiConnector } from "../services/Apiconnector";

export const deliveryAgentEndpoints = {
  CREATE_DELIVERY_AGENT: "/admin/panels/delivery-agent/create",
  GET_DELIVERY_AGENTS: "/admin/panels/delivery-agent/list",
  GET_DELIVERY_AGENT_BY_ID: "/admin/panels/delivery-agent",
  UPDATE_DELIVERY_AGENT: "/admin/panels/delivery-agent",
  DELETE_DELIVERY_AGENT: "/admin/panels/delivery-agent/delete",
  TOGGLE_STATUS: "/admin/panels/delivery-agent",
};



// ✅ Create Delivery Agent
export const createDeliveryAgent = (data) => {
  return apiConnector(
    "POST",
    deliveryAgentEndpoints.CREATE_DELIVERY_AGENT,
    data
  );
};



// ✅ Get Delivery Agent List (pagination + search + optional active filter)
export const getDeliveryAgents = (
  page = 1,
  limit = 10,
  search = "",
  isActive = undefined
) => {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search: search || "",
  });

  if (isActive !== undefined && isActive !== null && isActive !== "") {
    queryParams.append("isActive", String(isActive));
  }

  return apiConnector(
    "GET",
    `${deliveryAgentEndpoints.GET_DELIVERY_AGENTS}?${queryParams.toString()}`
  );
};



// ✅ Get Delivery Agent By ID
export const getDeliveryAgentById = (id) => {
  return apiConnector(
    "GET",
    `${deliveryAgentEndpoints.GET_DELIVERY_AGENT_BY_ID}/${id}`
  );
};



// ✅ Update Delivery Agent
export const updateDeliveryAgent = (id, data) => {
  return apiConnector(
    "PUT",
    `${deliveryAgentEndpoints.UPDATE_DELIVERY_AGENT}/${id}/update`,
    data
  );
};



// ✅ Delete Delivery Agent
export const deleteDeliveryAgent = (id) => {
  return apiConnector(
    "DELETE",
    `${deliveryAgentEndpoints.DELETE_DELIVERY_AGENT}/${id}`
  );
};



// ✅ Toggle Delivery Agent Status
export const toggleDeliveryAgentStatus = (id) => {
  return apiConnector(
    "PUT",
    `${deliveryAgentEndpoints.TOGGLE_STATUS}/${id}/toggle-status`
  );
};

// ✅ Delivered orders history for a driver (admin)
export const getDeliveryAgentDeliveryHistory = (id, page = 1, limit = 20) => {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiConnector(
    "GET",
    `${deliveryAgentEndpoints.GET_DELIVERY_AGENT_BY_ID}/${id}/delivery-history?${queryParams.toString()}`
  );
};
