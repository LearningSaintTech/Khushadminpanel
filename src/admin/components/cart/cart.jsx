import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCartCharges,
  deleteCartCharges,
  toggleCartChargeStatus,
} from '../../apis/Cartapi';

import { Plus, Trash2, Edit, Power } from 'lucide-react';

const CartChargesPage = () => {
  const navigate = useNavigate();
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchCharges(currentPage);
  }, [currentPage]);

  const fetchCharges = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getCartCharges(page, limit);

      // Extract data from response
      // apiConnector returns response.data from axios, so response structure is:
      // { success: true, message: "...", data: { data: [...], total: 3, ... } }
      // So response.data = { data: [...], total: 3, ... }
      const responseData = response?.data || {};
      const chargesArray = responseData.data || [];
      const total = responseData.total || chargesArray.length;

      if (Array.isArray(chargesArray)) {
        setCharges(chargesArray);
        const calculatedPages = Math.ceil(total / limit);
        setTotalPages(calculatedPages > 0 ? calculatedPages : 1);
      } else {
        setCharges([]);
        setTotalPages(1);
        console.warn('No array found in response:', { response, responseData });
      }
    } catch (err) {
      console.error('Fetch cart charges error:', err);
      setError(err.response?.data?.message || 'Failed to load cart charges');
      setCharges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cart charge configuration?')) return;

    try {
      setLoading(true);
      await deleteCartCharges(id);
      await fetchCharges(currentPage);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete cart charge');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await toggleCartChargeStatus(id);
      await fetchCharges(currentPage);
    } catch (err) {
      console.error('Toggle status error:', err);
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Helper to show short summary of charges
  const getChargeSummary = (cartCharge) => {
    if (!Array.isArray(cartCharge) || cartCharge.length === 0) return '—';
    return cartCharge.map(c => c.key).join(', ');
  };

  // Helper to format rules for display
  const formatRules = (charge) => {
    if (!Array.isArray(charge.cartCharge) || charge.cartCharge.length === 0) return '—';
    
    return charge.cartCharge.map(c => {
      const rules = Object.entries(c.rules || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `${c.key} (${rules})`;
    }).join(' | ');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cart Charges Configurations</h1>
            <button
              onClick={() => navigate("/admin/cart-charges/create")}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium shadow-sm text-sm sm:text-base"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Add New Configuration</span>
              <span className="sm:hidden">Add New</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 overflow-x-hidden">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {loading && charges.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading cart charges...</div>
        ) : charges.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 mb-4">No cart charges configurations found</p>
            <button
              onClick={() => navigate("/admin/cart-charges/create")}
              className="text-black hover:underline font-medium"
            >
              Create your first configuration →
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 sm:px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                        ID
                      </th>
                      <th className="px-2 sm:px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[120px]">
                        Charges
                      </th>
                      <th className="px-2 sm:px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 hidden xl:table-cell min-w-[200px]">
                        Rules
                      </th>
                      <th className="px-2 sm:px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-2 sm:px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 hidden lg:table-cell whitespace-nowrap">
                        Created
                      </th>
                      <th className="px-2 sm:px-3 md:px-4 py-3 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {charges.map((charge) => (
                      <tr key={charge._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 sm:px-3 md:px-4 py-3 font-mono text-gray-600 text-xs whitespace-nowrap">
                          {charge._id.slice(-8)}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 py-3 text-gray-700 text-xs">
                          <div className="font-medium break-words">{getChargeSummary(charge.cartCharge)}</div>
                          <div className="text-gray-500 text-xs mt-1 xl:hidden line-clamp-2">
                            {formatRules(charge).substring(0, 60)}...
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 py-3 text-gray-600 text-xs hidden xl:table-cell">
                          <div className="max-w-xs truncate" title={formatRules(charge)}>
                            {formatRules(charge)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              charge.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {charge.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 py-3 text-gray-600 text-xs hidden lg:table-cell whitespace-nowrap">
                          {new Date(charge.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/admin/cart-charges/edit/${charge._id}`)}
                              className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(charge._id)}
                              className={`p-1.5 rounded-lg transition ${
                                charge.isActive
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              title={charge.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(charge._id)}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {charges.length > 0 && (
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage((prev) => prev - 1);
                    }
                  }}
                  disabled={currentPage === 1 || loading}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  ← Previous
                </button>

                <span className="px-4 sm:px-6 py-2.5 bg-gray-100 rounded-lg text-sm font-semibold text-gray-800 whitespace-nowrap border border-gray-200">
                  Page {currentPage} of {totalPages || 1}
                </span>

                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage((prev) => prev + 1);
                    }
                  }}
                  disabled={currentPage >= totalPages || loading}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CartChargesPage;
