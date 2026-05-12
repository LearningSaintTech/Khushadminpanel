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

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">
        Referral Management
      </h1>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold">
              Total Referrals
            </h2>

            <p className="text-2xl font-bold mt-2">
              {analytics.totalReferrals}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold">
              Rewarded
            </h2>

            <p className="text-2xl font-bold text-green-600 mt-2">
              {analytics.byStatus?.REWARDED || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold">
              Pending
            </h2>

            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {analytics.byStatus?.PENDING || 0}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold">
              Rejected
            </h2>

            <p className="text-2xl font-bold text-red-600 mt-2">
              {analytics.byStatus?.REJECTED || 0}
            </p>
          </div>
        </div>
      )}

      {/* Config Section */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Referral Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">
              Referral Reward Amount
            </label>

            <input
              type="number"
              name="referralRewardAmount"
              value={config.referralRewardAmount}
              onChange={handleConfigChange}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Minimum Order Amount
            </label>

            <input
              type="number"
              name="minimumOrderAmount"
              value={config.minimumOrderAmount}
              onChange={handleConfigChange}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Minimum Wallet Recharge
            </label>

            <input
              type="number"
              name="minimumWalletRecharge"
              value={config.minimumWalletRecharge}
              onChange={handleConfigChange}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Referral Expiry Days
            </label>

            <input
              type="number"
              name="referralExpiryDays"
              value={config.referralExpiryDays}
              onChange={handleConfigChange}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div className="flex items-center gap-3 mt-2">
            <input
              type="checkbox"
              name="isEnabled"
              checked={config.isEnabled}
              onChange={handleConfigChange}
            />

            <label className="font-medium">
              Enable Referral System
            </label>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={loading}
          className="mt-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      {/* Referral Table */}
      <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
        <h2 className="text-2xl font-semibold mb-4">
          Referral List
        </h2>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-3">Referral Code</th>
              <th className="p-3">Referred User</th>
              <th className="p-3">Reward</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created At</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {referrals?.length > 0 ? (
              referrals.map((item) => (
                <tr key={item._id} className="border-b">
                  <td className="p-3">
                    {item.referralCode}
                  </td>

                  <td className="p-3">
                    {item.referredUser?.name ||
                      item.referredUserSnapshot?.name ||
                      "N/A"}
                  </td>

                  <td className="p-3">
                    ₹{item.rewardAmount}
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.status === "REWARDED"
                          ? "bg-green-100 text-green-700"
                          : item.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {new Date(
                      item.createdAt
                    ).toLocaleDateString()}
                  </td>

                  <td className="p-3 flex gap-2">
                    {item.status === "PENDING" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(item._id)
                        }
                        className="bg-red-600 text-white px-3 py-1 rounded"
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
                  className="text-center p-6 text-gray-500"
                >
                  No referrals found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>

          <p>
            Page {page} of {totalPages}
          </p>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Referral;