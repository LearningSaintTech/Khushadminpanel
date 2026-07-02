import { apiConnector } from "../services/Apiconnector";
//fgh
const ANALYTICS_API = {
  EVENTS: "/analytics/events",
};

export const getEventAnalytics = (params = {}) => {
  return apiConnector("GET", ANALYTICS_API.EVENTS, null, {}, params);
};

export const getAnalyticsSummary = (params = {}) => {
  return apiConnector("GET", `${ANALYTICS_API.EVENTS}/summary`, null, {}, params);
};

export const deleteEventById = (id) => {
  return apiConnector("DELETE", `${ANALYTICS_API.EVENTS}/${id}`);
};

export const deleteEventsByFilters = (params = {}) => {
  return apiConnector("DELETE", ANALYTICS_API.EVENTS, null, {}, params);
};
