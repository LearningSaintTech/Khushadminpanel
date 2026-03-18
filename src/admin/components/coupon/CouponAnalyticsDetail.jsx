import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertCircle, Ticket, Percent, Clock } from "lucide-react";
import { getCouponById, getCouponAnalytics } from "../../apis/Couponapi";

const CouponAnalyticsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [couponRes, analyticsRes] = await Promise.all([
        getCouponById(id),
        getCouponAnalytics(id),
      ]);

      if (couponRes?.data) {
        setCoupon(couponRes.data);
      }

      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      } else {
        setError(analyticsRes?.message || "Failed to load analytics");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load coupon analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-gray-700">Loading coupon details…</p>
        </div>
      </div>
    );
  }

  if (error || !coupon || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-5" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load coupon</h2>
          <p className="text-gray-600 mb-6">{error || "Something went wrong"}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-medium shadow-sm"
          >
            <RefreshCw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, recentUsage } = analytics;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="text-right">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Coupon: <span className="text-indigo-700">{coupon.code}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Detailed performance & usage for this coupon only
            </p>
          </div>
        </div>

        {/* Overview Card */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Basic Info
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">{coupon.code}</p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3">
                <Ticket className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {coupon.description || "No description provided."}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <dt className="font-semibold text-gray-500">Discount</dt>
                <dd className="mt-0.5 text-gray-900">
                  {coupon.discountType === "PERCENT"
                    ? `${coupon.discountValue}%`
                    : `₹${coupon.discountValue}`}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-500">Status</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      coupon.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-500">Influencer Coupon</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      coupon.isInfluencer
                        ? "bg-purple-50 text-purple-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {coupon.isInfluencer ? "Yes" : "No"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-500">Validity</dt>
                <dd className="mt-0.5 text-gray-900">
                  {new Date(coupon.startDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {" → "}
                  {new Date(coupon.expiryDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Usage KPIs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Usage Summary
              </p>
              <Percent className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Redemptions</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {summary.totalUsageCount?.toLocaleString?.() || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Discount Given</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  ₹{Number(summary.totalDiscountGiven || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unique Users</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {summary.totalUniqueUsers?.toLocaleString?.() || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Orders with this Coupon</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {summary.totalOrdersWithCoupons?.toLocaleString?.() || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
              Limits & Thresholds
            </p>
            <dl className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Total Usage Limit</dt>
                <dd className="text-gray-900">
                  {coupon.totalUsageLimit > 0 ? coupon.totalUsageLimit : "Unlimited"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Per User Limit</dt>
                <dd className="text-gray-900">
                  {coupon.perUserUsageLimit > 0 ? coupon.perUserUsageLimit : "Unlimited"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Min Cart Value</dt>
                <dd className="text-gray-900">
                  {coupon.minCartValue ? `₹${coupon.minCartValue}` : "Not set"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Max Cart Value</dt>
                <dd className="text-gray-900">
                  {coupon.maxCartValue ? `₹${coupon.maxCartValue}` : "Not set"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Recent usage table for this coupon */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Redemptions</h2>
          </div>

          {recentUsage.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No redemptions recorded yet for this coupon.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Used At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recentUsage.map((u, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        #{u.orderId}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <div>{u.userName}</div>
                        <div className="text-xs text-gray-500">{u.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-3 text-sm text-emerald-700 text-right whitespace-nowrap">
                        ₹{Number(u.discountAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                        {new Date(u.usedAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponAnalyticsDetail;

