import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Save,
  HelpCircle,
} from "lucide-react";
import {
  createFaq,
  getAllFaqs,
  updateFaq,
  deleteFaq,
} from "../../apis/FaqApi";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";
const inputToolbar =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const emptyForm = {
  question: "",
  answer: "",
  topic: "",
  order: 0,
  isActive: true,
};

function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-2.5 border-b border-border pb-2">
        <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-stone-500">{hint}</p> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

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

  const topics = useMemo(
    () => [...new Set(faqs.map((f) => f.topic).filter(Boolean))].sort(),
    [faqs],
  );

  const visibleFaqs = useMemo(
    () =>
      topicFilter
        ? faqs.filter((f) => String(f.topic || "") === topicFilter)
        : faqs,
    [faqs, topicFilter],
  );

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
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          FAQs
        </h1>
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className={`${inputToolbar} min-w-[120px] max-w-[160px]`}
          aria-label="Filter by topic"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchFaqs}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {!editingFaq ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFormData(emptyForm);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add FAQ
          </button>
        ) : null}
      </div>

      <div className="grid w-full gap-3 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
        <div className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <FormSection
            title={editingFaq ? "Edit FAQ" : "Add FAQ"}
            hint={
              editingFaq
                ? "Update question and answer"
                : "New entry for the help center"
            }
          >
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <Field label="Question" required>
                <input
                  type="text"
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="How do I track my order?"
                  required
                />
              </Field>
              <Field label="Answer" required>
                <textarea
                  name="answer"
                  value={formData.answer}
                  onChange={handleChange}
                  rows={4}
                  className={`${fieldClass} min-h-[88px] resize-y`}
                  placeholder="You can track your order from My Orders…"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Topic">
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Orders, Shipping…"
                  />
                </Field>
                <Field label="Display order">
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleChange}
                    className={fieldClass}
                    min={0}
                  />
                </Field>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] font-medium text-stone-700">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                />
                Active (visible to users)
              </label>
              <div className="flex flex-wrap gap-2 border-t border-border pt-2.5">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : editingFaq ? (
                    <Save className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {editingFaq ? "Update" : "Create"}
                </button>
                {editingFaq ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-canvas-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </FormSection>
        </div>

        <section className="min-w-0">
          <p className="mb-1 text-[10px] text-stone-500">
            {visibleFaqs.length} of {faqs.length} entries
            {topicFilter ? ` · topic: ${topicFilter}` : ""}
          </p>

          {loading && faqs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-12 text-[11px] text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Loading…
            </div>
          ) : visibleFaqs.length === 0 ? (
            <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
              <HelpCircle className="mx-auto mb-2 h-8 w-8 text-stone-300" />
              <p className="text-[11px] font-medium text-stone-600">No FAQs yet</p>
              <p className="mt-1 text-[10px] text-stone-500">Add one using the form</p>
            </div>
          ) : (
            <div className={tableScrollShell}>
              <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                  <tr>
                    <th className="w-10 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      #
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Question
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Topic
                    </th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Order
                    </th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Status
                    </th>
                    <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFaqs.map((faq, idx) => (
                    <tr
                      key={faq._id}
                      className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                        {idx + 1}
                      </td>
                      <td className="max-w-[280px] px-2 py-2 align-top">
                        <p className="font-medium leading-snug text-stone-900">{faq.question}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] text-stone-500">{faq.answer}</p>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top">
                        {faq.topic ? (
                          <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                            {faq.topic}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-stone-600">
                        {faq.order ?? 0}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            faq.isActive
                              ? "bg-success-bg text-success"
                              : "bg-canvas-muted text-stone-600"
                          }`}
                        >
                          {faq.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(faq)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            title="Edit"
                            aria-label="Edit FAQ"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(faq._id)}
                            disabled={saving}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-40"
                            title="Delete"
                            aria-label="Delete FAQ"
                          >
                            <Trash2 size={13} />
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
      </div>
    </div>
  );
};

export default Faq;
