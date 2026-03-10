// BannerForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createFeaturedImage,
  updateFeaturedImage,
  getFeaturedImageById,
} from "../../apis/Bannerapi";

const BannerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    file: null,
    preview: null,
    fileType: null,
    heading: "",
    subHeading: "",
    page: "home",
  });

  // ✅ LOAD SINGLE BANNER (EDIT MODE)
  useEffect(() => {
    if (!isEdit) return;
  
    const loadBanner = async () => {
      try {
        setLoading(true);
  
        const response = await getFeaturedImageById(id);
        console.log("📦 Banner Response:", response);
  
        const banner =
          response?.data?.data ||
          response?.data ||
          response;
  
        if (!banner || !banner._id) {
          console.warn("⚠️ Banner not found:", id);
          return;
        }
  
        const previewUrl = banner.url || null;
  
        const fileType =
          previewUrl?.match(/\.(mp4|webm|mov)$/i)
            ? "video"
            : previewUrl
            ? "image"
            : null;
  
        setForm({
          file: null,
          preview: previewUrl,
          fileType,
          heading: banner.heading || "",
          subHeading: banner.subHeading || "",
          page: banner.page || "home",
        });
  
      } catch (err) {
        console.error("❌ Error loading banner:", err);
        alert("Failed to load banner");
      } finally {
        setLoading(false);
      }
    };
  
    loadBanner();
  }, [id, isEdit]);
  

  // ✅ FILE CHANGE
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileType = selectedFile.type.startsWith("video/")
      ? "video"
      : selectedFile.type.startsWith("image/")
      ? "image"
      : null;

    if (!fileType) {
      alert("Please select an image or video file");
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);

    setForm((prev) => ({
      ...prev,
      file: selectedFile,
      preview: previewUrl,
      fileType,
    }));
  };

  // ✅ TEXT CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ SUBMIT (CREATE + UPDATE)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("heading", form.heading);
    formData.append("subHeading", form.subHeading);
    formData.append("page", form.page);

    if (form.file) {
      formData.append("file", form.file);
    }

    try {
      setLoading(true);

      if (isEdit) {
        await updateFeaturedImage(id, formData);
        alert("Banner updated successfully!");
      } else {
        if (!form.file) {
          alert("Please upload a file");
          return;
        }
        await createFeaturedImage(formData);
        alert("Banner created successfully!");
      }

      navigate("/admin/banners");

    } catch (err) {
      console.error("❌ Error saving banner:", err);

      if (err.response?.status === 404) {
        alert("Endpoint not found.");
      } else if (err.response?.status === 413) {
        alert("File too large.");
      } else {
        alert("Something went wrong.");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header with Back Button and Title on Right */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/banners")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? "Edit Banner" : "Create Banner"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Update banner information" : "Add a new banner"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* FILE UPLOAD */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Image / Video {isEdit && "(optional)"}
              </label>

              {form.preview && (
                <div className="mb-4">
                  {form.fileType === "video" ? (
                    <video
                      src={form.preview}
                      controls
                      className="max-h-64 w-full object-contain rounded border p-2"
                    />
                  ) : (
                    <img
                      src={form.preview}
                      alt="Preview"
                      className="max-h-64 w-full object-contain rounded border p-2"
                    />
                  )}
                </div>
              )}

              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="w-full"
              />
            </div>

            {/* HEADING */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Main Heading
              </label>
              <input
                type="text"
                name="heading"
                value={form.heading}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {/* SUB HEADING */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Sub Heading
              </label>
              <input
                type="text"
                name="subHeading"
                value={form.subHeading}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {/* PAGE */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Page Location
              </label>
              <select
                name="page"
                value={form.page}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="home">Home Page</option>
                <option value="lock">Lock Screen</option>
                <option value="bottom">Bottom Banner</option>
              </select>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/admin/banners")}
                className="px-5 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : isEdit
                  ? "Update Banner"
                  : "Create Banner"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default BannerForm;
