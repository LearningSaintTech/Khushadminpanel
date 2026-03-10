// src/admin/pages/BannerForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createBanner, updateBanner, getSingleBanner } from "../../apis/homebannerapi";

const BannerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("PROMO");
  const [discountType, setDiscountType] = useState("PERCENT");
  const [discount, setDiscount] = useState(0);
  const [navigation, setNavigation] = useState("");
  const [desktopBanner, setDesktopBanner] = useState(null);
  const [mobileBanner, setMobileBanner] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch existing banner data when editing
  useEffect(() => {
    if (!id) return;

    const fetchBanner = async () => {
      setLoading(true);
      try {
        const data = await getSingleBanner(id);
        const banner = data.data || {};
        
        setTitle(banner.title || "");
        setText(banner.text || "");
        setType(banner.type || "PROMO");
        setDiscountType(banner.discountType || "PERCENT");
        setDiscount(banner.discount || 0);
        setNavigation(banner.navigation?.navigate || "");
        setDesktopPreview(banner.desktopBanner?.url || null);
        setMobilePreview(banner.mobileBanner?.url || null);
      } catch (error) {
        console.error("Failed to fetch banner:", error);
        alert(error.message || "Could not load banner data");
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !text.trim() || !navigation.trim()) {
      alert("Please fill in all required fields (Title, Text, Navigation)");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("text", text.trim());
    formData.append("type", type);
    formData.append("discountType", discountType);
    formData.append("discount", discount);
    formData.append("navigation.navigate", navigation.trim());

    if (desktopBanner) formData.append("desktopBanner", desktopBanner);
    if (mobileBanner) formData.append("mobileBanner", mobileBanner);

    setLoading(true);
    try {
      if (id) {
        await updateBanner(id, formData);
        alert("Banner updated successfully!");
      } else {
        await createBanner(formData);
        alert("Banner created successfully!");
      }
      navigate("/admin/splash");
    } catch (error) {
      console.error("Failed to save banner:", error);
      alert(error.message || "Failed to save banner");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/splash")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors duration-200"
            >
              ← Back
            </button>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {id ? "Edit Banner" : "Create New Banner"}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                placeholder="Enter banner title"
                required
              />
            </div>

            {/* Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Text / Subtitle <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                placeholder="Short description or tagline"
                required
              />
            </div>

            {/* Type & Discount Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Banner Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                >
                  <option value="PROMO">PROMO</option>
                  <option value="PERCENT">PERCENT</option>
                  <option value="FLAT">FLAT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                >
                  <option value="PERCENT">PERCENT</option>
                  <option value="FLAT">FLAT</option>
                </select>
              </div>
            </div>

            {/* Discount & Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Discount Value
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Navigation (Product/Category ID) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={navigation}
                  onChange={(e) => setNavigation(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  placeholder="e.g. 69955cebfbdfe995e07c65"
                  required
                />
              </div>
            </div>

            {/* Image Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desktop Banner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Desktop Banner (recommended: 1920×600 or similar)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setDesktopBanner, setDesktopPreview)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                />
                {desktopPreview && (
                  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={desktopPreview}
                      alt="Desktop preview"
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
              </div>

              {/* Mobile Banner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mobile Banner (recommended: 800×600 or similar)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setMobileBanner, setMobilePreview)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                />
                {mobilePreview && (
                  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={mobilePreview}
                      alt="Mobile preview"
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Form Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black hover:bg-gray-800 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : id ? "Update Banner" : "Create Banner"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/splash")}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 px-6 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BannerForm;