// src/admin/pages/ExchangeForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createExchange,
  updateExchange,
  getSingleExchange,
} from "../../apis/Exchangeapi";
import { ArrowLeft, Plus, Trash2 } from "lucide-react"; // ← install: npm install lucide-react

const ExchangeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    maxExchangeTimeInDays: "",
    maxExchangeLimit: "",
    exchangeReasons: [],
  });

  const [reasonInput, setReasonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      fetchExchangePolicy();
    }
  }, [id]);

  const fetchExchangePolicy = async () => {
    try {
      const res = await getSingleExchange(id);
      if (res?.success && res.data) {
        setFormData({
          maxExchangeTimeInDays: String(res.data.maxExchangeTimeInDays || ""),
          maxExchangeLimit: String(res.data.maxExchangeLimit || ""),
          exchangeReasons: res.data.exchangeReasons || [],
        });
      }
    } catch (err) {
      console.error("Failed to load exchange policy:", err);
      setError("Failed to load existing policy.");
    }
  };

  const handleAddReason = () => {
    const trimmed = reasonInput.trim();
    if (!trimmed) return;

    setFormData((prev) => ({
      ...prev,
      exchangeReasons: [...prev.exchangeReasons, trimmed],
    }));
    setReasonInput("");
  };

  const handleRemoveReason = (index) => {
    setFormData((prev) => ({
      ...prev,
      exchangeReasons: prev.exchangeReasons.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.exchangeReasons.length === 0) {
      setError("Please add at least one exchange reason.");
      return;
    }

    if (!formData.maxExchangeTimeInDays || !formData.maxExchangeLimit) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        maxExchangeTimeInDays: Number(formData.maxExchangeTimeInDays),
        maxExchangeLimit: Number(formData.maxExchangeLimit),
        exchangeReasons: formData.exchangeReasons,
      };

      if (isEdit) {
        await updateExchange(id, payload);
      } else {
        await createExchange(payload);
      }

      navigate("/admin/exchange");
    } catch (err) {
      console.error("Save error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to save exchange policy. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/exchange")}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isEdit ? "Edit Exchange Policy" : "Create Exchange Policy"}
              </h1>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Two-column layout for numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Exchange Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Maximum Exchange Period (days)
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxExchangeTimeInDays}
                onChange={(e) =>
                  setFormData({ ...formData, maxExchangeTimeInDays: e.target.value })
                }
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-4"
                placeholder="e.g. 30"
                required
              />
            </div>

            {/* Max Exchange Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Maximum Exchange Limit 
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxExchangeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, maxExchangeLimit: e.target.value })
                }
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-4"
                placeholder="e.g. 5000"
                required
              />
            </div>
          </div>

          {/* Exchange Reasons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Exchange Reasons
            </label>

            {/* Input + Add button */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddReason();
                  }
                }}
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5"
                placeholder="e.g. Defective product, Wrong size, Color mismatch..."
              />
              <button
                type="button"
                onClick={handleAddReason}
                disabled={!reasonInput.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </button>
            </div>

            {/* List of reasons */}
            <div className="space-y-3 min-h-[120px]">
              {formData.exchangeReasons.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500">
                    No reasons added yet. Add at least one reason.
                  </p>
                </div>
              ) : (
                formData.exchangeReasons.map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 group hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => {
                        const updated = [...formData.exchangeReasons];
                        updated[index] = e.target.value;
                        setFormData((prev) => ({ ...prev, exchangeReasons: updated }));
                      }}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveReason(index)}
                      className="text-gray-400 hover:text-red-500 opacity-70 hover:opacity-100 transition-colors p-1 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/admin/exchange")}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2.5 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors min-w-[140px] justify-center"
            >
              {loading ? (
                "Saving..."
              ) : isEdit ? (
                "Update Policy"
              ) : (
                "Create Policy"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExchangeForm;