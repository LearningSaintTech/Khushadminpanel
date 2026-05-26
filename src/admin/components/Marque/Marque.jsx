import React, { useEffect, useState } from "react";
import {
  createMarqueHeading,
  deleteMarqueHeading,
  getAllMarqueHeadings,
  updateMarqueHeadingItem,
} from "../../apis/Marqueapi";

import {
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Loader2,
  Save,
  X,
  Image as ImageIcon,
} from "lucide-react";

import toast from "react-hot-toast";

const initialForm = {
  order: "",
  text: "",
  icon: null,
};

export default function Marque() {
  const [marqueHeadings, setMarqueHeadings] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [createLoading, setCreateLoading] =
    useState(false);

  const [editLoading, setEditLoading] =
    useState(false);

  const [deleteLoading, setDeleteLoading] =
    useState(null);

  const [formData, setFormData] =
    useState(initialForm);

  const [editingItem, setEditingItem] =
    useState(null);

  const [orderFilter, setOrderFilter] =
    useState("");

  // ================= FETCH =================

  const fetchMarqueHeadings = async () => {
    try {
      setLoading(true);

      const response =
        await getAllMarqueHeadings(
          orderFilter
        );

      console.log(
        "GET ALL MARQUE HEADINGS RESPONSE:",
        response
      );

      const data =
        response?.data?.headings || [];

      setMarqueHeadings(data);
    } catch (error) {
      console.error(
        "FETCH ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to fetch marque headings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarqueHeadings();
  }, [orderFilter]);

  // ================= HANDLE CHANGE =================

  const handleChange = (e) => {
    const { name, value, files } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: files
        ? files[0]
        : value,
    }));
  };

  // ================= CREATE =================

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      setCreateLoading(true);

      const formDataToSend =
        new FormData();

      formDataToSend.append(
        "order",
        formData.order
      );

      formDataToSend.append(
        "headings",
        JSON.stringify([
          {
            text: formData.text,
          },
        ])
      );

      if (formData.icon) {
        formDataToSend.append(
          "icons",
          formData.icon
        );
      }

      console.log(
        "CREATE PAYLOAD:",
        {
          order: formData.order,
          headings:
            JSON.stringify([
              {
                text:
                  formData.text,
              },
            ]),
          icon: formData.icon,
        }
      );

      await createMarqueHeading(
        formDataToSend
      );

      toast.success(
        "Marque heading created successfully"
      );

      setFormData(initialForm);

      fetchMarqueHeadings();
    } catch (error) {
      console.error(
        "CREATE ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Create failed"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // ================= EDIT CLICK =================

  const handleEditClick = (
    item,
    documentId,
    order
  ) => {
    setEditingItem({
      documentId,
    });

    setFormData({
      order: order || "",
      text: item?.text || "",
      icon: null,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ================= UPDATE =================

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setEditLoading(true);

      const formDataToSend =
        new FormData();

      // REQUIRED
      formDataToSend.append(
        "text",
        formData.text
      );

      // OPTIONAL
      formDataToSend.append(
        "order",
        formData.order
      );

      // OPTIONAL ICON
      if (formData.icon) {
        formDataToSend.append(
          "icon",
          formData.icon
        );
      }

      console.log(
        "UPDATE PAYLOAD:",
        {
          text: formData.text,
          order: formData.order,
          icon: formData.icon,
        }
      );

      await updateMarqueHeadingItem(
        editingItem.documentId,
        formDataToSend
      );

      toast.success(
        "Marque heading updated successfully"
      );

      setEditingItem(null);

      setFormData(initialForm);

      fetchMarqueHeadings();
    } catch (error) {
      console.error(
        "UPDATE ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Update failed"
      );
    } finally {
      setEditLoading(false);
    }
  };

  // ================= DELETE =================

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this marque heading?"
      );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(id);

      await deleteMarqueHeading(id);

      toast.success(
        "Marque heading deleted successfully"
      );

      fetchMarqueHeadings();
    } catch (error) {
      console.error(
        "DELETE ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Delete failed"
      );
    } finally {
      setDeleteLoading(null);
    }
  };

  // ================= CANCEL EDIT =================

  const handleCancelEdit = () => {
    setEditingItem(null);

    setFormData(initialForm);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ================= HEADER ================= */}

        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Marque Heading
              Management
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage marquee
              announcement headings
              professionally.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={orderFilter}
              onChange={(e) =>
                setOrderFilter(
                  e.target.value
                )
              }
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
            >
              <option value="">
                Default Order
              </option>

              <option value="asc">
                Ascending
              </option>

              <option value="desc">
                Descending
              </option>
            </select>

            <button
              onClick={
                fetchMarqueHeadings
              }
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* ================= CONTENT ================= */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ================= FORM ================= */}

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingItem
                  ? "Update Heading"
                  : "Create Heading"}
              </h2>
            </div>

            <form
              onSubmit={
                editingItem
                  ? handleUpdate
                  : handleCreate
              }
              className="space-y-5"
            >
              {/* ORDER */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Order
                </label>

                <input
                  type="number"
                  name="order"
                  value={
                    formData.order
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter order"
                  required
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none"
                />
              </div>

              {/* TEXT */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Heading Text
                </label>

                <input
                  type="text"
                  name="text"
                  value={
                    formData.text
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter marquee text"
                  required
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none"
                />
              </div>

              {/* ICON */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Upload Icon
                </label>

                <input
                  type="file"
                  name="icon"
                  accept="image/*"
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none"
                />
              </div>

              {/* PREVIEW */}

              {(formData.text ||
                formData.icon) && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-600">
                    Live Preview
                  </p>

                  <div className="flex items-center gap-3">
                    {formData.icon ? (
                      <img
                        src={URL.createObjectURL(
                          formData.icon
                        )}
                        alt="preview"
                        className="h-12 w-12 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-white">
                        <ImageIcon
                          size={20}
                        />
                      </div>
                    )}

                    <p className="font-medium text-gray-800">
                      {formData.text}
                    </p>
                  </div>
                </div>
              )}

              {/* BUTTONS */}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={
                    createLoading ||
                    editLoading
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 font-medium text-white"
                >
                  {createLoading ||
                  editLoading ? (
                    <Loader2
                      className="animate-spin"
                      size={18}
                    />
                  ) : editingItem ? (
                    <Save size={18} />
                  ) : (
                    <Plus size={18} />
                  )}

                  {editingItem
                    ? "Update Heading"
                    : "Create Heading"}
                </button>

                {editingItem && (
                  <button
                    type="button"
                    onClick={
                      handleCancelEdit
                    }
                    className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-5 py-3 font-medium text-gray-700"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ================= TABLE ================= */}

          <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                All Marque Headings
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Total Records:{" "}
                {
                  marqueHeadings?.length
                }
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2
                  className="animate-spin"
                  size={40}
                />
              </div>
            ) : marqueHeadings?.length ===
              0 ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50">
                No Data Found
              </div>
            ) : (
              <div className="space-y-5">
                {marqueHeadings?.map(
                  (item, index) => {
                    const documentId =
                      item?._id;

                    const headings =
                      item?.headings ||
                      [];

                    return (
                      <div
                        key={
                          documentId
                        }
                        className="rounded-3xl border border-gray-200"
                      >
                        {/* TOP */}

                        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                          <h3 className="font-semibold text-gray-800">
                            Marque Group #
                            {index + 1}
                          </h3>

                          <p className="text-sm text-gray-500">
                            Order:{" "}
                            {
                              item?.order
                            }
                          </p>
                        </div>

                        {/* ITEMS */}

                        <div className="divide-y divide-gray-200">
                          {headings?.map(
                            (
                              headingItem,
                              itemIndex
                            ) => (
                              <div
                                key={
                                  itemIndex
                                }
                                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="flex items-center gap-4">
                                  {headingItem?.icon ? (
                                    <img
                                      src={
                                        headingItem.icon
                                      }
                                      alt="icon"
                                      className="h-14 w-14 rounded-2xl border object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-gray-100">
                                      <ImageIcon
                                        size={
                                          20
                                        }
                                      />
                                    </div>
                                  )}

                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {
                                        headingItem?.text
                                      }
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() =>
                                      handleEditClick(
                                        headingItem,
                                        documentId,
                                        item?.order
                                      )
                                    }
                                    className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium"
                                  >
                                    <Pencil
                                      size={16}
                                    />
                                    Edit
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        documentId
                                      )
                                    }
                                    disabled={
                                      deleteLoading ===
                                      documentId
                                    }
                                    className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white"
                                  >
                                    {deleteLoading ===
                                    documentId ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={16}
                                      />
                                    ) : (
                                      <Trash2
                                        size={16}
                                      />
                                    )}

                                    Delete
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}