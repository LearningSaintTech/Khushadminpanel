// Referral.jsx

import React, { useEffect, useState } from "react";

import {
  getReferralConfig,
  updateReferralConfig,
  getReferralAnalytics,
  getReferrals,
  updateReferralStatus,
} from "../../apis/Refferalapi";

const Referral = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [config, setConfig] = useState({
    isEnabled: true,
    minimumOrderAmount: 1,
    minimumWalletRecharge: 2,
    referralRewardAmount: 150,
    referralExpiryDays: 45,
    conditions: [
      {
        key: "ORDER_AMOUNT",
        source: "ORDER",
        operator: ">=",
        value: 199,
        isEnabled: true,
        priority: 1,
      },
    ],
    uiConfig: {
      bannerTitle: "Refer & Earn",
    },
    metadata: {
      updatedBy: "admin-panel",
    },
  });

  // Fetch Config
  const fetchReferralConfig = async () => {
    try {
      const response = await getReferralConfig();

      console.log("CONFIG RESPONSE", response);

      if (response?.success) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  // Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      const response = await getReferralAnalytics();

      console.log("ANALYTICS RESPONSE", response);

      if (response?.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  // Fetch Referrals
  const fetchReferrals = async (currentPage = 1) => {
    try {
      setLoading(true);

      const response = await getReferrals(currentPage, 20);

      console.log("REFERRAL RESPONSE", response);

      if (response?.success) {
        setReferrals(response?.data?.items || []);
        setTotalPages(response?.data?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Input Change
  const handleConfigChange = (e) => {
    const { name, value, checked, type } = e.target;

    setConfig((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? Number(value)
          : value,
    }));
  };

  // Save Config
  const handleSaveConfig = async () => {
    try {
      setLoading(true);

      const payload = {
        isEnabled: config.isEnabled,

        minimumOrderAmount: Number(
          config.minimumOrderAmount
        ),

        minimumWalletRecharge: Number(
          config.minimumWalletRecharge
        ),

        referralRewardAmount: Number(
          config.referralRewardAmount
        ),

        referralExpiryDays: Number(
          config.referralExpiryDays
        ),

        conditions: config.conditions?.map((item) => ({
          key: item.key,
          source: item.source,
          operator: item.operator,
          value: Number(item.value),
          isEnabled: item.isEnabled,
          priority: item.priority,
        })),

        uiConfig: {
          bannerTitle:
            config.uiConfig?.bannerTitle ||
            "Refer & Earn",
        },

        metadata: {
          updatedBy: "admin-panel",
        },
      };

      console.log("FINAL PAYLOAD", payload);

      await updateReferralConfig(payload);

      alert(
        "Referral configuration updated successfully"
      );

      fetchReferralConfig();
      fetchAnalytics();
    } catch (error) {
      console.error(
        "FULL CONFIG ERROR",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to update configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  // Reject Referral
  const handleStatusUpdate = async (id) => {
    try {
      const note =
        prompt("Enter rejection note") ||
        "Rejected by admin";

      const payload = {
        status: "REJECTED",
        note,
      };

      console.log("STATUS PAYLOAD", payload);

      const response = await updateReferralStatus(
        id,
        payload
      );

      console.log("STATUS RESPONSE", response);

      alert("Referral rejected successfully");

      fetchReferrals(page);
      fetchAnalytics();
    } catch (error) {
      console.error(
        "Error updating status:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to update referral status"
      );
    }
  };

  useEffect(() => {
    fetchReferralConfig();
    fetchAnalytics();
    fetchReferrals(page);
  }, [page]);

  const statusPillClass = (status) => {
    if (status === "REWARDED") return "bg-emerald-100 text-emerald-700";
    if (status === "REJECTED") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  const fmtDate = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-base font-semibold text-slate-900">Referral Management</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Configure referral rewards and review referral requests.
        </p>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              Total referrals
            </h2>
            <p className="mt-1 text-2xl font-bold text-slate-900">{analytics.totalReferrals}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Rewarded
            </h2>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{analytics.byStatus?.REWARDED || 0}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Pending
            </h2>
            <p className="mt-1 text-2xl font-bold text-amber-700">{analytics.byStatus?.PENDING || 0}</p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
              Rejected
            </h2>
            <p className="mt-1 text-2xl font-bold text-rose-700">{analytics.byStatus?.REJECTED || 0}</p>
          </div>
        </div>
      )}

      {/* Config Section */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Referral Configuration</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            Compact settings
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Referral Reward Amount (INR)</label>
            <input
              type="number"
              name="referralRewardAmount"
              value={config.referralRewardAmount}
              onChange={handleConfigChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Minimum Order Amount</label>
            <input
              type="number"
              name="minimumOrderAmount"
              value={config.minimumOrderAmount}
              onChange={handleConfigChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Minimum Wallet Recharge</label>
            <input
              type="number"
              name="minimumWalletRecharge"
              value={config.minimumWalletRecharge}
              onChange={handleConfigChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Referral Expiry Days</label>
            <input
              type="number"
              name="referralExpiryDays"
              value={config.referralExpiryDays}
              onChange={handleConfigChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2 xl:col-span-1">
            <input
              type="checkbox"
              name="isEnabled"
              checked={config.isEnabled}
              onChange={handleConfigChange}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-xs font-medium text-slate-700">
              Enable referral system
            </label>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={loading}
          className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save configuration"}
        </button>
      </div>

      {/* Referral Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Referral List</h2>
        </div>

        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Referral Code</th>
              <th className="px-3 py-2">Referred User</th>
              <th className="px-3 py-2 text-right">Reward</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created At</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {referrals?.length > 0 ? (
              referrals.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-900">{item.referralCode}</td>

                  <td className="px-3 py-2 text-slate-700">
                    {item.referredUser?.name ||
                      item.referredUserSnapshot?.name ||
                      "N/A"}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    ₹{Number(item.rewardAmount || 0).toLocaleString("en-IN")}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusPillClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-slate-600">
                    {fmtDate(item.createdAt)}
                  </td>

                  <td className="px-3 py-2 text-center">
                    {item.status === "PENDING" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(item._id)
                        }
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-xs text-slate-500"
                >
                  No referrals found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>

          <p className="text-xs text-slate-600">
            Page {page} of {totalPages}
          </p>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Referral;