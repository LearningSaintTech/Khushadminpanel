import {
  getCashTransactions,
  getRewardTransactions,
} from "../../apis/MoneyFeaturesapi";

const EXPORT_PAGE_LIMIT = 50;

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function formatWalletTransactionDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function formatFileDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchAllPages(fetchPage) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetchPage(page);
    const d = res?.data ?? res;
    all.push(...(d?.items ?? []));
    totalPages = d?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export async function fetchAllCashTransactions(filters = {}) {
  return fetchAllPages((page) =>
    getCashTransactions(page, EXPORT_PAGE_LIMIT, filters),
  );
}

export async function fetchAllRewardTransactions(filters = {}) {
  return fetchAllPages((page) =>
    getRewardTransactions(page, EXPORT_PAGE_LIMIT, filters),
  );
}

function buildExportFilename(prefix, items, filterParts = []) {
  const timestamps = items
    .map((row) => row.createdAt)
    .filter(Boolean)
    .map((iso) => new Date(iso).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  const filterSuffix = filterParts.filter(Boolean).join("_");
  const filterBit = filterSuffix ? `_${filterSuffix}` : "";

  if (timestamps.length === 0) {
    return `${prefix}${filterBit}_${formatFileDate(new Date())}.csv`;
  }

  const minDate = formatFileDate(new Date(timestamps[0]));
  const maxDate = formatFileDate(new Date(timestamps[timestamps.length - 1]));
  const range = minDate === maxDate ? minDate : `${minDate}_to_${maxDate}`;

  return `${prefix}${filterBit}_${range}.csv`;
}

function triggerCsvDownload(filename, csvContent) {
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCsv(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export function downloadCashTransactionsCsv(items, filters = {}) {
  const headers = [
    "Transaction Date",
    "Customer Name",
    "Phone",
    "User ID",
    "Type",
    "Source",
    "Amount (INR)",
    "Credited Amount (INR)",
    "Recharge Paid (INR)",
    "Bonus (INR)",
    "Balance After (INR)",
    "Status",
    "Order ID",
    "Gateway Order ID",
    "Description",
  ];

  const rows = items.map((row) => {
    const credited =
      row.credited_amount != null
        ? Number(row.credited_amount)
        : row.type === "CREDIT"
          ? Number(row.amount ?? 0)
          : 0;
    return [
      formatWalletTransactionDate(row.createdAt),
      row.userName || "",
      row.userPhone || "",
      row.userId ? String(row.userId) : "",
      row.type || "",
      row.transaction_source || "",
      Number(row.amount ?? 0),
      credited,
      row.recharge_amount != null ? Number(row.recharge_amount) : "",
      row.bonus_amount != null ? Number(row.bonus_amount) : "",
      Number(row.balance_after_transaction ?? 0),
      row.status || "",
      row.order_id ? String(row.order_id) : "",
      row.gateway_order_id || "",
      row.description || "",
    ];
  });

  const filterParts = [filters.source, filters.type, filters.status];
  const filename = buildExportFilename("cash-wallet-transactions", items, filterParts);
  triggerCsvDownload(filename, buildCsv(headers, rows));
  return { filename, count: items.length };
}

export function downloadRewardTransactionsCsv(items, filters = {}) {
  const headers = [
    "Transaction Date",
    "Customer Name",
    "Phone",
    "User ID",
    "Type",
    "Source",
    "Points",
    "Balance After (Points)",
    "Order ID",
    "Expiry Date",
  ];

  const rows = items.map((row) => [
    formatWalletTransactionDate(row.createdAt),
    row.userName || "",
    row.userPhone || "",
    row.userId ? String(row.userId) : "",
    row.type || "",
    row.source || "",
    Number(row.points ?? 0),
    Number(row.points_balance_after ?? 0),
    row.order_id ? String(row.order_id) : "",
    row.expiry_date ? formatWalletTransactionDate(row.expiry_date) : "",
  ]);

  const filterParts = [filters.type, filters.source];
  const filename = buildExportFilename("reward-wallet-transactions", items, filterParts);
  triggerCsvDownload(filename, buildCsv(headers, rows));
  return { filename, count: items.length };
}

export async function exportCashTransactions(filters = {}) {
  const items = await fetchAllCashTransactions(filters);
  if (!items.length) {
    throw new Error("No transactions to export for the current filters.");
  }
  return downloadCashTransactionsCsv(items, filters);
}

export async function exportRewardTransactions(filters = {}) {
  const items = await fetchAllRewardTransactions(filters);
  if (!items.length) {
    throw new Error("No transactions to export for the current filters.");
  }
  return downloadRewardTransactionsCsv(items, filters);
}
