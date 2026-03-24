// src/pages/admin/Orders.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  getOrders,
  getOrderItems,
  getSingleOrder,
  updateOrderItemStatus,
  updateWholeOrderStatus,
  getAssignmentView,
  assignItems,
  assignWholeOrder,
  unassignOrder,
  listDeliveryAgents,
  approveExchange,
} from "../../apis/Orderapi";
import toast from "react-hot-toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  RefreshCw,
  Eye,
  AlertCircle,
  User,
  CreditCard,
  MapPin,
  DollarSign,
  ShoppingBag,
  UserCircle,
  UserMinus,
  UserPlus,
  ExternalLink,
} from "lucide-react";

const VIEW_ORDER = "order";
const VIEW_ITEM = "item";

/** Matches delivery rules + backend `items[].delivery.type` filter (NORMAL, ONE_DAY, 90_MIN) */
const DELIVERY_TYPE_TABS = [
  { value: "", label: "All" },
  { value: "NORMAL", label: "Normal" },
  { value: "ONE_DAY", label: "One day" },
  { value: "90_MIN", label: "90 min" },
];

/** apiConnector rejects with a string message; success body is { success, message, data } */
const apiErrMessage = (err, fallback) =>
  typeof err === "string" ? err : err?.response?.data?.message || err?.message || fallback;

const getBackendErrorMessages = (err, fallback) => {
  const data = err?.response?.data ?? {};
  const messages = [];
  const push = (value) => {
    if (!value) return;
    const str = String(value).trim();
    if (!str) return;
    if (!messages.includes(str)) messages.push(str);
  };

  if (typeof err === "string") push(err);
  push(data?.message);
  push(data?.error);
  push(err?.message);

  const errors = data?.errors;
  if (Array.isArray(errors)) {
    errors.forEach((entry) => {
      if (typeof entry === "string") {
        push(entry);
        return;
      }
      push(entry?.msg || entry?.message || entry?.error);
      if (entry?.path && (entry?.msg || entry?.message)) {
        push(`${entry.path}: ${entry.msg || entry.message}`);
      }
    });
  } else if (errors && typeof errors === "object") {
    Object.entries(errors).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => push(`${key}: ${v}`));
      } else if (value && typeof value === "object") {
        push(value?.message || value?.msg || `${key}: ${JSON.stringify(value)}`);
      } else {
        push(`${key}: ${value}`);
      }
    });
  }

  if (messages.length === 0 && fallback) push(fallback);
  return messages;
};

const showBackendErrorsAsToasts = (err, fallback) => {
  const msgs = getBackendErrorMessages(err, fallback);
  msgs.slice(0, 6).forEach((m) => toast.error(m, { duration: 5500 }));
  return msgs[0] || fallback;
};

const getItemExchangeIds = (item) =>
  Array.isArray(item?.exchanges)
    ? item.exchanges.map((ex) => ex?._id).filter(Boolean).map(String)
    : [];

