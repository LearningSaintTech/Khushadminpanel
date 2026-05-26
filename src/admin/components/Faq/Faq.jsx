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

  // ================= FETCH FAQS =================
  const fetchFaqs = async () => {
    try {
      setLoading(true);

      const response = await getAllFaqs();

      console.log("FULL FAQ RESPONSE:", response);

      // IMPORTANT FIX
      const faqData =
        response?.data?.faqs ||
        response?.data?.data?.faqs ||
        [];

      console.log("FAQ ARRAY:", faqData);

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

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "order"
          ? Number(value)
          : value,
    }));
  };

  // ================= RESET FORM =================
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

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      let response;

      if (editingFaq) {
        response = await updateFaq(
          editingFaq._id,
          formData
        );
      } else {
        response = await createFaq(formData);
      }

      console.log("SUBMIT RESPONSE:", response);

      alert(
        editingFaq
          ? "FAQ Updated Successfully"
          : "FAQ Created Successfully"
      );

      resetForm();

      fetchFaqs();
    } catch (error) {
      console.error("SUBMIT ERROR:", error);

      alert(
        error?.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= EDIT =================
  const handleEdit = (faq) => {
    setEditingFaq(faq);

    setFormData({
      question: faq.question || "",
      answer: faq.answer || "",
      topic: faq.topic || "",
      order: faq.order || 0,
      isActive: faq.isActive || false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this FAQ?"
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      await deleteFaq(id);

      alert("FAQ Deleted Successfully");

      fetchFaqs();
    } catch (error) {
      console.error("DELETE ERROR:", error);

      alert(
        error?.response?.data?.message ||
          "Failed to delete FAQ"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              FAQ Management
            </h1>

            <p className="text-gray-500 mt-2">
              Manage all FAQs
            </p>
          </div>

          <div className="bg-white px-6 py-4 rounded-2xl shadow">
            <p className="text-sm text-gray-500">
              Total FAQs
            </p>

            <h2 className="text-3xl font-bold">
              {faqs.length}
            </h2>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {editingFaq
              ? "Update FAQ"
              : "Create FAQ"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="md:col-span-2">
              <label className="font-semibold block mb-2">
                Question
              </label>

              <input
                type="text"
                name="question"
                value={formData.question}
                onChange={handleChange}
                className="w-full border rounded-xl p-4"
                placeholder="Enter question"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold block mb-2">
                Answer
              </label>

              <textarea
                name="answer"
                value={formData.answer}
                onChange={handleChange}
                rows={5}
                className="w-full border rounded-xl p-4"
                placeholder="Enter answer"
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-2">
                Topic
              </label>

              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                className="w-full border rounded-xl p-4"
                placeholder="Delivery / Orders"
              />
            </div>

            <div>
              <label className="font-semibold block mb-2">
                Order
              </label>

              <input
                type="number"
                name="order"
                value={formData.order}
                onChange={handleChange}
                className="w-full border rounded-xl p-4"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />

              <label>Active FAQ</label>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="bg-black text-white px-8 py-4 rounded-xl"
              >
                {loading
                  ? "Please wait..."
                  : editingFaq
                  ? "Update FAQ"
                  : "Create FAQ"}
              </button>

              {editingFaq && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 px-8 py-4 rounded-xl"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* FAQ TABLE */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">
              All FAQs
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              Loading...
            </div>
          ) : faqs.length === 0 ? (
            <div className="p-10 text-center text-red-500">
              No FAQs Found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-5">
                    Question
                  </th>

                  <th className="text-left p-5">
                    Topic
                  </th>

                  <th className="text-left p-5">
                    Order
                  </th>

                  <th className="text-left p-5">
                    Status
                  </th>

                  <th className="text-left p-5">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {faqs.map((faq) => (
                  <tr
                    key={faq._id}
                    className="border-t"
                  >
                    <td className="p-5">
                      <div className="font-semibold">
                        {faq.question}
                      </div>

                      <div className="text-sm text-gray-500 mt-1">
                        {faq.answer}
                      </div>
                    </td>

                    <td className="p-5">
                      {faq.topic}
                    </td>

                    <td className="p-5">
                      #{faq.order}
                    </td>

                    <td className="p-5">
                      {faq.isActive
                        ? "Active"
                        : "Inactive"}
                    </td>

                    <td className="p-5">
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            handleEdit(faq)
                          }
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(faq._id)
                          }
                          className="bg-red-500 text-white px-4 py-2 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Faq;