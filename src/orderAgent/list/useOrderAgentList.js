import { useCallback, useEffect, useRef, useState } from "react";
import { getOrderAgentOrders, getProcessingOrderItems } from "../apis/orderAgentApi";
import { VIEW_ORDER, useViewMode } from "../context/ViewModeContext";
import { apiErrMessage, paymentFilterToQuery, unwrapApiData } from "./listFilterUtils";

export function useOrderAgentList({
  exchangeOnly = false,
  returnOnly = false,
  statusFilter = "",
  providerFilter = "",
  fixedItemStatus = "",
  /** Carrier sidebar counts are per line — use items API when a provider is selected. */
  forceItemView = false,
} = {}) {
  const { viewMode } = useViewMode();
  const isByOrder = viewMode === VIEW_ORDER && !forceItemView;

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [lineConsistency, setLineConsistency] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const effectiveItemStatus = fixedItemStatus || statusFilter || "";
  const fetchGen = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => setCity(cityInput), 400);
    return () => clearTimeout(t);
  }, [cityInput]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    city,
    dateFrom,
    dateTo,
    paymentFilter,
    lineConsistency,
    effectiveItemStatus,
    providerFilter,
    isByOrder,
    exchangeOnly,
    returnOnly,
    forceItemView,
  ]);

  const fetchData = useCallback(async () => {
    const gen = ++fetchGen.current;
    setLoading(true);
    setError(null);
    const { paymentStatus, paymentMode } = paymentFilterToQuery(paymentFilter);

    try {
      if (isByOrder) {
        const res = await getOrderAgentOrders({
          page,
          limit,
          search: search.trim(),
          orderStatus: effectiveItemStatus || undefined,
          itemStatusConsistency: lineConsistency || undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          paymentStatus: paymentStatus || undefined,
          paymentMode: paymentMode || undefined,
          city: city.trim() || undefined,
          exchangeOnly,
          returnOnly,
        });
        if (gen !== fetchGen.current) return;
        const payload = unwrapApiData(res);
        setRows(Array.isArray(payload.orders) ? payload.orders : []);
        setPagination({
          page: payload.pagination?.page ?? page,
          limit: payload.pagination?.limit ?? limit,
          total: payload.pagination?.total ?? 0,
          totalPages: Math.max(1, payload.pagination?.totalPages ?? 1),
        });
      } else {
        const res = await getProcessingOrderItems({
          page,
          limit,
          search: search.trim(),
          itemStatus: effectiveItemStatus || undefined,
          shippingProvider: providerFilter || undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          paymentStatus: paymentStatus || undefined,
          paymentMode: paymentMode || undefined,
          city: city.trim() || undefined,
          exchangeOnly,
          returnOnly,
        });
        if (gen !== fetchGen.current) return;
        const payload = unwrapApiData(res);
        setRows(Array.isArray(payload.items) ? payload.items : []);
        setPagination({
          page: payload.pagination?.page ?? page,
          limit: payload.pagination?.limit ?? limit,
          total: payload.pagination?.total ?? 0,
          totalPages: Math.max(1, payload.pagination?.totalPages ?? 1),
        });
      }
    } catch (err) {
      if (gen !== fetchGen.current) return;
      setError(apiErrMessage(err, "Failed to load orders"));
      setRows([]);
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }, [
    isByOrder,
    page,
    limit,
    search,
    city,
    dateFrom,
    dateTo,
    paymentFilter,
    lineConsistency,
    effectiveItemStatus,
    providerFilter,
    exchangeOnly,
    returnOnly,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearchInput("");
    setCityInput("");
    setSearch("");
    setCity("");
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("");
    setLineConsistency("");
    setPage(1);
  };

  return {
    isByOrder,
    forceItemView,
    rows,
    loading,
    error,
    pagination,
    page,
    setPage,
    search: searchInput,
    setSearch: setSearchInput,
    city: cityInput,
    setCity: setCityInput,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    paymentFilter,
    setPaymentFilter,
    lineConsistency,
    setLineConsistency,
    refresh: fetchData,
    clearFilters,
  };
}
