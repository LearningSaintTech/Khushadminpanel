// src/pages/admin/influencers/InfluencerCouponManage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getInfluencerCoupons,
  attachCouponToInfluencer,
  detachCouponFromInfluencer,
  getInfluencerCouponHistory,
  getInfluencerAnalytics,
} from '../../apis/influrncerCouponapi';
import { getCoupons } from '../../apis/Couponapi';
import { ArrowLeft, Plus, Unlink, Link2, Search, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const InfluencerCouponManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [attachedCoupons, setAttachedCoupons] = useState([]);
  const [allCoupons, setAllCoupons] = useState([]);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [couponSearch, setCouponSearch] = useState('');

  // Pagination
  const pageSize = 10;
  const [attachedPage, setAttachedPage] = useState(1);
  const [attachedTotal, setAttachedTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [attachedRes, historyRes, analyticsRes, allCouponsRes] = await Promise.all([
          getInfluencerCoupons(id, attachedPage, pageSize),
          getInfluencerCouponHistory(id, historyPage, pageSize),
          getInfluencerAnalytics(id),
          getCoupons(1, 300, ''), // adjust limit as needed
        ]);

        setAttachedCoupons(attachedRes?.data?.coupons || []);
        setAttachedTotal(attachedRes?.data?.total || 0);

        setHistory(historyRes?.data?.usages || []);
        setHistoryTotal(historyRes?.data?.total || 0);

        setAnalytics(analyticsRes?.data);
        setAllCoupons(allCouponsRes?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, attachedPage, historyPage]);

  const handleAttach = async (couponId) => {
    try {
      await attachCouponToInfluencer(couponId, id);
      // optimistic + refresh
      setAttachedCoupons((prev) => [
        ...prev,
        allCoupons.find((c) => c._id === couponId),
      ]);
      setShowAttach(false);
      // better: refetch page 1
      const res = await getInfluencerCoupons(id, 1, pageSize);
      setAttachedCoupons(res?.data?.coupons || []);
      setAttachedTotal(res?.data?.total || 0);
      setAttachedPage(1);
    } catch (err) {
      alert('Failed to attach: ' + (err?.response?.data?.message || 'Error'));
    }
  };

  const handleDetach = async (couponId) => {
    if (!window.confirm('Really detach this coupon?')) return;
    try {
      await detachCouponFromInfluencer(couponId, id);
      setAttachedCoupons((prev) => prev.filter((c) => (c._id || c.couponId) !== couponId));
    } catch (err) {
      alert('Detach failed');
    }
  };

  const availableCoupons = allCoupons.filter(
    (c) =>
      !attachedCoupons.some((ac) => (ac._id || ac.couponId) === c._id) &&
      (!c.influencerId || c.influencerId === id) &&
      (c.code?.toLowerCase().includes(couponSearch.toLowerCase()) ||
        c.description?.toLowerCase().includes(couponSearch.toLowerCase()))
  );

  const PaginationControls = ({ currentPage, totalItems, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">Loading coupon data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-2"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to Influencers
            </button>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Coupon Management
            </h1>
            <p className="text-gray-600 mt-1.5">
              Influencer ID: <span className="font-mono text-gray-800">{id}</span>
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow transition-shadow">
              <p className="text-sm font-medium text-gray-500">Total Redemptions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalUsage ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow transition-shadow">
              <p className="text-sm font-medium text-gray-500">Total Discount Given</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                ₹{(analytics.totalDiscount ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            {/* Add more stats cards here if available */}
          </div>
        )}

        {/* Attached Coupons */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-12">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <h2 className="text-xl font-semibold text-gray-900">Attached Coupons</h2>
            <button
              onClick={() => setShowAttach(!showAttach)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                showAttach
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              <Plus size={16} />
              {showAttach ? 'Cancel' : 'Attach Coupon'}
            </button>
          </div>

          {attachedCoupons.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No coupons attached yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {attachedCoupons.map((c) => (
                <div
                  key={c._id || c.couponId}
                  className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/60 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-gray-900">{c.code || c.coupon?.code}</div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {c.description || c.coupon?.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                      {c.discountType === 'PERCENT'
                        ? `${c.discountValue}% off`
                        : `Flat ₹${c.discountValue}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDetach(c._id || c.couponId)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Unlink size={15} /> Detach
                  </button>
                </div>
              ))}
            </div>
          )}

          <PaginationControls
            currentPage={attachedPage}
            totalItems={attachedTotal}
            onPageChange={setAttachedPage}
          />
        </div>

        {/* Attach Coupon Panel */}
        {showAttach && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-12">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/70">
              <h2 className="text-xl font-semibold text-gray-900">Attach New Coupon</h2>
              <div className="mt-4 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by code or description..."
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black/20 focus:border-gray-400 outline-none transition"
                />
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
              {availableCoupons.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No matching coupons found</div>
              ) : (
                availableCoupons.map((c) => (
                  <div
                    key={c._id}
                    className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/60 transition-colors group"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{c.code}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{c.description}</div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">
                        {c.discountType === 'PERCENT'
                          ? `${c.discountValue}% off`
                          : `Flat ₹${c.discountValue}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAttach(c._id)}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition"
                    >
                      <Link2 size={15} /> Attach
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Usage History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/70">
            <Clock className="text-blue-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Coupon Usage History</h2>
          </div>

          {history.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No usage recorded yet</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Coupon
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Used At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{u.orderId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{u.userName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{u.phoneNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{u.couponCode}</td>
                        <td className="px-6 py-4 text-right text-emerald-700 font-medium">
                          ₹{Number(u.discountAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-600">
                          {new Date(u.usedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={historyPage}
                totalItems={historyTotal}
                onPageChange={setHistoryPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfluencerCouponManage;