import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createInfluencer,
  updateInfluencer,
  getInfluencerById,
} from "../../apis/Influencer";
import { ArrowLeft, Plus, X, Loader2, User, Mail, Phone, MapPin, Globe, Users, CheckCircle } from "lucide-react";

const InfluencerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: "",
    countryCode: "+91",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    pinCode: "",
    digitalSources: [],
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) fetchInfluencer();
  }, [id]);

  const fetchInfluencer = async () => {
    setFetching(true);
    try {
      const res = await getInfluencerById(id);
      if (res?.success) {
        setFormData({
          name: res.data.name || "",
          countryCode: res.data.countryCode || "+91",
          phoneNumber: res.data.phoneNumber || "",
          email: res.data.email || "",
          address: res.data.address || "",
          city: res.data.city || "",
          pinCode: res.data.pinCode || "",
          digitalSources: res.data.digitalSources || [],
        });
      } else {
        setError(res.message || "Failed to fetch influencer data");
      }
    } catch (err) {
      console.error("Fetch By ID Error:", err);
      setError("Failed to load influencer data");
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleDigitalChange = (index, field, value) => {
    const updated = [...formData.digitalSources];
    updated[index][field] = value;
    setFormData({ ...formData, digitalSources: updated });
  };

  const addDigitalSource = () => {
    setFormData({
      ...formData,
      digitalSources: [
        ...formData.digitalSources,
        {
          platform: "",
          handle: "",
          followers: "",
          verified: false,
          link: "",
        },
      ],
    });
  };

  const removeDigitalSource = (index) => {
    const updated = formData.digitalSources.filter((_, i) => i !== index);
    setFormData({ ...formData, digitalSources: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      if (id) {
        await updateInfluencer(id, formData);
      } else {
        await createInfluencer(formData);
      }
      navigate("/admin/influencer");
    } catch (err) {
      console.error("Submit Error:", err);
      setError(err?.response?.data?.message || "Failed to save influencer");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading influencer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/admin/influencer")}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Influencers
        </button>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 sm:px-8 sm:py-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {isEdit ? "Edit Influencer" : "Create Influencer"}
            </h2>
            <p className="text-indigo-100 mt-2">
              {isEdit
                ? "Update influencer information"
                : "Add a new influencer to your platform"}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      name="name"
                      placeholder="Enter name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="email"
                        type="email"
                        placeholder="Enter email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="countryCode"
                        placeholder="+91"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-24 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          name="phoneNumber"
                          type="tel"
                          placeholder="Enter phone number"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="city"
                        placeholder="Enter city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pin Code
                    </label>
                    <input
                      name="pinCode"
                      placeholder="Enter pin code"
                      value={formData.pinCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Digital Sources */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    Digital Sources
                  </h3>
                  <button
                    type="button"
                    onClick={addDigitalSource}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Platform
                  </button>
                </div>

                {formData.digitalSources.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-2">No digital sources added</p>
                    <p className="text-sm text-gray-500">
                      Click "Add Platform" to add social media profiles
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.digitalSources.map((src, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Platform {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDigitalSource(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                              Platform *
                            </label>
                            <input
                              placeholder="e.g., Instagram, YouTube"
                              value={src.platform}
                              onChange={(e) =>
                                handleDigitalChange(
                                  index,
                                  "platform",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                              Handle *
                            </label>
                            <input
                              placeholder="@username"
                              value={src.handle}
                              onChange={(e) =>
                                handleDigitalChange(index, "handle", e.target.value)
                              }
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                              Followers
                            </label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                placeholder="0"
                                value={src.followers}
                                onChange={(e) =>
                                  handleDigitalChange(
                                    index,
                                    "followers",
                                    e.target.value
                                  )
                                }
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                              Profile Link
                            </label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="url"
                                placeholder="https://..."
                                value={src.link}
                                onChange={(e) =>
                                  handleDigitalChange(index, "link", e.target.value)
                                }
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`verified-${index}`}
                            checked={src.verified}
                            onChange={(e) =>
                              handleDigitalChange(
                                index,
                                "verified",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <label
                            htmlFor={`verified-${index}`}
                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Verified Account
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate("/admin/influencer")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    "Update Influencer"
                  ) : (
                    "Create Influencer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfluencerForm;
