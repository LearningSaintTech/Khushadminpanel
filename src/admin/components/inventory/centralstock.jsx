// src/pages/ItemInventory.jsx   (or wherever your centralstock.jsx is located)

import React, { useState, useEffect, useCallback } from 'react';
import { getItemsWithSkus, updateItem } from '../../apis/Skuapi'; // ← adjust import path
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

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = useCallback(async () => {
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
        setItems(res.data.items);
        setPagination(res.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        });
      } else {
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
    const key = `${itemId}-${skuCode}`;
    setEditingStock(prev => ({
      ...prev,
      [key]: currentStock ?? 0,
    }));
  };

  const saveStock = async (itemId, sku) => {
    if (!itemId || !sku?.sku) {
      toast.error('Invalid item or SKU');
      return;
    }

    const key = `${itemId}-${sku.sku}`;
    const newStock = Number(editingStock[key]);

    if (isNaN(newStock) || newStock < 0) {
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

      const res = await updateItem(itemId, payload);
      console.log('Update response:', res);

      if (res?.success) {
        toast.success('Stock updated');
        fetchItems(); // refresh list
      } else {
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
    const key = `${itemId}-${skuCode}`;
    setEditingStock(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
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