const getLatestExchangeId = (item) => {
  const exchanges = Array.isArray(item?.exchanges) ? [...item.exchanges] : [];
  if (exchanges.length === 0) return null;
  exchanges.sort((a, b) => {
    const aTs = new Date(a?.createdAt || 0).getTime();
    const bTs = new Date(b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return exchanges[0]?._id ? String(exchanges[0]._id) : null;
};

/** Logs in dev, or when `VITE_DEBUG_ORDERS=true` in `.env` (then rebuild). */
const ORDERS_DEBUG =
  import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_ORDERS ?? "") === "true";

const dbgOrders = (label, ...rest) => {
  if (!ORDERS_DEBUG) return;
  if (rest.length === 0) console.log(`[Orders] ${label}`);
  else console.log(`[Orders] ${label}`, ...rest);
};

const dbgOrdersVerbose = (label, ...rest) => {
  if (!ORDERS_DEBUG) return;
  console.debug(`[Orders] ${label}`, ...rest);
};

const isNormalDeliveryLine = (item) =>
  String(item?.delivery?.type || "").toUpperCase() === "NORMAL";

/** Shiprocket / tracking for a line item (NORMAL courier shipments). */
const getNormalDeliveryShiprocket = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const sr = item.shiprocket || {};
  const awb = sr.awbCode || item.trackingId || null;
  const hasAny =
    awb ||
    sr.orderId != null ||
    sr.shipmentId != null ||
    (sr.status && String(sr.status).trim()) ||
    (item.courier && String(item.courier).trim());
  if (!hasAny) return null;
  return {
    awb,
    trackingUrl:
      sr.trackingUrl ||
      (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(String(awb))}` : null),
    status: sr.status || null,
    shiprocketOrderId: sr.orderId ?? null,
    shipmentId: sr.shipmentId ?? null,
    courier: item.courier || null,
    labelUrl: sr.labelUrl || null,
    invoiceUrl: sr.invoiceUrl || null,
  };
};

const getOrderNormalShiprocketPreview = (order) => {
  const items = order?.items || [];
  const rows = items.map((it) => getNormalDeliveryShiprocket(it)).filter(Boolean);
  if (rows.length === 0) return null;
  return { primary: rows[0], count: rows.length };
};

/** Merge admin item-row shape (deliveryType + nested item) into a line for shiprocket helpers */
const shiprocketFromItemRow = (row) => {
  if (!row) return null;
  const line = {
    ...(row.item && typeof row.item === "object" ? row.item : {}),
    delivery: { type: row.deliveryType || row.item?.delivery?.type },
  };
  return getNormalDeliveryShiprocket(line);
};

function ShiprocketDetails({ sr, compact }) {
  if (!sr) return <span className="text-gray-400">—</span>;
  if (compact) {
    return (
      <div className="max-w-56 space-y-0.5">
        {sr.trackingUrl ? (
          <a
            href={sr.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-indigo-600 hover:underline wrap-break-word"
          >
            <ExternalLink size={12} className="shrink-0" />
            {sr.awb || "Track"}
          </a>
        ) : (
          <span className="font-mono text-xs text-gray-800">{sr.awb || "—"}</span>
        )}
        {sr.status && (
          <p className="truncate text-[11px] text-gray-500" title={sr.status}>
            {sr.status}
          </p>
        )}
        {sr.courier && (
          <p className="truncate text-[11px] text-gray-400" title={sr.courier}>
            {sr.courier}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm text-gray-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-semibold uppercase text-sky-700">Shiprocket</span>
        {sr.status && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">{sr.status}</span>
        )}
      </div>
      {sr.awb && (
        <p className="font-mono text-xs">
          AWB:{" "}
          {sr.trackingUrl ? (
            <a
              href={sr.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
            >
              {sr.awb}
              <ExternalLink size={12} />
            </a>
          ) : (
            sr.awb
          )}
        </p>
      )}
      {sr.courier && <p className="text-xs text-gray-600">Courier: {sr.courier}</p>}
      {(sr.shiprocketOrderId != null || sr.shipmentId != null) && (
        <p className="text-xs text-gray-500">
          {sr.shiprocketOrderId != null && <>SR order: {sr.shiprocketOrderId}</>}
          {sr.shiprocketOrderId != null && sr.shipmentId != null && " · "}
          {sr.shipmentId != null && <>Shipment: {sr.shipmentId}</>}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {sr.labelUrl && (
          <a
            href={sr.labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Label
          </a>
        )}
        {sr.invoiceUrl && (
          <a
            href={sr.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Invoice
          </a>
        )}
      </div>
    </div>
  );
}

const Orders = () => {
  const [viewMode, setViewMode] = useState(VIEW_ORDER); // "order" | "item"
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  /** Filters both By order and By item lists (sent as ?deliveryType= to API) */
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Item-based view state
  const [orderItems, setOrderItems] = useState([]);
  const [itemPagination, setItemPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState("");
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [updatingWholeOrder, setUpdatingWholeOrder] = useState(false);
  const [wholeOrderNewStatus, setWholeOrderNewStatus] = useState("");
  const [itemPage, setItemPage] = useState(1);
  // Load all items when viewing order details (no per-order item pagination)
  const itemLimit = 100;
  // Multi-select items for bulk status update
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [updatingBulk, setUpdatingBulk] = useState(false);
  // Delivery assignment modal
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentOrderId, setAssignmentOrderId] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState("whole");
  const [assignmentItemIds, setAssignmentItemIds] = useState([]);
  const [assignmentItemId, setAssignmentItemId] = useState(null);
  const [pendingNewStatus, setPendingNewStatus] = useState(null);
  const [deliveryAgentsList, setDeliveryAgentsList] = useState([]);
  const [selectedDeliveryAgentId, setSelectedDeliveryAgentId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState(null);
  // Exchange rejection: require note before updating to EXCHANGE_REJECTED
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [pendingRejection, setPendingRejection] = useState(null); // { orderId, itemId }
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);
  const [rejectionError, setRejectionError] = useState(null);
  // When true, assignment modal only assigns driver (no status update) - used after exchange status change
  const [assignmentAssignOnly, setAssignmentAssignOnly] = useState(false);
  // When set, we opened from "By item" view: show only this item's details (item-based flow), not full order
  const [selectedItemIdFromListView, setSelectedItemIdFromListView] =
    useState(null);
  // Assignment view for current order (for Reassign / Remove driver)
  const [orderAssignments, setOrderAssignments] = useState(null);
  const [unassignLoading, setUnassignLoading] = useState(false);
  const [unassignError, setUnassignError] = useState(null);
  // When Reassign is used: unassign this assignment first, then assign new driver
  const [reassignAssignmentId, setReassignAssignmentId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOrders(
        pagination.page,
        pagination.limit,
        search,
        statusFilter,
        dateFrom || undefined,
        dateTo || undefined,
        sortBy,
        sortOrder,
        deliveryTypeFilter || undefined
      );
      // Backend: successResponse → { success, message, data: { orders, pagination } }
      dbgOrders("getOrders:response", res);
      const payload = res?.data ?? {};
      const list = payload.orders ?? payload.data ?? [];
      dbgOrdersVerbose("getOrders:payload", payload);
      dbgOrders("getOrders:summary", {
        rowCount: Array.isArray(list) ? list.length : 0,
        pagination: payload.pagination,
      });
      setOrders(Array.isArray(list) ? list : []);
      setPagination((prev) => {
        const total = payload.pagination?.total ?? payload.total ?? 0;
        const limit = prev.limit || 10;
        const totalPages =
          payload.pagination?.totalPages ??
          (total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
        return {
          ...prev,
          total,
          totalPages: Math.max(1, totalPages),
        };
      });
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(apiErrMessage(err, "Failed to load orders. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, dateFrom, dateTo, sortBy, sortOrder, deliveryTypeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchOrderItems = useCallback(async () => {
    try {
      setItemLoading(true);
      setItemError(null);
      const res = await getOrderItems(
        itemPagination.page,
        itemPagination.limit,
        itemSearch,
        "",
        itemStatusFilter,
        "",
        "",
        deliveryTypeFilter || undefined
      );
      dbgOrders("getOrderItems:response", res);
      const payload = res?.data ?? {};
      dbgOrdersVerbose("getOrderItems:payload", payload);
      dbgOrders("getOrderItems:summary", {
        rowCount: Array.isArray(payload.items) ? payload.items.length : 0,
        pagination: payload.pagination,
      });
      setOrderItems(Array.isArray(payload.items) ? payload.items : []);
      setItemPagination((prev) => ({
        ...prev,
        total: payload.pagination?.total ?? 0,
        totalPages: Math.max(1, payload.pagination?.totalPages ?? 1),
      }));
    } catch (err) {
      console.error("Failed to fetch order items:", err);
      setItemError(apiErrMessage(err, "Failed to load order items."));
    } finally {
      setItemLoading(false);
    }
  }, [itemPagination.page, itemPagination.limit, itemSearch, itemStatusFilter, deliveryTypeFilter]);

  useEffect(() => {
    if (viewMode === VIEW_ITEM) fetchOrderItems();
  }, [viewMode, fetchOrderItems]);

  const fetchSingleOrder = async (orderId) => {
    if (!orderId) return;
    try {
      setOrderLoading(true);
      setOrderError(null);
      setUnassignError(null);
      setOrderAssignments(null);
      // Fetch with page 1 and high limit so all items in the order are returned
      const res = await getSingleOrder(orderId, 1, itemLimit);
      dbgOrders("getSingleOrder:response", { orderId, res });
      const singlePayload = res?.data ?? res;
      dbgOrdersVerbose("getSingleOrder:order", singlePayload);
      setSelectedOrder(singlePayload || null);
      // Fetch assignment view for Reassign / Remove driver
      try {
        const assignRes = await getAssignmentView(orderId);
        dbgOrders("getAssignmentView:response", { orderId, assignRes });
        const assignData = assignRes?.data ?? assignRes;
        dbgOrdersVerbose("getAssignmentView:data", assignData);
        setOrderAssignments(assignData || null);
      } catch (e) {
        if (ORDERS_DEBUG) console.warn("[Orders] getAssignmentView failed:", e);
        setOrderAssignments(null);
      }
    } catch (err) {
      console.error("Failed to load order:", err);
      setOrderError(apiErrMessage(err, "Could not load order details."));
    } finally {
      setOrderLoading(false);
    }
  };

  // Statuses that require a driver to be assigned before changing to this status
  const STATUS_REQUIRES_ASSIGNMENT = ["SHIPPED", "OUT_FOR_DELIVERY"];
  // After updating to these statuses, we open assignment modal so admin can assign a driver
  const EXCHANGE_STATUSES_REQUIRE_DRIVER = [
    "EXCHANGE_PICKUP_SCHEDULED",
    "EXCHANGE_SHIPPED",
  ];
  const WHOLE_ORDER_SENTINEL = "WHOLE_ORDER";

  const isItemAssigned = (assignments, itemId) => {
    if (!Array.isArray(assignments) || !itemId) return false;
    const idStr = String(itemId);
    return assignments.some(
      (a) =>
        !["CANCELLED", "REJECTED", "DELIVERED"].includes(a.status) &&
        (a.itemIds || []).some((id) => String(id?._id ?? id) === idStr),
    );
  };

  const handleRemoveDriver = async (orderId, assignmentId) => {
    if (
      !orderId ||
      !assignmentId ||
      !window.confirm(
        "Remove this driver from the assignment? The items will be unassigned and you can assign another driver later.",
      )
    )
      return;
    setUnassignLoading(true);
    setUnassignError(null);
    try {
      await unassignOrder(orderId, { assignmentId });
      toast.success(`Driver removed from assignment ${assignmentId}`);
      await fetchSingleOrder(orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to remove driver.";
      setUnassignError(msg);
      showBackendErrorsAsToasts(
        err,
        `Failed to remove driver for assignment ${assignmentId}.`,
      );
    } finally {
      setUnassignLoading(false);
    }
  };

  const handleReassignDriver = (orderId, assignment) => {
    if (!orderId || !assignment) return;
    const itemIdsOrWhole =
      assignment.assignmentType === "ORDER"
        ? WHOLE_ORDER_SENTINEL
        : (assignment.itemIds || []).map((id) => (id?._id ?? id).toString());
    if (assignment.assignmentType !== "ORDER" && itemIdsOrWhole.length === 0)
      return;
    openAssignmentModal(orderId, itemIdsOrWhole, null, true, assignment._id);
  };

  const openAssignmentModal = (
    orderId,
    itemIdsOrWhole,
    newStatus,
    assignOnly = false,
    replaceAssignmentId = null,
  ) => {
    setAssignmentOrderId(orderId);
    setPendingNewStatus(newStatus);
    setAssignmentAssignOnly(assignOnly);
    setReassignAssignmentId(replaceAssignmentId || null);
    setSelectedDeliveryAgentId("");
    setAssignError(null);
    if (itemIdsOrWhole === WHOLE_ORDER_SENTINEL) {
      setAssignmentMode("whole");
      setAssignmentItemIds([]);
      setAssignmentItemId(WHOLE_ORDER_SENTINEL);
    } else if (Array.isArray(itemIdsOrWhole)) {
      setAssignmentMode("items");
      setAssignmentItemIds(itemIdsOrWhole.map(String));
      setAssignmentItemId(null);
    } else {
      setAssignmentMode("items");
      setAssignmentItemIds([String(itemIdsOrWhole)]);
      setAssignmentItemId(itemIdsOrWhole);
    }
    setAssignmentModalOpen(true);
    listDeliveryAgents(1, 100)
      .then((res) => {
        dbgOrders("listDeliveryAgents:response", res);
        const data = res?.data ?? res;
        const list = data?.deliveryAgents ?? data?.data ?? [];
        dbgOrders("listDeliveryAgents:summary", { count: Array.isArray(list) ? list.length : 0 });
        setDeliveryAgentsList(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (ORDERS_DEBUG) console.warn("[Orders] listDeliveryAgents failed:", e);
        setDeliveryAgentsList([]);
      });
  };

  const handleAssignmentSubmit = async () => {
    if (!assignmentOrderId || !selectedDeliveryAgentId) {
      setAssignError("Please select a delivery agent.");
      return;
    }
    if (!assignmentAssignOnly && !pendingNewStatus) {
      setAssignError("Status is required.");
      return;
    }
    if (assignmentMode === "items" && assignmentItemIds.length === 0) {
      setAssignError("No items to assign.");
      return;
    }
    setAssignLoading(true);
    setAssignError(null);
    try {
      if (reassignAssignmentId) {
        await unassignOrder(assignmentOrderId, {
          assignmentId: reassignAssignmentId,
        });
      }
      if (assignmentMode === "whole") {
        await assignWholeOrder(assignmentOrderId, selectedDeliveryAgentId);
        if (!assignmentAssignOnly) {
          await updateWholeOrderStatus(assignmentOrderId, {
            status: pendingNewStatus,
          });
        }
      } else {
        await assignItems(
          assignmentOrderId,
          selectedDeliveryAgentId,
          assignmentItemIds,
        );
        if (!assignmentAssignOnly) {
          for (const itemId of assignmentItemIds) {
            await updateOrderItemStatus(assignmentOrderId, itemId, {
              status: pendingNewStatus,
            });
          }
        }
      }
      toast.success(
        assignmentAssignOnly
          ? "Driver assigned successfully."
          : `Driver assigned and status updated to ${pendingNewStatus}.`,
      );
      setAssignmentModalOpen(false);
      setAssignmentAssignOnly(false);
      setReassignAssignmentId(null);
      setWholeOrderNewStatus("");
      setSelectedItemIds([]);
      setBulkStatus("");
      fetchSingleOrder(assignmentOrderId);
    } catch (err) {
      const msg = showBackendErrorsAsToasts(
        err,
        "Assign failed.",
      );
      setAssignError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUpdateWholeOrderStatus = async () => {
    if (!selectedOrder?.orderId || !wholeOrderNewStatus) return;
    const label =
      statusOptions.find((o) => o.value === wholeOrderNewStatus)?.label ||
      wholeOrderNewStatus;
    const requiresAssignment =
      STATUS_REQUIRES_ASSIGNMENT.includes(wholeOrderNewStatus);
    if (requiresAssignment) {
      try {
        const res = await getAssignmentView(selectedOrder.orderId);
        const data = res?.data ?? res;
        const orderFromView = data?.order;
        const assignments = data?.assignments ?? [];
        const orderItems = orderFromView?.items ?? selectedOrder?.items ?? [];
        const allAssigned =
          orderItems.length > 0 &&
          orderItems.every((item) =>
            isItemAssigned(assignments, item.itemId ?? item._id),
          );
        if (!allAssigned) {
          openAssignmentModal(
            selectedOrder.orderId,
            WHOLE_ORDER_SENTINEL,
            wholeOrderNewStatus,
          );
          return;
        }
      } catch (err) {
        console.error("Assignment view failed:", err);
        const msg = showBackendErrorsAsToasts(
          err,
          "Could not check assignment.",
        );
        setOrderError(msg);
        return;
      }
    }
    if (
      !window.confirm(
        `Set all items in this order to "${label}"? (Terminal items like CANCELLED will be skipped.)`,
      )
    )
      return;
    setUpdatingWholeOrder(true);
    setOrderError(null);
    try {
      if (wholeOrderNewStatus === "EXCHANGE_APPROVED") {
        const targetItems = selectedOrder?.items ?? [];
        for (const item of targetItems) {
          const exchangeId = getLatestExchangeId(item);
          if (!exchangeId) continue;
          await approveExchange(exchangeId);
        }
      }
      await updateWholeOrderStatus(selectedOrder.orderId, {
        status: wholeOrderNewStatus,
      });
      toast.success(`Order items updated to ${wholeOrderNewStatus}.`);
      setWholeOrderNewStatus("");
      await fetchSingleOrder(selectedOrder.orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update whole order status.";
      setOrderError(msg);
      showBackendErrorsAsToasts(
        err,
        `Failed to set order status to ${wholeOrderNewStatus}.`,
      );
    } finally {
      setUpdatingWholeOrder(false);
    }
  };

  const toggleItemSelection = (itemId) => {
    const idStr = String(itemId);
    setSelectedItemIds((prev) =>
      prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr],
    );
  };

  const selectAllOnPage = () => {
    const pageIds = (selectedOrder?.items ?? []).map((it) =>
      String(it.itemId || it._id),
    );
    setSelectedItemIds((prev) => {
      const combined = [...new Set([...prev, ...pageIds])];
      return combined.length === prev.length &&
        pageIds.every((id) => prev.includes(id))
        ? prev.filter((id) => !pageIds.includes(id))
        : combined;
    });
  };

  const handleUpdateSelectedItemsStatus = async () => {
    if (!selectedOrder?.orderId || selectedItemIds.length === 0 || !bulkStatus)
      return;
    const label =
      statusOptions.find((o) => o.value === bulkStatus)?.label || bulkStatus;

    if (bulkStatus === "EXCHANGE_REJECTED") {
      setPendingRejection({
        orderId: selectedOrder.orderId,
        itemIds: [...selectedItemIds],
      });
      setRejectionNote("");
      setRejectionError(null);
      setRejectionModalOpen(true);
      return;
    }

    const requiresAssignment = STATUS_REQUIRES_ASSIGNMENT.includes(bulkStatus);
    if (requiresAssignment) {
      try {
        const res = await getAssignmentView(selectedOrder.orderId);
        const data = res?.data ?? res;
        const assignments = data?.assignments ?? [];
        const allAssigned = selectedItemIds.every((id) =>
          isItemAssigned(assignments, id),
        );
        if (!allAssigned) {
          openAssignmentModal(
            selectedOrder.orderId,
            selectedItemIds,
            bulkStatus,
          );
          return;
        }
      } catch (err) {
        console.error("Assignment view failed:", err);
        const msg = showBackendErrorsAsToasts(
          err,
          "Could not check assignment.",
        );
        setOrderError(msg);
        return;
      }
    }
    if (
      !window.confirm(
        `Set ${selectedItemIds.length} selected item(s) to "${label}"?`,
      )
    )
      return;
    setUpdatingBulk(true);
    setOrderError(null);
    try {
      for (const itemId of selectedItemIds) {
        const currentItem = selectedOrder?.items?.find(
          (it) => String(it.itemId || it._id) === String(itemId),
        );
        if (bulkStatus === "EXCHANGE_APPROVED") {
          const exchangeId = getLatestExchangeId(currentItem);
          if (!exchangeId) {
            throw new Error(
              `No exchange found for item ${String(itemId)} to approve.`,
            );
          }
          await approveExchange(exchangeId);
        }
        await updateOrderItemStatus(selectedOrder.orderId, itemId, {
          status: bulkStatus,
        });
      }
      toast.success(
        `${selectedItemIds.length} item(s) updated to ${bulkStatus}.`,
      );
      if (EXCHANGE_STATUSES_REQUIRE_DRIVER.includes(bulkStatus)) {
        if (
          window.confirm(
            `Assign a driver for these ${selectedItemIds.length} item(s)?`,
          )
        ) {
          openAssignmentModal(
            selectedOrder.orderId,
            [...selectedItemIds],
            bulkStatus,
            true,
          );
        }
      }
      setSelectedItemIds([]);
      setBulkStatus("");
      await fetchSingleOrder(selectedOrder.orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update selected items.";
      setOrderError(msg);
      showBackendErrorsAsToasts(
        err,
        `Failed to set selected items to ${bulkStatus}.`,
      );
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleUpdateItemStatus = async (orderId, itemId, newStatus) => {
    if (!orderId || !itemId || !newStatus) return;
    const stringItemId = String(itemId);

    // Exchange rejected: open modal to collect rejection note (required by backend)
    if (newStatus === "EXCHANGE_REJECTED") {
      setPendingRejection({ orderId, itemId: stringItemId });
      setRejectionNote("");
      setRejectionError(null);
      setRejectionModalOpen(true);
      return;
    }

    const requiresAssignment = STATUS_REQUIRES_ASSIGNMENT.includes(newStatus);
    if (requiresAssignment) {
      try {
        const res = await getAssignmentView(orderId);
        const data = res?.data ?? res;
        const assignments = data?.assignments ?? [];
        if (!isItemAssigned(assignments, itemId)) {
          const label =
            statusOptions.find((o) => o.value === newStatus)?.label ||
            newStatus;
          if (
            window.confirm(
              `This item is not assigned to a driver. Assign a driver first, then mark as "${label}". Open assignment?`,
            )
          ) {
            openAssignmentModal(orderId, itemId, newStatus);
          }
          return;
        }
      } catch (err) {
        console.error("Assignment view failed:", err);
        showBackendErrorsAsToasts(
          err,
          "Could not check assignment.",
        );
        return;
      }
    } else {
      const label =
        statusOptions.find((o) => o.value === newStatus)?.label || newStatus;
      if (!window.confirm(`Update to "${label}"?`)) return;
    }
    setUpdatingItemId(stringItemId);
    const prevItem = selectedOrder?.items?.find(
      (it) => String(it.itemId || it._id) === stringItemId,
    );
    const prevStatus = prevItem?.status;
    setSelectedOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          String(it.itemId || it._id) === stringItemId
            ? { ...it, status: newStatus }
            : it,
        ),
      };
    });
    try {
      const payload = { status: newStatus };
      if (newStatus === "EXCHANGE_APPROVED") {
        const exchangeId = getLatestExchangeId(prevItem);
        if (!exchangeId) {
          throw new Error("No exchange request found for this item.");
        }
        await approveExchange(exchangeId);
      }
      await updateOrderItemStatus(orderId, itemId, payload);
      toast.success(`Item ${stringItemId} updated to ${newStatus}.`);
      // After setting exchange pickup/delivery status, open assignment modal to assign driver
      if (EXCHANGE_STATUSES_REQUIRE_DRIVER.includes(newStatus)) {
        const label =
          statusOptions.find((o) => o.value === newStatus)?.label || newStatus;
        if (window.confirm(`Assign a driver for this item (${label})?`)) {
          openAssignmentModal(orderId, itemId, newStatus, true);
        }
      }
    } catch (err) {
      console.error("Status update failed:", err);
      showBackendErrorsAsToasts(
        err,
        `Failed to update item ${stringItemId} to ${newStatus}.`,
      );
      if (prevStatus) {
        setSelectedOrder((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((it) =>
              String(it.itemId || it._id) === stringItemId
                ? { ...it, status: prevStatus }
                : it,
            ),
          };
        });
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!pendingRejection?.orderId) return;
    const note = (rejectionNote || "").trim();
    if (!note) {
      setRejectionError("Rejection note is required.");
      return;
    }
    setRejectionSubmitting(true);
    setRejectionError(null);
    try {
      const orderId = pendingRejection.orderId;
      if (pendingRejection.itemIds && pendingRejection.itemIds.length > 0) {
        for (const itemId of pendingRejection.itemIds) {
          await updateOrderItemStatus(orderId, itemId, {
            status: "EXCHANGE_REJECTED",
            notes: note,
          });
        }
      } else if (pendingRejection.itemId) {
        await updateOrderItemStatus(orderId, pendingRejection.itemId, {
          status: "EXCHANGE_REJECTED",
          notes: note,
        });
      }
      setRejectionModalOpen(false);
      setPendingRejection(null);
      setRejectionNote("");
      setSelectedItemIds([]);
      setBulkStatus("");
      fetchSingleOrder(orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reject exchange.";
      setRejectionError(msg);
      showBackendErrorsAsToasts(
        err,
        "Failed to reject exchange.",
      );
    } finally {
      setRejectionSubmitting(false);
    }
  };

  const getDriverPartnerDisplay = (item) => {
    const agent = item?.deliveryAgentId;
    if (!agent) return null;
    const name = typeof agent === "object" ? agent.name : null;
    const phone = typeof agent === "object" ? agent.phoneNumber : null;
    if (!name && !phone) return null;
    return { name: name || "—", phone: phone || "" };
  };

  const getStatusBadge = (status = "pending") => {
    let s = (status || "pending").toUpperCase().replace(/_/g, " ").trim();
    const statusStyles = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
      CREATED: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
      PROCESSING: { bg: "bg-blue-100", text: "text-blue-800", Icon: RefreshCw },
      CONFIRMED: {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        Icon: RefreshCw,
      },
      SHIPPED: { bg: "bg-purple-100", text: "text-purple-800", Icon: Truck },
      DELIVERED: {
        bg: "bg-green-100",
        text: "text-green-800",
        Icon: CheckCircle,
      },
      CANCELLED: { bg: "bg-red-100", text: "text-red-800", Icon: XCircle },
      "OUT FOR DELIVERY": {
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        Icon: Truck,
      },
      "EXCHANGE REQUESTED": {
        bg: "bg-orange-100",
        text: "text-orange-800",
        Icon: RefreshCw,
      },
      "EXCHANGE APPROVED": {
        bg: "bg-teal-100",
        text: "text-teal-800",
        Icon: CheckCircle,
      },
      "EXCHANGE REJECTED": {
        bg: "bg-pink-100",
        text: "text-pink-800",
        Icon: XCircle,
      },
      "EXCHANGE PICKUP SCHEDULED": {
        bg: "bg-amber-100",
        text: "text-amber-800",
        Icon: Truck,
      },
      "EXCHANGE OUT FOR PICKUP": {
        bg: "bg-amber-100",
        text: "text-amber-800",
        Icon: Truck,
      },
      "EXCHANGE PICKED": {
        bg: "bg-amber-100",
        text: "text-amber-800",
        Icon: Truck,
      },
      "EXCHANGE RECEIVED": {
        bg: "bg-teal-100",
        text: "text-teal-800",
        Icon: Package,
      },
      "EXCHANGE PROCESSING": {
        bg: "bg-blue-100",
        text: "text-blue-800",
        Icon: RefreshCw,
      },
      "EXCHANGE SHIPPED": {
        bg: "bg-purple-100",
        text: "text-purple-800",
        Icon: Truck,
      },
      "EXCHANGE OUT FOR DELIVERY": {
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        Icon: Truck,
      },
      "EXCHANGE DELIVERED": {
        bg: "bg-green-100",
        text: "text-green-800",
        Icon: CheckCircle,
      },
      "EXCHANGE COMPLETED": {
        bg: "bg-green-100",
        text: "text-green-800",
        Icon: CheckCircle,
      },
    };
    const {
      bg = "bg-gray-100",
      text = "text-gray-800",
      Icon = Clock,
    } = statusStyles[s] || statusStyles.PENDING;
    let displayText = s.charAt(0) + s.slice(1).toLowerCase();
    if (displayText.length > 24) {
      displayText = displayText
        .replace("Exchange ", "Ex. ")
        .replace("Pickup Scheduled", "Pickup Sch.")
        .replace("Out For Delivery", "Out for Del.");
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${bg} ${text} max-w-full truncate`}
      >
        <Icon size={14} />
        {displayText}
      </span>
    );
  };

  const statusOptions = [
    { value: "CREATED", label: "Created" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "PROCESSING", label: "Processing" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "EXCHANGE_REQUESTED", label: "Exchange requested" },
    { value: "EXCHANGE_APPROVED", label: "Exchange approved" },
    { value: "EXCHANGE_REJECTED", label: "Exchange rejected" },
    { value: "EXCHANGE_PICKUP_SCHEDULED", label: "Exchange pickup scheduled" },
    { value: "EXCHANGE_OUT_FOR_PICKUP", label: "Exchange out for pickup" },
    { value: "EXCHANGE_PICKED", label: "Exchange picked" },
    { value: "EXCHANGE_RECEIVED", label: "Exchange received" },
    { value: "EXCHANGE_PROCESSING", label: "Exchange processing" },
    { value: "EXCHANGE_SHIPPED", label: "Exchange shipped" },
    { value: "EXCHANGE_OUT_FOR_DELIVERY", label: "Exchange out for delivery" },
    { value: "EXCHANGE_DELIVERED", label: "Exchange delivered" },
    { value: "EXCHANGE_COMPLETED", label: "Exchange completed" },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 ">
      <div className="mx-auto max-w-7xl">
        {/* Header + Search */}
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-600" />
            Order Management
          </h1>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={
                viewMode === VIEW_ORDER
                  ? "Search by ID, name, phone..."
                  : "Search by order ID, SKU, customer..."
              }
              value={viewMode === VIEW_ORDER ? search : itemSearch}
              onChange={(e) => {
                if (viewMode === VIEW_ORDER) {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                } else {
                  setItemSearch(e.target.value);
                  setItemPagination((p) => ({ ...p, page: 1 }));
                }
              }}
              className="w-full rounded-lg border border-gray-300 pl-10 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* View mode tabs: By order | By item */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode(VIEW_ORDER)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              viewMode === VIEW_ORDER
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            By order
          </button>
          <button
            type="button"
            onClick={() => setViewMode(VIEW_ITEM)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              viewMode === VIEW_ITEM
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            By item
          </button>
        </div>

        {/* Delivery type — filters both list APIs on the backend */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery type</p>
          <div className="flex flex-wrap gap-2">
            {DELIVERY_TYPE_TABS.map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => {
                  setDeliveryTypeFilter(tab.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                  setItemPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  deliveryTypeFilter === tab.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && viewMode === VIEW_ORDER && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        {itemError && viewMode === VIEW_ITEM && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 flex items-center gap-2">
            <AlertCircle size={20} />
            {itemError}
          </div>
        )}

        {!selectedOrder ? (
          viewMode === VIEW_ORDER ? (
            <>
              {/* Filters: date range, status, sort (By order view) */}
              <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <span className="text-sm font-semibold text-gray-700">
                  Filters
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                      From date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                      To date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[160px]"
                    >
                      <option value="">All statuses</option>
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                      Sort
                    </label>
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        const [by, order] = v.split("-");
                        setSortBy(by || "createdAt");
                        setSortOrder(order || "desc");
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[140px]"
                    >
                      <option value="createdAt-desc">Latest first</option>
                      <option value="createdAt-asc">Oldest first</option>
                    </select>
                  </div>
                </div>
                {(dateFrom ||
                  dateTo ||
                  statusFilter ||
                  sortOrder !== "desc") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setStatusFilter("");
                      setSortBy("createdAt");
                      setSortOrder("desc");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Clear filters
                  </button>
                )}
              </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full table-auto divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Order</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Phone</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Items</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                    <th className="px-4 py-4 min-w-[160px] text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-4 py-4 min-w-[140px] text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Shiprocket
                      <span className="block font-normal normal-case text-gray-400">(normal)</span>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-gray-500">
                        Loading orders…
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="wrap-break-word px-4 py-4 font-medium text-indigo-600">
                          #{order.orderId || order._id?.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.user?.name || order.address?.name || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {order.user?.countryCode || ""}
                          {order.user?.phoneNumber || order.address?.phone || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {order.totalItems || order.totalQuantity || order.items?.length || "?"}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          ₹{(order.totalAmount || order.pricing?.finalPayable || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-4 min-w-[160px]">
                          {getStatusBadge(order.status || order.orderStatus)}
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          {(() => {
                            const prev = getOrderNormalShiprocketPreview(order);
                            if (!prev) {
                              return <span className="text-gray-400">—</span>;
                            }
                            return (
                              <div>
                                <ShiprocketDetails sr={prev.primary} compact />
                                {prev.count > 1 && (
                                  <p className="mt-1 text-[11px] text-gray-400">{prev.count} lines</p>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                          onClick={() => {
                            const customOrderId = order.orderId;
                            if (!customOrderId) {
                              setError("Order is missing valid orderId");
                              return;
                            }
                            setSelectedItemIdFromListView(null);
                            setItemPage(1);
                            fetchSingleOrder(customOrderId);
                          }}
                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition"
                            title="View order details"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
                <div className="text-sm text-gray-700">
                  Page <span className="font-medium">{pagination.page}</span> of{" "}
                  <span className="font-medium">{pagination.totalPages || 1}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            </>
          ) : (
            <>
              {/* Item-based filters */}
              <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Filter by status
                  </span>
                  <select
                    value={itemStatusFilter}
                    onChange={(e) => {
                      setItemStatusFilter(e.target.value);
                      setItemPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-colors min-w-[200px]"
                  >
                    <option value="">All statuses</option>
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {itemStatusFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemStatusFilter("");
                      setItemPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              {itemLoading ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                  <RefreshCw className="h-10 w-10 animate-spin text-indigo-500 mb-3" />
                  <p className="text-sm font-medium text-gray-600">
                    Loading order items…
                  </p>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-gray-200 bg-white">
                  <Package className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">
                    No order items found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try changing the status filter or search
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((row) => (
                    <div
                      key={`${row.orderId}-${row.itemId}`}
                      className="group rounded-xl border-2 border-gray-200 bg-white shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-5 flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              Order #{row.orderId}
                            </span>
                            {row.deliveryType ? (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {DELIVERY_TYPE_TABS.find((t) => t.value === row.deliveryType)?.label ??
                                  String(row.deliveryType).replace(/_/g, " ")}
                              </span>
                            ) : null}
                            <span className="text-sm font-medium text-gray-700">
                              {row.user?.name || row.address?.name || "—"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {row.user?.countryCode || ""}
                              {row.user?.phoneNumber || "—"}
                            </span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {row.item?.name || row.item?.sku || "—"}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            <span>
                              SKU: {row.item?.sku ?? row.itemId ?? "—"}
                            </span>
                            {row.item?.variant?.color && (
                              <span>{row.item.variant.color}</span>
                            )}
                            {row.item?.variant?.size && (
                              <span>Size: {row.item.variant.size}</span>
                            )}
                            <span>
                              {row.orderCreatedAt
                                ? new Date(
                                    row.orderCreatedAt,
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </div>
                          {String(row.deliveryType || "").toUpperCase() === "NORMAL" && (
                            <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 mt-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900 mb-1.5">
                                Shiprocket
                              </p>
                              {(() => {
                                const sr = shiprocketFromItemRow(row);
                                return sr ? (
                                  <ShiprocketDetails sr={sr} />
                                ) : (
                                  <p className="text-xs text-amber-800">
                                    No AWB / tracking yet (normal delivery — create shipment when ready).
                                  </p>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Qty
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {row.item?.quantity ?? "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(row.itemStatus)}
                            <button
                              onClick={() => {
                                if (!row.orderId) return;
                                setSelectedItemIdFromListView(
                                  String(row.itemId ?? row.productItemId ?? ""),
                                );
                                setItemPage(1);
                                fetchSingleOrder(row.orderId);
                              }}
                              className="rounded-lg p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                              title="View & update item status"
                            >
                              <Eye size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!itemLoading && orderItems.length > 0 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-700">
                    Page{" "}
                    <span className="font-medium">{itemPagination.page}</span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {itemPagination.totalPages || 1}
                    </span>
                    {itemPagination.total != null && (
                      <span className="ml-2 text-gray-500">
                        ({itemPagination.total} item
                        {itemPagination.total !== 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={itemPagination.page <= 1 || itemLoading}
                      onClick={() => {
                        setItemPagination((p) => ({
                          ...p,
                          page: Math.max(1, p.page - 1),
                        }));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button
                      disabled={
                        itemPagination.page >= itemPagination.totalPages ||
                        itemLoading
                      }
                      onClick={() => {
                        setItemPagination((p) => ({ ...p, page: p.page + 1 }));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          (() => {
            const fromItemList = Boolean(selectedItemIdFromListView);
            const focusedItem =
              fromItemList && selectedOrder?.items
                ? selectedOrder.items.find(
                    (it) =>
                      String(it.itemId || it._id) ===
                      selectedItemIdFromListView,
                  )
                : null;

            return (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="border-b bg-gray-50 px-6 py-5">
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderError(null);
                      setOrderAssignments(null);
                      setSelectedItemIds([]);
                      setBulkStatus("");
                      setSelectedItemIdFromListView(null);
                    }}
                    className="mb-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                  >
                    ← Back to{" "}
                    {viewMode === VIEW_ITEM ? "order items" : "orders list"}
                  </button>

                  {fromItemList ? (
                    /* Item-based flow: minimal header, no order status */
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Item details · Order #{selectedOrder?.orderId || "—"}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {selectedOrder?.userId?.name ||
                            selectedOrder?.address?.name ||
                            "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIdFromListView(null)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View full order (all items)
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Order #{selectedOrder?.orderId || "—"}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                          <Clock size={16} />
                          {new Date(selectedOrder?.createdAt).toLocaleString(
                            "en-IN",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {getStatusBadge(selectedOrder?.status)}
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="text-sm text-gray-700 whitespace-nowrap">
                            Update all items:
                          </label>
                          <select
                            value={wholeOrderNewStatus}
                            onChange={(e) =>
                              setWholeOrderNewStatus(e.target.value)
                            }
                            disabled={updatingWholeOrder}
                            className="min-w-[160px] rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-60"
                          >
                            <option value="">Select status…</option>
                            {statusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleUpdateWholeOrderStatus}
                            disabled={
                              updatingWholeOrder || !wholeOrderNewStatus
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                          >
                            {updatingWholeOrder ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Applying…
                              </>
                            ) : (
                              "Apply to all"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {orderError && (
                  <div className="mx-6 mt-5 rounded-lg bg-red-50 p-4 text-red-700 flex items-center gap-3">
                    <AlertCircle size={20} />
                    {orderError}
                  </div>
                )}

            {fromItemList && focusedItem ? (
              /* Item-based flow: only this item's status and details */
              <div className="p-6">
                <div className="max-w-2xl space-y-6">
                  {/* Product card */}
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start gap-6">
                      {focusedItem.variant?.imageUrl && (
                        <img
                          src={focusedItem.variant.imageUrl}
                          alt={focusedItem.sku}
                          className="h-28 w-28 rounded-xl object-cover border-2 border-gray-100 shadow-inner"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Order #{selectedOrder?.orderId}</p>
                        <p className="mt-1 text-xs text-gray-500 break-all">
                          Item ID: {String(focusedItem.itemId || focusedItem._id || "—")}
                        </p>
                        {(() => {
                          const exIds = getItemExchangeIds(focusedItem);
                          if (exIds.length === 0) return null;
                          return (
                            <p className="mt-0.5 text-xs text-gray-500 break-all">
                              Exchange ID{exIds.length > 1 ? "s" : ""}: {exIds.join(", ")}
                            </p>
                          );
                        })()}
                        <h3 className="text-xl font-bold text-gray-900 mt-1">
                          {focusedItem.sku || focusedItem.variant?.sku || "—"}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-600">
                          {focusedItem.variant?.color && <span>Color: {focusedItem.variant.color}</span>}
                          {focusedItem.variant?.size && <span>Size: {focusedItem.variant.size}</span>}
                        </div>
                        <div className="mt-3 flex items-baseline gap-4 text-sm">
                          <span className="font-semibold text-gray-800">Qty: {focusedItem.quantity}</span>
                          <span className="text-gray-600">₹{(focusedItem.unitPrice || 0).toLocaleString("en-IN")} each</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Current status</p>
                        {getStatusBadge(focusedItem.status)}
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const driver = getDriverPartnerDisplay(focusedItem);
                    return driver ? (
                      <div className="flex items-center gap-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/80 px-5 py-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                          <UserCircle size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Driver partner</p>
                          <p className="text-base font-semibold text-gray-900 mt-0.5">
                            {driver.name}
                            {driver.phone && <span className="font-normal text-gray-600 ml-1">· {driver.phone}</span>}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {isNormalDeliveryLine(focusedItem) && (
                    <div className="rounded-xl border-2 border-sky-200 bg-sky-50/90 p-5 shadow-sm">
                      <h4 className="text-sm font-semibold text-sky-900 mb-3 flex items-center gap-2">
                        <Truck size={16} className="text-sky-700" />
                        Shiprocket (normal delivery)
                      </h4>
                      {(() => {
                        const sr = getNormalDeliveryShiprocket(focusedItem);
                        return sr ? (
                          <ShiprocketDetails sr={sr} />
                        ) : (
                          <p className="text-sm text-amber-800">
                            No Shiprocket shipment linked yet. After you create the shipment, AWB and tracking will
                            appear here.
                          </p>
                        );
                      })()}
                    </div>
                  )}
                  {/* Change status card */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gray-50/50 p-6">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <RefreshCw size={16} className="text-indigo-600" />
                      Update item status
                    </h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={focusedItem.status || "CREATED"}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          handleUpdateItemStatus(selectedOrder.orderId, focusedItem.itemId, newVal);
                        }}
                        disabled={updatingItemId === String(focusedItem.itemId || focusedItem._id)}
                        className="min-w-[220px] rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {updatingItemId === String(focusedItem.itemId || focusedItem._id) && (
                        <span className="flex items-center gap-2 text-sm text-indigo-600">
                          <RefreshCw size={18} className="animate-spin" />
                          Updating…
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Select a new status to update this line item.</p>
                  </div>
                  {/* Status history */}
                  {focusedItem.statusHistory && focusedItem.statusHistory.length > 0 && (
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
                      <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-gray-500" />
                        Status history
                      </h4>
                      <ul className="space-y-0">
                        {focusedItem.statusHistory.map((h, i) => (
                          <li
                            key={i}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm border-b border-gray-100 last:border-0 last:pb-0 first:pt-0"
                          >
                            <span className="font-semibold text-gray-900 min-w-[140px]">{h.status}</span>
                            {h.previousStatus && <span className="text-blue-700">← {h.previousStatus}</span>}
                            {h.notes && <span className="text-gray-500 italic">"{h.notes}"</span>}
                            {h.createdAt && (
                              <span className="ml-auto text-xs text-gray-500 tabular-nums">
                                {new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : fromItemList && orderLoading ? (
              <div className="p-12 text-center text-gray-500">Loading item details…</div>
            ) : fromItemList && !focusedItem ? (
              <div className="p-6 text-center text-gray-500">Item not found in this order.</div>
            ) : !fromItemList ? (
            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={18} className="text-indigo-600" />
                    <h4 className="text-sm font-semibold text-gray-700">Customer</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedOrder?.userId?.name || "—"}</p>
                    <p><strong>Phone:</strong> {selectedOrder?.userId?.countryCode || ""}{selectedOrder?.userId?.phoneNumber || "—"}</p>
                    <p><strong>Email:</strong> {selectedOrder?.userId?.email || "—"}</p>
                  </div>
                </div>

                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <CreditCard size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Payment
                          </h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Mode:</strong>{" "}
                            <span
                              className={
                                selectedOrder?.payment?.mode === "COD"
                                  ? "text-orange-700 font-medium"
                                  : ""
                              }
                            >
                              {selectedOrder?.payment?.mode || "—"}
                            </span>
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              className={
                                selectedOrder?.payment?.status === "SUCCESS"
                                  ? "text-green-700 font-medium"
                                  : selectedOrder?.payment?.status === "PENDING"
                                    ? "text-amber-700 font-medium"
                                    : "text-red-700 font-medium"
                              }
                            >
                              {selectedOrder?.payment?.status || "—"}
                            </span>
                          </p>
                          <p>
                            <strong>Amount:</strong> ₹
                            {(
                              selectedOrder?.payment?.amount || 0
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Delivery Address
                          </h4>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">
                            {selectedOrder?.address?.name || "—"}
                          </p>
                          <p>{selectedOrder?.address?.fullAddress || "—"}</p>
                          <p>
                            Pincode: {selectedOrder?.address?.pincode || "—"}
                          </p>
                          <p>Phone: {selectedOrder?.address?.phone || "—"}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Pricing
                          </h4>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            Subtotal: ₹
                            {(
                              selectedOrder?.pricing?.subTotal || 0
                            ).toLocaleString("en-IN")}
                          </p>
                          <p>
                            Delivery: ₹
                            {(
                              selectedOrder?.pricing?.delivery?.totalCharge || 0
                            ).toLocaleString("en-IN")}
                          </p>
                          <p>
                            GST: ₹
                            {(
                              selectedOrder?.pricing?.gst?.totalGst || 0
                            ).toLocaleString("en-IN")}
                          </p>
                          <p className="font-bold text-base pt-2 border-t mt-2">
                            Final Payable: ₹
                            {(
                              selectedOrder?.pricing?.finalPayable || 0
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery assignments: Reassign / Remove driver */}
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck size={18} className="text-indigo-600" />
                        <h4 className="text-sm font-semibold text-gray-700">
                          Delivery assignments
                        </h4>
                      </div>
                      {unassignError && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle size={16} />
                          {unassignError}
                        </div>
                      )}
                      {orderAssignments == null ? (
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin" />
                          Loading assignments…
                        </p>
                      ) : !orderAssignments.assignments?.length ? (
                        <p className="text-sm text-gray-500">
                          No delivery assignments yet. Select items in the table
                          below and click "Assign driver to selected", or assign
                          when updating status to Shipped / Out for delivery.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {orderAssignments.assignments
                            .filter(
                              (a) =>
                                ![
                                  "CANCELLED",
                                  "REJECTED",
                                  "DELIVERED",
                                ].includes(a.status),
                            )
                            .map((a) => {
                              const driver = a.deliveryAgentId;
                              const name =
                                typeof driver === "object"
                                  ? driver?.name
                                  : null;
                              const phone =
                                typeof driver === "object"
                                  ? driver?.phoneNumber
                                  : null;
                              const assignmentItemIds = Array.isArray(a.itemIds)
                                ? a.itemIds
                                : [];
                              const idSet = new Set(
                                assignmentItemIds.map((id) =>
                                  (id?._id ?? id).toString(),
                                ),
                              );
                              const assignedItems = (
                                selectedOrder?.items ?? []
                              ).filter((it) =>
                                idSet.has(String(it.itemId ?? it._id)),
                              );
                              const itemSkus = assignedItems.map(
                                (it) =>
                                  it.sku ||
                                  it.variant?.sku ||
                                  it.itemId ||
                                  it._id ||
                                  "—",
                              );
                              return (
                                <div
                                  key={a._id}
                                  className="flex flex-wrap items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <UserCircle
                                      size={20}
                                      className="text-indigo-600 shrink-0 mt-0.5"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {name || "Driver"}
                                        {phone && (
                                          <span className="text-gray-500 font-normal ml-1">
                                            · {phone}
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {a.assignmentType === "ORDER"
                                          ? "Whole order"
                                          : `${assignmentItemIds.length} item(s)`}{" "}
                                        · {a.status}
                                      </p>
                                      {itemSkus.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {itemSkus.map((sku, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                            >
                                              {String(sku)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReassignDriver(
                                          selectedOrder.orderId,
                                          a,
                                        )
                                      }
                                      disabled={unassignLoading}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                                      title="Assign to a different driver"
                                    >
                                      <UserPlus size={14} />
                                      Reassign
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveDriver(
                                          selectedOrder.orderId,
                                          a._id,
                                        )
                                      }
                                      disabled={unassignLoading}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                      title="Remove driver (unassign)"
                                    >
                                      <UserMinus size={14} />
                                      Remove driver
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          {orderAssignments.assignments.filter(
                            (a) =>
                              !["CANCELLED", "REJECTED", "DELIVERED"].includes(
                                a.status,
                              ),
                          ).length === 0 && (
                            <p className="text-sm text-gray-500">
                              No active assignments. Select items below and
                              click "Assign driver to selected", or assign when
                              updating status to Shipped / Out for delivery.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedOrder?.shipments?.length > 0 && (
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Truck size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Shipments / Warehouses
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {selectedOrder.shipments.map((ship, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-white rounded border shadow-sm"
                            >
                              <p className="font-medium mb-1">
                                {ship.shipmentGroupId}
                              </p>
                              <p>
                                Warehouse: {ship.warehouseId?.name || "—"} (
                                {ship.warehouseId?.code || "—"})
                              </p>
                              <p>
                                Status:{" "}
                                <span className="font-medium">
                                  {ship.status}
                                </span>
                              </p>
                              <p>Type: {ship.deliveryType}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <ShoppingBag size={20} />
                          Order Items (
                          {selectedOrder?.totalQuantity ||
                            selectedOrder?.items?.length ||
                            0}
                          )
                        </h3>

                        {selectedOrder?.items?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-gray-600">
                              {selectedItemIds.length > 0
                                ? `${selectedItemIds.length} selected`
                                : "Bulk actions"}
                            </span>
                            <select
                              value={bulkStatus}
                              onChange={(e) => setBulkStatus(e.target.value)}
                              disabled={
                                updatingBulk || selectedItemIds.length === 0
                              }
                              className="min-w-[180px] rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-60"
                            >
                              <option value="">Update selected to…</option>
                              {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleUpdateSelectedItemsStatus}
                              disabled={
                                updatingBulk ||
                                selectedItemIds.length === 0 ||
                                !bulkStatus
                              }
                              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                            >
                              {updatingBulk ? (
                                <>
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                  Updating…
                                </>
                              ) : (
                                "Apply bulk"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openAssignmentModal(
                                  selectedOrder.orderId,
                                  [...selectedItemIds],
                                  null,
                                  true,
                                )
                              }
                              disabled={
                                selectedItemIds.length === 0 || assignLoading
                              }
                              className="rounded-lg border-2 border-indigo-600 px-4 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2"
                              title="Assign a driver to the selected items (e.g. after removing a driver)"
                            >
                              <UserPlus size={14} />
                              Assign driver to selected
                            </button>
                          </div>
                        )}
                      </div>

                {orderLoading ? (
                  <div className="py-12 text-center text-gray-500">Loading items…</div>
                ) : !selectedOrder?.items?.length ? (
                  <div className="py-12 text-center text-gray-500">No items found</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3.5 text-left">
                            <input
                              type="checkbox"
                              checked={
                                selectedOrder.items.length > 0 &&
                                selectedOrder.items.every((it) =>
                                  selectedItemIds.includes(String(it.itemId || it._id))
                                )
                              }
                              onChange={selectAllOnPage}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Product</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Qty</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Price</th>
                          <th className="px-5 py-3.5 min-w-[160px] text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                          <th className="px-5 py-3.5 min-w-[200px] text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Shiprocket
                            <span className="block font-normal normal-case text-gray-400">(normal only)</span>
                          </th>
                          <th className="px-5 py-3.5 min-w-[140px] text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Driver partner</th>
                          <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Change Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedOrder.items.map((item) => {
                          const itemId = String(item.itemId || item._id);
                          const isUpdating = updatingItemId === itemId;
                          const isSelected = selectedItemIds.includes(itemId);
                          const driverDisplay = getDriverPartnerDisplay(item);
                          return (
                            <tr key={itemId} className={`hover:bg-gray-50/60 ${isSelected ? "bg-indigo-50/50" : ""}`}>
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(itemId)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  {item.variant?.imageUrl && (
                                    <img
                                      src={item.variant.imageUrl}
                                      alt={item.sku}
                                      className="h-12 w-12 rounded object-cover"
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {item.sku || item.variant?.sku || "—"}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-gray-500">
                                      Item ID: {String(item.itemId || item._id || "—")}
                                    </div>
                                    {(() => {
                                      const exIds = getItemExchangeIds(item);
                                      if (exIds.length === 0) return null;
                                      return (
                                        <div className="mt-0.5 text-[11px] text-gray-500 break-all">
                                          Exchange ID{exIds.length > 1 ? "s" : ""}: {exIds.join(", ")}
                                        </div>
                                      );
                                    })()}
                                    <div className="mt-0.5 text-xs text-gray-500">
                                      {item.variant?.color && `Color: ${item.variant.color}`}
                                      {item.variant?.size && ` • Size: ${item.variant.size}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-gray-700">{item.quantity}</td>
                              <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                                ₹{(item.unitPrice || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="px-5 py-4 min-w-[160px]">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="px-5 py-4 min-w-[200px] align-top text-sm">
                                {isNormalDeliveryLine(item) ? (
                                  (() => {
                                    const sr = getNormalDeliveryShiprocket(item);
                                    return sr ? (
                                      <ShiprocketDetails sr={sr} />
                                    ) : (
                                      <span className="text-xs text-amber-800">
                                        Normal delivery — no AWB / tracking yet
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 min-w-[140px] text-sm text-gray-700">
                                {driverDisplay ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <UserCircle size={14} className="text-indigo-600 shrink-0" />
                                    {driverDisplay.name}
                                    {driverDisplay.phone && (
                                      <span className="text-gray-500 text-xs">· {driverDisplay.phone}</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-center">
                                <div className="relative inline-block">
                                  <select
                                    value={item.status || "CREATED"}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      handleUpdateItemStatus(selectedOrder.orderId, itemId, newVal);
                                    }}
                                    disabled={isUpdating}
                                    className={`rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                                      isUpdating ? "opacity-60 cursor-wait" : ""
                                    }`}
                                  >
                                    {statusOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  {isUpdating && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded">
                                      <RefreshCw size={16} className="animate-spin text-indigo-600" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </div>
            ) : null}

        {/* Assignment Modal */}
        {assignmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {reassignAssignmentId
                  ? "Reassign driver"
                  : assignmentAssignOnly
                    ? "Assign driver"
                    : "Assign delivery driver"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {reassignAssignmentId
                  ? "The current driver will be removed and the selected driver will be assigned to these items."
                  : assignmentAssignOnly
                    ? assignmentItemIds.length === 1
                      ? `Assign a driver to this item (${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}).`
                      : `Assign a driver to these ${assignmentItemIds.length} items (${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}).`
                    : assignmentMode === "whole"
                      ? `Assign a driver to this order before marking as ${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}.`
                      : assignmentItemIds.length === 1
                        ? `Assign a driver to this item before marking as ${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}.`
                        : `Assign a driver to these ${assignmentItemIds.length} items before marking as ${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}.`}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery agent
                </label>
                <select
                  value={selectedDeliveryAgentId}
                  onChange={(e) => setSelectedDeliveryAgentId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select driver</option>
                  {deliveryAgentsList
                    .filter((a) => a.isActive !== false)
                    .map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.name || "Driver"}{" "}
                        {agent.phoneNumber ? ` – ${agent.phoneNumber}` : ""}
                      </option>
                    ))}
                </select>
              </div>
              {assignError && (
                <p className="text-sm text-red-600 mb-3">{assignError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!assignLoading) {
                      setAssignmentModalOpen(false);
                      setReassignAssignmentId(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignmentSubmit}
                  disabled={assignLoading || !selectedDeliveryAgentId}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {assignLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      {reassignAssignmentId ? "Reassigning…" : "Assigning…"}
                    </>
                  ) : reassignAssignmentId ? (
                    "Reassign driver"
                  ) : assignmentAssignOnly ? (
                    "Assign driver"
                  ) : (
                    "Assign & update status"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exchange rejection note modal */}
        {rejectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Reject exchange request
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {pendingRejection?.itemIds?.length
                  ? `A rejection note is required for ${pendingRejection.itemIds.length} selected item(s). It will be shown to the customer.`
                  : "A rejection note is required. It will be shown to the customer."}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection note *
                </label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. Item does not meet exchange policy criteria."
                  rows={4}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {rejectionError && (
                <p className="text-sm text-red-600 mb-3">{rejectionError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!rejectionSubmitting) {
                      setRejectionModalOpen(false);
                      setPendingRejection(null);
                      setRejectionNote("");
                      setRejectionError(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectionSubmit}
                  disabled={rejectionSubmitting || !rejectionNote.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {rejectionSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    "Reject exchange"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default Orders;
