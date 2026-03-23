import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getAllInventoryCodes,
  deleteInventoryCode,
  INVENTORY_CODE_TYPES,
} from "../../apis/inventoryCodeApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Hash,
  Layers,
} from "lucide-react";

const typeLabels = {
  CATEGORY: "Category",
  FIT: "Fit",
  COLOR: "Colour",
  SECTION: "Section",
};

const InventoryCodesPage = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState(""); // "" | "true" | "false"
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        type: typeFilter || undefined,
        search: searchApplied || undefined,
      };
      if (activeFilter === "true") params.isActive = true;
      if (activeFilter === "false") params.isActive = false;

      const res = await getAllInventoryCodes(params);
      const payload = res?.data ?? {};
      setItems(payload.items ?? []);
      const pg = payload.pagination ?? {};
      setPagination((prev) => ({
        ...prev,
        total: pg.total ?? 0,
        totalPages: pg.totalPages ?? 1,
      }));
    } catch (err) {
      console.error(err);
      setError(typeof err === "string" ? err : "Could not load inventory codes.");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    typeFilter,
    activeFilter,
    searchApplied,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this inventory code permanently?")) return;
    try {
      await deleteInventoryCode(id);
      const lastOnPage = items.length === 1 && pagination.page > 1;
      if (lastOnPage) {
        setPagination((p) => ({ ...p, page: p.page - 1 }));
      } else {
        await fetchList();
      }
    } catch (err) {
      alert(typeof err === "string" ? err : "Failed to delete");
    }
  };

  const applySearch = (e) => {
    e?.preventDefault?.();
    setSearchApplied(searchInput.trim());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-3">
              <Hash className="h-8 w-8 text-indigo-600" />
              Inventory codes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Category, fit, colour, and section codes for SKU / labelling. Managed per row.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link
              to={ap("inventory-codes/sku-formula")}
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
            >
              <Layers size={18} /> SKU &amp; sku_uid formula
            </Link>
            <Link
              to={ap("inventory-codes/create")}
              className="inline-flex items-center justify-center gap-2 bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition"
            >
              <Plus size={18} /> Add code
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {INVENTORY_CODE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabels[t] || t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Active</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <form onSubmit={applySearch} className="flex flex-1 flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Code or name"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Sort
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Active
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      No rows yet. Run backend seed or add a code.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                          {typeLabels[row.type] || row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        <div>{row.name}</div>
                        {row.remarks ? (
                          <div className="mt-0.5 text-xs text-amber-700">{row.remarks}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.sortOrder ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {row.isActive ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={ap(`inventory-codes/edit/${row._id}`)}
                            className="inline-flex rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(row._id)}
                            className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.totalPages, p.page + 1),
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryCodesPage;
