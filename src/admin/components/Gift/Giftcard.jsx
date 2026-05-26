import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gift,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import {
  deleteGiftCardRule,
  getGiftCardRules,
  toggleGiftCardRuleStatus,
} from "../../apis/GiftcardApi";

const GiftCardRule = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchGiftCards = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const isActive =
        statusFilter === "active"
          ? true
          : statusFilter === "inactive"
            ? false
            : undefined;
      const response = await getGiftCardRules(page, limit, isActive);
      const data = response?.data || {};
      setGiftCards(data.items || []);
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Fetch gift cards:", err);
      setError(
        extractBackendMessages(err).join("; ") || "Failed to load gift cards.",
      );
      setGiftCards([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const handleEdit = (id) => {
    navigate(ap(`gift/edit/${id}`));
  };

  const handleCreate = () => {
    navigate(ap("gift/create"));
  };

  const handleToggleStatus = async (id) => {
    try {
      setBusyId(id);
      const res = await toggleGiftCardRuleStatus(id);
      if (res?.success || res?.data?.success !== false) {
        await fetchGiftCards();
      }
    } catch (err) {
      console.error(err);
      alert(extractBackendMessages(err).join("; ") || "Failed to update status.");
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this gift card rule? This cannot be undone.")) return;
    try {
      setBusyId(id);
      await deleteGiftCardRule(id);
      await fetchGiftCards();
    } catch (err) {
      console.error(err);
      alert(extractBackendMessages(err).join("; ") || "Failed to delete gift card.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Gift className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Gift card rules
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Configure multipliers, terms, and artwork for gift card offers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New gift card
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-sm">Loading gift cards…</span>
            </div>
          ) : giftCards.length === 0 ? (
            <div className="py-16 text-center">
              <Gift className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No gift cards yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first gift card rule to get started.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create gift card
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Card
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Multiplier
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Rules
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {giftCards.map((item) => (
                    <tr key={item._id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <Gift className="h-6 w-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              {item.description || "No description"}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-400">
                              {item.currency || "INR"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-800 ring-1 ring-indigo-100">
                          {item.multiplier}x
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.rules || []).length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            item.rules.map((rule, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-700"
                              >
                                {rule}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item._id)}
                          disabled={busyId === item._id}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {busyId === item._id ? "…" : item.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item._id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            disabled={busyId === item._id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && giftCards.length > 0 && totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default GiftCardRule;
