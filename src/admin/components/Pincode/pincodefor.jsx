import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createPincode,
  updatePincode,
  bulkUploadPincodes,
} from "../../apis/Pincodeapi";

const PincodeForm = () => {
  const navigate = useNavigate();
  const { pincode } = useParams(); // used for edit mode (pincode value from URL)

  const [pinCode, setPinCode] = useState("");
  const [bulkPincodes, setBulkPincodes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prefill form in edit mode
  useEffect(() => {
    if (pincode) {
      setPinCode(pincode);
    }
  }, [pincode]);

  // ────────────────────────────────────────────────
  // SINGLE PINCODE CREATE / UPDATE
  // ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pinCode.trim()) {
      setError("Pincode is required");
      return;
    }

    if (!/^\d{6}$/.test(pinCode.trim())) {
      setError("Pincode must be exactly 6 digits");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (pincode) {
        // Update existing
        await updatePincode(pincode, { pinCode: pinCode.trim() });
      } else {
        // Create new
        await createPincode({ pinCode: pinCode.trim() });
      }

      navigate("/admin/pincode");
    } catch (err) {
      console.error("Single save error:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save pincode. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // BULK UPLOAD
  // ────────────────────────────────────────────────
  const handleBulkUpload = async () => {
    if (!bulkPincodes.trim()) {
      setError("Please enter at least one pincode");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const pincodesArray = bulkPincodes
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .filter((p) => /^\d{6}$/.test(p)); // only valid 6-digit pincodes

      if (pincodesArray.length === 0) {
        setError("No valid 6-digit pincodes found in the input");
        return;
      }

      console.log("[BULK] Preparing to send:", pincodesArray);
      console.log("[BULK] Count:", pincodesArray.length);

      const res = await bulkUploadPincodes(pincodesArray);

      // ── HEAVY DEBUG LOGGING ─────────────────────────────────────
      console.log("[BULK] FULL RESPONSE:", res);
      console.log("[BULK] STATUS:", res?.status);
      console.log("[BULK] RESPONSE DATA:", res?.data);
      // ────────────────────────────────────────────────────────────

      // Flexible result parsing (adjust keys according to your actual backend)
      const result = res?.data || {};
      const inserted =
        result.inserted ??
        result.insertedCount ??
        result.added ??
        result.successCount ??
        result.success ??
        0;

      const skipped =
        result.skipped ??
        result.alreadyExists ??
        result.duplicates ??
        result.existing ??
        result.failed ??
        0;

      alert(
        `Bulk upload complete!\n` +
        `Inserted: ${inserted}\n` +
        `Skipped (already exists/other): ${skipped}\n` +
        `Total processed: ${pincodesArray.length}`
      );

      setBulkPincodes(""); // clear input after success
      navigate("/admin/pincode");

    } catch (err) {
      console.error("[BULK] Upload failed:", err);

      let errorMsg = "Bulk upload failed. Please try again.";

      if (err.response) {
        // Server responded with error (4xx, 5xx)
        console.log("[BULK] Error response data:", err.response.data);
        console.log("[BULK] Error status:", err.response.status);

        errorMsg =
          err.response.data?.message ||
          err.response.data?.error ||
          `Server error (${err.response.status})`;
      } else if (err.request) {
        // No response (network failure, CORS, timeout)
        console.log("[BULK] No response received:", err.request);
        errorMsg = "No response from server. Check your internet or backend status.";
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back Button */}
        <button
          onClick={() => navigate("/admin/pincode")}
          className="mb-6 text-gray-600 hover:text-black font-medium flex items-center gap-1"
        >
          ← Back to Pincodes
        </button>

        <h1 className="text-2xl font-bold mb-8">
          {pincode ? "Edit Pincode" : "Add New Pincode"}
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* ── SINGLE PINCODE FORM ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 mb-10"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pincode
            </label>
            <input
              type="text"
              maxLength={6}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
              placeholder="e.g. 110001"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/pincode")}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Pincode"}
            </button>
          </div>
        </form>

        {/* ── BULK UPLOAD SECTION ── */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
          <h2 className="text-xl font-semibold text-gray-800">
            Bulk Upload Pincodes
          </h2>

          <textarea
            value={bulkPincodes}
            onChange={(e) => setBulkPincodes(e.target.value)}
            placeholder="Enter pincodes separated by commas&#10;Example: 110001, 110002, 560001, 400001"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition resize-y min-h-[120px] font-mono text-sm"
          />

          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Uploading..." : "Upload All"}
          </button>

          <p className="text-xs text-gray-500">
            Only valid 6-digit Indian pincodes will be processed.
          </p>
        </div>

      </div>
    </div>
  );
};

export default PincodeForm;
