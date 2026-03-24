import { useEffect, useState, useCallback } from "react";
import { getItemSkuUids, updateItemSkuUid } from "../../apis/itemapi";

/**
 * Admin modal: list SkuUid rows for an item; edit code, batch ref, remarks.
 */
export default function SkuUidsModal({ itemId, open, onClose, onAfterSave }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    if (!itemId || !open) return;
    setLoading(true);
    setError("");
    try {
      const res = await getItemSkuUids(itemId);
      const list = res?.data?.skuUids ?? res?.skuUids ?? [];
      setRows(Array.isArray(list) ? list : []);
      const next = {};
      (Array.isArray(list) ? list : []).forEach((r) => {
        const id = r._id?.toString?.() ?? r._id;
        next[id] = {
          code: r.code ?? "",
          batchRef: r.batchRef ?? "",
          remarks: r.remarks ?? "",
        };
      });
      setDrafts(next);
    } catch (e) {
      setError(typeof e === "string" ? e : e?.message || "Failed to load SKU UIDs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [itemId, open]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const handleSave = async (uid) => {
    const idStr = uid._id?.toString?.() ?? uid._id;
    const d = drafts[idStr];
    if (!d) return;
    setSavingId(idStr);
    setError("");
    try {
      await updateItemSkuUid(itemId, idStr, {
        code: d.code?.trim(),
        batchRef: d.batchRef,
        remarks: d.remarks,
      });
      await load();
      if (typeof onAfterSave === "function") onAfterSave();
    } catch (e) {
      setError(typeof e === "string" ? e : e?.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sku-uids-title"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div>
            <h2 id="sku-uids-title" className="text-lg font-semibold text-gray-900">
              SKU UIDs (sku_uid)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              UID segment per sellable SKU line. Editing the code must stay unique for that SKU.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No SKU UID records yet. Save the product with SKUs (and optional UID start codes) to mint UIDs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-200">
                    <th className="py-2 pr-3 font-medium">Sellable SKU</th>
                    <th className="py-2 pr-3 font-medium">UID code</th>
                    <th className="py-2 pr-3 font-medium">Batch / ref</th>
                    <th className="py-2 pr-3 font-medium">Remarks</th>
                    <th className="py-2 font-medium w-24"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const idStr = r._id?.toString?.() ?? r._id;
                    const d = drafts[idStr] || { code: "", batchRef: "", remarks: "" };
                    return (
                      <tr key={idStr} className="border-b border-gray-100 align-top">
                        <td className="py-2 pr-3 font-mono text-xs break-all">{r.linkedSku}</td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full min-w-[4rem] px-2 py-1.5 border border-gray-300 rounded-md font-mono text-xs"
                            value={d.code}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [idStr]: { ...d, code: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full min-w-[6rem] px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                            value={d.batchRef}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [idStr]: { ...d, batchRef: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full min-w-[8rem] px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                            value={d.remarks}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [idStr]: { ...d, remarks: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            disabled={savingId === idStr}
                            onClick={() => handleSave(r)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            {savingId === idStr ? "…" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
