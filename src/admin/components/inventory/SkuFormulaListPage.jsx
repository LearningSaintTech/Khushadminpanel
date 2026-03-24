import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getAllSkuFormulaConfigs,
  deleteSkuFormulaConfig,
  setActiveSkuFormulaConfig,
} from "../../apis/inventoryCodeApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Power,
  AlertCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const SkuFormulaListPage = () => {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllSkuFormulaConfigs({
        page: pagination.page,
        limit: pagination.limit,
      });
      const payload = res?.data ?? {};
      setItems(payload.items ?? []);
      const pg = payload.pagination ?? {};
      setPagination((prev) => ({
        ...prev,
        total: pg.total ?? 0,
        totalPages: pg.totalPages ?? 1,
      }));
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not load SKU formulas.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSetActive = async (id) => {
    if (!window.confirm("Make this the only active SKU formula? Others will be deactivated.")) return;
    try {
      await setActiveSkuFormulaConfig(id);
      await fetchList();
    } catch (err) {
      alert(typeof err === "string" ? err : "Failed to set active");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this SKU formula permanently?")) return;
    try {
      await deleteSkuFormulaConfig(id);
      await fetchList();
    } catch (err) {
      alert(typeof err === "string" ? err : "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={ap("inventory-codes")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 w-fit"
          >
            <ArrowLeft size={18} /> Back to inventory codes
          </Link>
          <Link
            to={ap("inventory-codes/sku-formula/new")}
            className="inline-flex items-center justify-center gap-2 bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 w-fit"
          >
            <Plus size={18} /> New formula
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-2">
            <Layers className="h-8 w-8 text-indigo-600 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">SKU &amp; sku_uid formulas</h1>
              <p className="mt-1 text-sm text-gray-500">
                Save multiple presets. Only <strong>one</strong> can be active at a time — that is
                the definition your apps should read when generating or validating SKUs.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-800 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Template preview
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                    Active
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      No formulas yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono truncate max-w-xs">
                        {row.skuTemplateString || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isActive ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {!row.isActive && (
                            <button
                              type="button"
                              onClick={() => handleSetActive(row._id)}
                              className="inline-flex rounded-lg p-2 text-amber-700 hover:bg-amber-50"
                              title="Set as only active"
                            >
                              <Power size={18} />
                            </button>
                          )}
                          <Link
                            to={ap(`inventory-codes/sku-formula/edit/${row._id}`)}
                            className="inline-flex rounded-lg p-2 text-gray-600 hover:bg-gray-100"
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
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
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

export default SkuFormulaListPage;
