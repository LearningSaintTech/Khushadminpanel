import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Loader2 } from "lucide-react";

import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { extractBackendMessages } from "../../utils/extractBackendMessages";

import {
  createGiftCardRule,
  getGiftCardRuleById,
  updateGiftCardRule,
} from "../../apis/GiftcardApi";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const GiftCardForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();

  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(
      /\/+/g,
      "/",
    );

  const isEdit = useMemo(() => Boolean(id), [id]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "INR",
    isActive: true,

    rules: "",
    image: null,

    slabs: [
      {
        minPrice: "",
        maxPrice: "",
        percent: "",
        label: "",
      },
    ],
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loadError, setLoadError] = useState("");

  // ================= FETCH SINGLE =================
  useEffect(() => {
    if (!isEdit) return;

    const fetchSingle = async () => {
      try {
        console.log("📦 Fetching Gift Card By ID:", id);

        setLoading(true);
        setLoadError("");

        const response = await getGiftCardRuleById(id);

        console.log("✅ Gift Card Response:", response);

        const item = response?.data?.data || response?.data;

        if (!item) {
          setLoadError("Gift card not found.");
          return;
        }

        setFormData({
          name: item.name || "",
          description: item.description || "",
          currency: item.currency || "INR",
          isActive: Boolean(item.isActive),

          rules: Array.isArray(item.rules) ? item.rules.join(", ") : "",

          image: null,

          slabs:
            Array.isArray(item.slabs) && item.slabs.length > 0
              ? item.slabs.map((slab) => ({
                  minPrice: slab.minPrice ?? "",
                  maxPrice: slab.maxPrice ?? "",
                 percent: slab.percent ?? "",
                  label: slab.label ?? "",
                }))
              : [
                  {
                    minPrice: "",
                    maxPrice: "",
                     percent: "",
                    label: "",
                  },
                ],
        });

        setPreviewImage(item.image || null);
      } catch (err) {
        console.error("❌ Fetch Single Error:", err);

        setLoadError(
          extractBackendMessages(err).join("; ") || "Failed to load gift card.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSingle();
  }, [id, isEdit]);

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    console.log("📝 Input Changed:", name, value);

    if (name === "image" && files?.[0]) {
      console.log("🖼️ Selected Image:", files[0]);

      setFormData((prev) => ({
        ...prev,
        image: files[0],
      }));

      setPreviewImage(URL.createObjectURL(files[0]));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // ================= SLAB CHANGE =================
  const handleSlabChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedSlabs = [...prev.slabs];

      updatedSlabs[index][field] = value;

      return {
        ...prev,
        slabs: updatedSlabs,
      };
    });
  };

  // ================= ADD SLAB =================
  const addSlab = () => {
    setFormData((prev) => ({
      ...prev,
      slabs: [
        ...prev.slabs,
        {
          minPrice: "",
          maxPrice: "",
          percent: "",
          label: "",
        },
      ],
    }));
  };

  // ================= REMOVE SLAB =================
  const removeSlab = (index) => {
    setFormData((prev) => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== index),
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setErrors([]);

      const payload = new FormData();

      payload.append("name", formData.name.trim());
      payload.append("description", formData.description.trim());
      payload.append("currency", formData.currency);
      // payload.append("multiplier", String(formData.multiplier));
const formattedSlabs = formData.slabs.map((slab) => ({
  minPrice: Number(slab.minPrice),
  maxPrice:
    slab.maxPrice === "" ? null : Number(slab.maxPrice),
  percent: Number(slab.percent),
  label: slab.label,
}));

payload.append("slabs", JSON.stringify(formattedSlabs));      payload.append("isActive", formData.isActive ? "true" : "false");

      const rulesArray = formData.rules
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      payload.append("rules", JSON.stringify(rulesArray));

      if (formData.image) {
        payload.append("image", formData.image);
      }

      console.log("🚀 Submitting Payload:");

      for (let pair of payload.entries()) {
        console.log(pair[0], pair[1]);
      }

      // ================= UPDATE =================
      if (isEdit) {
        console.log("✏️ Updating Gift Card:", id);

        const response = await updateGiftCardRule(id, payload);

        console.log("✅ Update Response:", response);
      }

      // ================= CREATE =================
      else {
        console.log("🆕 Creating Gift Card");

        const response = await createGiftCardRule(payload);

        console.log("✅ Create Response:", response);
      }

      navigate(ap("gift"));
    } catch (err) {
      console.error("❌ Submit Error:", err);

      setErrors(
        extractBackendMessages(err).length
          ? extractBackendMessages(err)
          : ["Something went wrong. Please try again."],
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[40vh] items-center justify-center gap-3"
      >
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-slate-600">Loading gift card...</span>
      </motion.div>
    );
  }

  // ================= ERROR =================
  if (isEdit && loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm text-rose-700">{loadError}</p>

          <button
            type="button"
            onClick={() => navigate(ap("gift"))}
            className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Back to gift cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        {/* BACK BUTTON */}
        <button
          type="button"
          onClick={() => navigate(ap("gift"))}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to gift cards
        </button>

        {/* CARD */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <Gift className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  {isEdit ? "Edit Gift Card" : "Create Gift Card"}
                </h1>

                <p className="mt-1 text-sm text-indigo-100">
                  {isEdit
                    ? "Update gift card information"
                    : "Create a new gift card offer"}
                </p>
              </div>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            {/* ERRORS */}
            {errors.length > 0 && (
              <ul className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errors.map((msg, index) => (
                  <li key={index}>• {msg}</li>
                ))}
              </ul>
            )}

            {/* BASIC DETAILS */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Basic Details
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* NAME */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Gift Card Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Festive Bonus Card"
                    required
                  />
                </div>

                {/* SLABS */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Price Slabs
                    </label>

                    <button
                      type="button"
                      onClick={addSlab}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      Add Slab
                    </button>
                  </div>

                  {formData.slabs.map((slab, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
                    >
                      {/* MIN PRICE */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Min Price
                        </label>

                        <input
                          type="number"
                          value={slab.minPrice}
                          onChange={(e) =>
                            handleSlabChange(index, "minPrice", e.target.value)
                          }
                          className={fieldClass}
                          placeholder="100"
                        />
                      </div>

                      {/* MAX PRICE */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Max Price
                        </label>

                        <input
                          type="number"
                          value={slab.maxPrice}
                          onChange={(e) =>
                            handleSlabChange(index, "maxPrice", e.target.value)
                          }
                          className={fieldClass}
                          placeholder="499"
                        />
                      </div>

                      {/* MULTIPLIER */}
                     {/* PERCENT */}
<div>
  <label className="mb-1 block text-xs font-medium text-slate-600">
    Percent
  </label>

  <input
    type="number"
    step="1"
    value={slab.percent}
    onChange={(e) =>
      handleSlabChange(index, "percent", e.target.value)
    }
    className={fieldClass}
    placeholder="100"
  />
</div>

                      {/* LABEL */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Label
                        </label>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={slab.label}
                            onChange={(e) =>
                              handleSlabChange(index, "label", e.target.value)
                            }
                            className={fieldClass}
                            placeholder="Starter"
                          />

                          {formData.slabs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlab(index)}
                              className="rounded-lg bg-rose-100 px-3 text-rose-600 hover:bg-rose-200"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* MULTIPLIER */}
                {/* <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Multiplier
                  </label>

                  <input
                    type="number"
                    name="multiplier"
                    value={formData.multiplier}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="2"
                    required
                  />
                </div> */}

                {/* CURRENCY */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Currency
                  </label>

                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                {/* DESCRIPTION */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Short description for the gift card"
                  />
                </div>
              </div>
            </section>

            {/* RULES & IMAGE */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Rules & Media
              </h2>

              {/* RULES */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Rules (comma separated)
                </label>

                <textarea
                  name="rules"
                  rows={4}
                  value={formData.rules}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="Valid for 30 days, Non-refundable"
                />
              </div>

              {/* IMAGE */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Upload Image
                </label>

                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="block w-full text-sm text-slate-600
                  file:mr-4 file:rounded-lg file:border-0
                  file:bg-indigo-50 file:px-4 file:py-2
                  file:text-sm file:font-medium
                  file:text-indigo-700 hover:file:bg-indigo-100"
                />

                {previewImage && (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="mt-4 h-28 w-28 rounded-xl border border-slate-200 object-cover shadow-sm"
                  />
                )}
              </div>

              {/* ACTIVE */}
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />

                <span className="text-sm font-medium text-slate-800">
                  Active — visible to customers
                </span>
              </label>
            </section>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => navigate(ap("gift"))}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEdit ? (
                  "Save Changes"
                ) : (
                  "Create Gift Card"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default GiftCardForm;
