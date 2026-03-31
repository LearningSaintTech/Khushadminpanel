// src/pages/ItemInventory.jsx   (or wherever your centralstock.jsx is located)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getItemsWithSkus, updateItem } from '../../apis/Skuapi'; // ← adjust import path
import { bulkUploadStockFile } from '../../apis/Warehouseapi';
import toast from 'react-hot-toast'; // or your preferred toast library

const ItemInventory = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);

  const [editingStock, setEditingStock] = useState({});

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkLastResult, setBulkLastResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = useCallback(async () => {
    console.log("[CentralStock] fetchItems start", {
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch,
    });
    setLoading(true);
    try {
      const res = await getItemsWithSkus(
        pagination.page,
        pagination.limit,
        1,           // skuPage
        10,          // skuLimit
        debouncedSearch
      );

      console.log("API Response:", res);

      if (res?.success && Array.isArray(res?.data?.items)) {
        console.log("[CentralStock] fetchItems success", {
          itemCount: res?.data?.items?.length ?? 0,
          pagination: res?.data?.pagination,
        });
        setItems(res.data.items);
        setPagination(res.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        });
      } else {
        console.warn("[CentralStock] fetchItems unexpected response", {
          success: res?.success,
          message: res?.message,
          hasItemsArray: Array.isArray(res?.data?.items),
        });
        toast.error(res?.message || 'Failed to load items');
        setItems([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Error loading inventory');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const toggleExpand = (itemId) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  };

  const startEditing = (itemId, skuCode, currentStock) => {
    console.log("[CentralStock] startEditing", { itemId, skuCode, currentStock });
    const key = `${itemId}-${skuCode}`;
    setEditingStock(prev => ({
      ...prev,
      [key]: currentStock ?? 0,
    }));
  };

  const saveStock = async (itemId, sku) => {
    console.log("[CentralStock] saveStock submit", {
      itemId,
      sku,
    });
    if (!itemId || !sku?.sku) {
      console.warn("[CentralStock] saveStock invalid item/sku", { itemId, sku });
      toast.error('Invalid item or SKU');
      return;
    }

    const key = `${itemId}-${sku.sku}`;
    const newStock = Number(editingStock[key]);
    console.log("[CentralStock] saveStock parsed stock", {
      key,
      raw: editingStock[key],
      parsed: newStock,
    });

    if (isNaN(newStock) || newStock < 0) {
      console.warn("[CentralStock] saveStock validation failed", {
        key,
        newStock,
      });
      toast.error('Please enter a valid non-negative number');
      return;
    }

    try {
      const payload = {
        skus: [{
          skuId: sku.sku,          // ← IMPORTANT: using sku.sku as identifier
          stock: newStock
        }]
      };
      console.log("[CentralStock] updateItem request", { itemId, payload });

      const res = await updateItem(itemId, payload);
      console.log('Update response:', res);

      if (res?.success) {
        console.log("[CentralStock] updateItem success", {
          itemId,
          sku: sku.sku,
          stock: newStock,
        });
        toast.success('Stock updated');
        fetchItems(); // refresh list
      } else {
        console.warn("[CentralStock] updateItem failed response", {
          itemId,
          response: res,
        });
        toast.error(res?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to save stock');
    } finally {
      setEditingStock(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const cancelEdit = (itemId, skuCode) => {
    console.log("[CentralStock] cancelEdit", { itemId, skuCode });
    const key = `${itemId}-${skuCode}`;
    setEditingStock(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Choose a file (.json, .csv, .xlsx, .xls, or .xml)');
      return;
    }
    setBulkSubmitting(true);
    setBulkLastResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await bulkUploadStockFile(formData);
      if (res?.success) {
        const data = res.data ?? {};
        setBulkLastResult(data);
        const errCount = data.errors?.length ?? 0;
        const appliedCount = data.applied?.length ?? 0;
        if (errCount > 0) {
          toast.error(`Bulk finished with ${errCount} error(s); ${appliedCount} applied`);
        } else {
          toast.success(`Bulk stock applied (${appliedCount} operations)`);
        }
        setBulkFile(null);
        if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
        fetchItems();
      } else {
        toast.error(res?.message || 'Bulk upload failed');
      }
    } catch (err) {
      console.error('[CentralStock] bulk upload', err);
      toast.error(typeof err === 'string' ? err : err?.message || 'Bulk upload failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-1 text-gray-600">Manage items and SKU stock levels</p>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900">Bulk stock upload</h2>
          <p className="mt-1 text-xs text-gray-500 max-w-3xl">
            Upload a file to update <strong>central</strong> stock and/or <strong>warehouse</strong> stock by SKU.
            Formats: JSON, CSV, Excel (.xlsx). Use columns <code className="text-indigo-700 bg-indigo-50 px-1 rounded">sku</code>,{' '}
            <code className="text-indigo-700 bg-indigo-50 px-1 rounded">central_stock</code> (optional),{' '}
            <code className="text-indigo-700 bg-indigo-50 px-1 rounded">warehouse_id</code> and{' '}
            <code className="text-indigo-700 bg-indigo-50 px-1 rounded">warehouse_delta</code> (optional).
            Max 2000 rows; duplicate SKUs in one file are rejected. See backend <code className="text-xs">docs/bulk-stock-upload-format.md</code>.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".json,.csv,.xlsx,.xls,.xml,application/json,text/csv"
              disabled={bulkSubmitting}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setBulkFile(f);
                setBulkLastResult(null);
              }}
              className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button
              type="button"
              disabled={bulkSubmitting || !bulkFile}
              onClick={handleBulkUpload}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkSubmitting ? 'Uploading…' : 'Upload & apply'}
            </button>
            <details className="relative">
              <summary className="list-none cursor-pointer inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                Download template
              </summary>
              <div className="absolute z-10 mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg p-1.5 space-y-1">
                <a
                  href="/templates/bulk-stock-upload.sample.csv"
                  download
                  className="block rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  CSV format
                </a>
                <a
                  href="/templates/bulk-stock-upload.sample.json"
                  download
                  className="block rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON format
                </a>
                <a
                  href="/templates/bulk-stock-upload.sample.xml"
                  download
                  className="block rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Excel format
                </a>
              </div>
            </details>
          </div>
          {bulkLastResult?.errors?.length > 0 ? (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold mb-1">Row errors ({bulkLastResult.errors.length})</p>
              <ul className="space-y-1 font-mono">
                {bulkLastResult.errors.map((row, i) => (
                  <li key={`${row.sku}-${row.rowIndex}-${i}`}>
                    {row.sku ? `${row.sku}: ` : ''}{row.rowIndex != null ? `(row ${row.rowIndex}) ` : ''}{row.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
            No items found {search && `for "${search}"`}
          </div>
        ) : (
          <div className="space-y-5">
            {items.map(item => {
              const itemId = item.itemId || item._id || 'no-id';
              const isExpanded = expandedItemId === itemId;
              const skuCount = item.skuPagination?.total || item.skus?.length || 0;

              return (
                <div
                  key={itemId}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow transition-shadow"
                >
                  {/* Item header - clickable */}
                  <div
                    className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    onClick={() => toggleExpand(itemId)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {item.name || 'Unnamed Item'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                        <span>ID: {itemId.slice(-8) || '—'}</span>
                        <span>• {skuCount} SKUs</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        Page {item.skuPagination?.page || 1}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* SKUs table */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {item.skus?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {item.skus.map((sku, idx) => {
                                const skuCode = sku.sku || `sku-${idx}`;
                                const editKey = `${itemId}-${skuCode}`;
                                const isEditing = editKey in editingStock;

                                return (
                                  <tr key={skuCode} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {sku.sku || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min="0"
                                          value={editingStock[editKey] ?? ''}
                                          onChange={e => setEditingStock(prev => ({
                                            ...prev,
                                            [editKey]: e.target.value
                                          }))}
                                          className="w-24 px-3 py-1.5 border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                      ) : (
                                        <span className={(sku.stock ?? 0) > 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                                          {sku.stock ?? 0}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      {isEditing ? (
                                        <div className="flex justify-end gap-4">
                                          <button
                                            onClick={() => saveStock(itemId, sku)}
                                            className="text-green-600 hover:text-green-800"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => cancelEdit(itemId, skuCode)}
                                            className="text-gray-500 hover:text-gray-700"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => startEditing(itemId, skuCode, sku.stock)}
                                          className="text-indigo-600 hover:text-indigo-800"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-10 text-center text-gray-500 italic">
                          No SKUs on this page
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-10 flex justify-center items-center gap-4">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-6 py-2.5 rounded-lg border disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Previous
            </button>

            <span className="text-sm font-medium text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-6 py-2.5 rounded-lg border disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemInventory;