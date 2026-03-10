// src/pages/admin/CancellationPolicyForm.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createCancellation,
  updateCancellation,
  getSingleCancellation,
} from "../../apis/CancellationPolicyapi";
import { Save, ArrowLeft, AlertCircle, Plus, Trash } from "lucide-react";

const CancellationPolicyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "",
    description: "",
    cancellationReasons: "",
  });

  const [policies, setPolicies] = useState([{ key: "", value: "" }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load policy for edit
  useEffect(() => {
    if (isEdit) {
      const loadPolicy = async () => {
        try {
          setLoading(true);
          const res = await getSingleCancellation(id);
          const p = res?.data || {};

          setForm({
            name: p.name || "",
            description: p.description || "",
            cancellationReasons: p.cancellationReasons?.join(", ") || "",
          });

          if (p.policies) {
            const arr = Object.entries(p.policies).map(([key, val]) => ({
              key,
              value: Array.isArray(val) ? val.join(", ") : val.toString(),
            }));
            setPolicies(arr.length ? arr : [{ key: "", value: "" }]);
          }
        } catch (err) {
          setError("Failed to load policy data");
        } finally {
          setLoading(false);
        }
      };

      loadPolicy();
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Dynamic policy handlers
  const handlePolicyChange = (index, field, value) => {
    const updated = [...policies];
    updated[index][field] = value;
    setPolicies(updated);
  };

  const addPolicy = () => {
    setPolicies([...policies, { key: "", value: "" }]);
  };

  const removePolicy = (index) => {
    const updated = policies.filter((_, i) => i !== index);
    setPolicies(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const reasons = form.cancellationReasons
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (!form.name.trim()) return setError("Policy name is required");
    if (reasons.length === 0)
      return setError("At least one cancellation reason is required");

    // Convert dynamic policies
    const policiesObj = {};

    policies.forEach((p) => {
      if (!p.key) return;

      const values = p.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const num = Number(v);
          return isNaN(num) ? v : num;
        });

      policiesObj[p.key] = values.length === 1 ? values[0] : values;
    });

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      cancellationReasons: reasons,
      policies: policiesObj,
    };

    try {
      setLoading(true);

      if (isEdit) {
        await updateCancellation(id, payload);
        alert("Policy updated successfully!");
      } else {
        await createCancellation(payload);
        alert("Policy created successfully!");
      }

      navigate("/admin/cancellation");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Operation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-3xl">

        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">

          <div className="bg-black px-6 py-5 text-white">
            <h1 className="text-xl font-semibold">
              {isEdit ? "Edit Cancellation Policy" : "Create Cancellation Policy"}
            </h1>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Policy Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy Name *
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                placeholder="Standard Policy"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
              />
            </div>

            {/* Reasons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancellation Reasons *
              </label>

              <input
                type="text"
                name="cancellationReasons"
                value={form.cancellationReasons}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                placeholder="Changed mind, Wrong size"
              />

              <p className="text-xs text-gray-500 mt-1">
                Separate reasons with commas
              </p>
            </div>

            {/* Dynamic Policies */}
            <div>

              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Policy Rules
                </label>

                <button
                  type="button"
                  onClick={addPolicy}
                  className="flex items-center gap-1 text-indigo-600"
                >
                  <Plus size={16} />
                  Add Policy
                </button>
              </div>

              {policies.map((policy, index) => (
                <div key={index} className="flex gap-3 mb-3">

                  <input
                    type="text"
                    placeholder="Policy Key"
                    value={policy.key}
                    onChange={(e) =>
                      handlePolicyChange(index, "key", e.target.value)
                    }
                    className="w-1/2 rounded-lg border border-gray-300 px-3 py-2"
                  />

                  <input
                    type="text"
                    placeholder="Value (comma separated)"
                    value={policy.value}
                    onChange={(e) =>
                      handlePolicyChange(index, "value", e.target.value)
                    }
                    className="w-1/2 rounded-lg border border-gray-300 px-3 py-2"
                  />

                  <button
                    type="button"
                    onClick={() => removePolicy(index)}
                    className="text-red-600"
                  >
                    <Trash size={18} />
                  </button>

                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700"
              >
                <Save size={18} />

                {loading
                  ? "Saving..."
                  : isEdit
                  ? "Update Policy"
                  : "Create Policy"}
              </button>

            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default CancellationPolicyForm;