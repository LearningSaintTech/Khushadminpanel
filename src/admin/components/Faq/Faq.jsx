import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Save,
} from "lucide-react";
import {
  createFaq,
  getAllFaqs,
  updateFaq,
  deleteFaq,
} from "../../apis/FaqApi";

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition disabled:opacity-50";
const labelClass = "mb-1 block text-[11px] font-medium text-slate-700";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
const btnOutline =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const emptyForm = {
  question: "",
  answer: "",
  topic: "",
  order: 0,
  isActive: true,
};

const Faq = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingFaq, setEditingFaq] = useState(null);
  const [topicFilter, setTopicFilter] = useState("");

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const response = await getAllFaqs();
      const faqData =
        response?.data?.faqs ||
        response?.data?.data?.faqs ||
        response?.data ||
        [];
      setFaqs(Array.isArray(faqData) ? faqData : []);
    } catch (error) {
      console.error("FETCH FAQ ERROR:", error);
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const topics = [...new Set(faqs.map((f) => f.topic).filter(Boolean))].sort();

  const visibleFaqs = topicFilter
    ? faqs.filter((f) => String(f.topic || "") === topicFilter)
    : faqs;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "order"
            ? Number(value) || 0
            : value,
    }));
  };

  const resetForm = () => {
    setEditingFaq(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingFaq) {
        await updateFaq(editingFaq._id, formData);
        toast.success("FAQ updated");
      } else {
        await createFaq(formData);
        toast.success("FAQ created");
      }
      resetForm();
      fetchFaqs();
    } catch (error) {
      console.error("SUBMIT ERROR:", error);
      toast.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question || "",
      answer: faq.answer || "",
      topic: faq.topic || "",
      order: faq.order || 0,
      isActive: faq.isActive ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try {
      setSaving(true);
      await deleteFaq(id);
      toast.success("FAQ deleted");
      if (editingFaq?._id === id) resetForm();
      fetchFaqs();
    } catch (error) {
      console.error("DELETE ERROR:", error);
      toast.error(error?.response?.data?.message || "Failed to delete FAQ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className={`${inputClass} w-full sm:w-40`}
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button type="button" onClick={fetchFaqs} className={btnOutline} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
      </div>

      <main className="mx-auto grid w-full max-w-[1400px] gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-1 lg:sticky lg:top-[4.5rem] lg:self-start">
          <h2 className="text-xs font-semibold text-slate-800">
            {editingFaq ? "Edit FAQ" : "Add FAQ"}
          </h2>
          <p className="mt-0.5 mb-3 text-[10px] text-slate-500">
            {editingFaq ? "Update question and answer" : "New entry for the help center"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelClass}>Question *</label>
              <input
                type="text"
                name="question"
                value={formData.question}
                onChange={handleChange}
                className={inputClass}
                placeholder="How do I track my order?"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Answer *</label>
              <textarea
                name="answer"
                value={formData.answer}
                onChange={handleChange}
                rows={4}
                className={`${inputClass} resize-y min-h-[88px]`}
                placeholder="You can track your order from My Orders…"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Topic</label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Orders, Shipping…"
                />
              </div>
              <div>
                <label className={labelClass}>Display order</label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  className={inputClass}
                  min={0}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Active (visible to users)
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editingFaq ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {editingFaq ? "Update" : "Create"}
              </button>
              {editingFaq && (
                <button type="button" onClick={resetForm} className={btnOutline}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-xs font-semibold text-slate-800">All FAQs</h2>
              <p className="text-[10px] text-slate-500">
                {visibleFaqs.length} of {faqs.length} entries
              </p>
            </div>
          </div>

          {loading && faqs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Loading…
            </div>
          ) : visibleFaqs.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs text-slate-500">
              No FAQs yet. Add one using the form.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90">
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Question
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Topic
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Order
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleFaqs.map((faq) => (
                    <tr key={faq._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-3 py-2 align-top max-w-[280px]">
                        <p className="text-[11px] font-medium text-slate-900 leading-snug">
                          {faq.question}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
                          {faq.answer}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        {faq.topic ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {faq.topic}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] tabular-nums text-slate-600">
                        {faq.order ?? 0}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            faq.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {faq.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(faq)}
                            className="rounded p-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(faq._id)}
                            disabled={saving}
                            className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Faq;
