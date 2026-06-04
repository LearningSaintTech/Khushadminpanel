import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createPincode,
  updatePincode,
  bulkUploadPincodes,
} from "../../apis/Pincodeapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { ArrowLeft } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

const PincodeForm = () => {
  const navigate = useNavigate();
  const { pincode } = useParams();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("pincode"));
  };

  const [pinCode, setPinCode] = useState("");
  const [bulkPincodes, setBulkPincodes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pincode) setPinCode(pincode);
  }, [pincode]);

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
        await updatePincode(pincode, { pinCode: pinCode.trim() });
      } else {
        await createPincode({ pinCode: pinCode.trim() });
      }
      navigate(ap("pincode"));
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
        .filter((p) => /^\d{6}$/.test(p));
      if (pincodesArray.length === 0) {
        setError("No valid 6-digit pincodes found in the input");
        return;
      }
      const res = await bulkUploadPincodes(pincodesArray);
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
        `Bulk upload complete!\nInserted: ${inserted}\nSkipped: ${skipped}\nTotal processed: ${pincodesArray.length}`
      );
      setBulkPincodes("");
      navigate(ap("pincode"));
    } catch (err) {
      console.error("[BULK] Upload failed:", err);
      let errorMsg = "Bulk upload failed. Please try again.";
      if (err.response) {
        errorMsg =
          err.response.data?.message ||
          err.response.data?.error ||
          `Server error (${err.response.status})`;
      } else if (err.request) {
        errorMsg = "No response from server. Check your internet or backend status.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          {pincode ? "Edit pincode" : "Add pincode"}
        </h1>
        <button
          type="button"
          onClick={() => navigate(ap("pincode"))}
          className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted"
        >
          Close
        </button>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mb-2 space-y-2.5 rounded-xl border border-border bg-white p-3 shadow-sm"
      >
        <div>
          <label className={labelClass}>Pincode</label>
          <input
            type="text"
            maxLength={6}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            className={inputClass}
            placeholder="e.g. 110001"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => navigate(ap("pincode"))}
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save pincode"}
          </button>
        </div>
      </form>

      {!pincode ? (
        <section className="space-y-2.5 rounded-xl border border-border bg-white p-3 shadow-sm">
          <h2 className="text-xs font-semibold text-stone-800">Bulk upload pincodes</h2>
          <textarea
            value={bulkPincodes}
            onChange={(e) => setBulkPincodes(e.target.value)}
            placeholder="Enter pincodes separated by commas&#10;Example: 110001, 110002, 560001"
            className={`${inputClass} min-h-[120px] resize-y font-mono`}
          />
          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={loading}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Uploading…" : "Upload all"}
          </button>
          <p className="text-[10px] text-stone-500">
            Only valid 6-digit Indian pincodes will be processed.
          </p>
        </section>
      ) : null}
    </div>
  );
};

export default PincodeForm;
