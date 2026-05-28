import React, { useEffect, useState } from "react";
import {
  createFaq,
  getAllFaqs,
  updateFaq,
  deleteFaq,
} from "../../apis/FaqApi";

const Faq = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    topic: "",
    order: 0,
    isActive: true,
  });

  const [editingFaq, setEditingFaq] = useState(null);

  // Fetch FAQs
  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const response = await getAllFaqs();

      const faqData =
        response?.data?.faqs ||
        response?.data?.data?.faqs ||
        response?.data ||
        [];

      setFaqs(faqData);
    } catch (error) {
      console.error("FETCH FAQ ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

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
    setFormData({
      question: "",
      answer: "",
      topic: "",
      order: 0,
      isActive: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingFaq) {
        await updateFaq(editingFaq._id, formData);
        alert("FAQ Updated Successfully");
      } else {
        await createFaq(formData);
        alert("FAQ Created Successfully");
      }

      resetForm();
      fetchFaqs();
    } catch (error) {
      console.error("SUBMIT ERROR:", error);
      alert(error?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
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
    if (!window.confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      setLoading(true);
      await deleteFaq(id);
      alert("FAQ Deleted Successfully");
      fetchFaqs();
    } catch (error) {
      console.error("DELETE ERROR:", error);
      alert(error?.response?.data?.message || "Failed to delete FAQ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900">FAQ Management</h1>
            <p className="text-gray-600 mt-1">Create, edit, and organize your frequently asked questions</p>
          </div>

          <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">Total FAQs</p>
              <p className="text-3xl font-semibold text-gray-900">{faqs.length}</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">
            {editingFaq ? "Edit FAQ" : "Add New FAQ"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <input
                type="text"
                name="question"
                value={formData.question}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-all"
                placeholder="How do I track my order?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
              <textarea
                name="answer"
                value={formData.answer}
                onChange={handleChange}
                rows={6}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-all resize-y"
                placeholder="You can track your order from the My Orders section..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topic / Category</label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="Orders, Shipping, Returns"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-5 h-5 accent-black rounded"
                  />
                  <span className="font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-medium transition-all active:scale-[0.97] disabled:opacity-70"
              >
                {loading
                  ? "Saving..."
                  : editingFaq
                  ? "Update FAQ"
                  : "Create FAQ"}
              </button>

              {editingFaq && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-gray-300 hover:bg-gray-50 px-8 py-4 rounded-2xl font-medium transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* FAQs Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between bg-gray-50">
            <h2 className="text-2xl font-semibold text-gray-900">All FAQs</h2>
            <p className="text-sm text-gray-500">{faqs.length} entries</p>
          </div>

          {loading && faqs.length === 0 ? (
            <div className="py-20 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading FAQs...</p>
            </div>
          ) : faqs.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No FAQs available yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-6 font-medium text-gray-600">Question</th>
                    <th className="text-left p-6 font-medium text-gray-600">Topic</th>
                    <th className="text-left p-6 font-medium text-gray-600">Order</th>
                    <th className="text-left p-6 font-medium text-gray-600">Status</th>
                    <th className="text-right p-6 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {faqs.map((faq) => (
                    <tr key={faq._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-6 max-w-md">
                        <div className="font-medium text-gray-900 leading-relaxed">
                          {faq.question}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-2 mt-2">
                          {faq.answer}
                        </div>
                      </td>

                      <td className="p-6 text-gray-600">
                        {faq.topic ? (
                          <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">
                            {faq.topic}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="p-6 font-mono text-gray-600">#{faq.order}</td>

                      <td className="p-6">
                        <span
                          className={`inline-flex px-4 py-1.5 text-xs font-medium rounded-full ${
                            faq.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {faq.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-6 text-right">
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="px-5 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-white hover:shadow transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(faq._id)}
                            className="px-5 py-2.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                          >
                            Delete
                          </button>
                        </div>
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

export default Faq;