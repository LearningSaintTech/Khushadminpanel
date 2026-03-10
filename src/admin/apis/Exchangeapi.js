// src/apis/exchangeApi.js

import { apiConnector } from "../services/Apiconnector";

export const exchangeEndpoints = {
  CREATE_EXCHANGE: "/exchange/create",
  UPDATE_EXCHANGE: "/exchange/update",
  GET_ALL_EXCHANGE: "/exchange/getAll",
  GET_SINGLE_EXCHANGE: "/exchange/getSingle",
  DELETE_EXCHANGE: "/exchange/delete",
  DELETE_REASON: "/exchange/deleteReason",
  TOGGLE_ACTIVE: "/exchange/toggleActive",
};

export const createExchange = (data) =>
  apiConnector("POST", exchangeEndpoints.CREATE_EXCHANGE, data);

export const updateExchange = (id, data) =>
  apiConnector("PATCH", `${exchangeEndpoints.UPDATE_EXCHANGE}/${id}`, data);

export const getAllExchange = (page = 1, limit = 10) =>
  apiConnector(
    "GET",
    `${exchangeEndpoints.GET_ALL_EXCHANGE}?page=${page}&limit=${limit}`
  );

export const getSingleExchange = (id) =>
  apiConnector(
    "GET",
    `${exchangeEndpoints.GET_SINGLE_EXCHANGE}/${id}`
  );

export const deleteExchange = (id) =>
  apiConnector(
    "DELETE",
    `${exchangeEndpoints.DELETE_EXCHANGE}/${id}`
  );

export const deleteExchangeReason = (id) =>
  apiConnector(
    "DELETE",
    `${exchangeEndpoints.DELETE_REASON}/${id}`
  );

export const toggleExchangeActive = (id) =>
  apiConnector(
    "PATCH",
    `${exchangeEndpoints.TOGGLE_ACTIVE}/${id}`
  );