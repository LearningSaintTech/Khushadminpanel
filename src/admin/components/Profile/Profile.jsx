import React, { useState, useEffect } from "react";
import { getUserProfile, updateProfile } from "../../apis/Authapi";
import { toast } from "react-toastify";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    countryCode: "+91",
    phoneNumber: "",
    address: "",
    city: "",
    pinCode: "",
    profileImage: null,
  });

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getUserProfile();
        console.log("Profile API Response:", res);

        if (res?.success) {
          const user = res.data;

          setProfile(user);

          setFormData({
            name: user.name || "",
            countryCode: user.countryCode || "+91",
            phoneNumber: user.phoneNumber || "",
            address: user.address || "",
            city: user.city || "",
            pinCode: user.pinCode || "",
            profileImage: null,
          });

          setImagePreview(user.profileImage || null);
        } else {
          toast.error("Failed to load profile");
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        toast.error("Error fetching profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({ ...prev, profileImage: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("countryCode", formData.countryCode);
      payload.append("phoneNumber", formData.phoneNumber);
      payload.append("address", formData.address);
      payload.append("city", formData.city);
      payload.append("pinCode", formData.pinCode);
      if (formData.profileImage) {
        payload.append("profileImage", formData.profileImage);
      }

      const res = await updateProfile(payload);

      if (res?.data?.success) {
        toast.success("Profile updated successfully");
        const updatedUser = res.data.data;
        setProfile(updatedUser);
        setImagePreview(updatedUser.profileImage || null);
        setIsEditing(false);
      } else {
        toast.error(res?.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error("Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-lg font-medium text-gray-600 animate-pulse">
          Loading your profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500 text-xl font-light">
          Profile not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-100/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/* Header */}
          <div className="relative px-8 pt-10 pb-6 bg-gradient-to-r from-gray-900/5 to-transparent">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                My Profile
              </h1>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm hover:shadow"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Profile Picture */}
          <div className="flex justify-center -mt-16 mb-8 px-8">
            <div className="relative group">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-4xl font-semibold shadow-xl border-4 border-white">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              )}

              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <svg
                    className="w-5 h-5 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </label>
              )}
            </div>
          </div>

          {/* Content */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow"
                  placeholder="Full Name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country Code
                  </label>
                  <input
                    type="text"
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  placeholder="Address"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pin Code
                  </label>
                  <input
                    type="number"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 px-6 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-6 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="px-8 pb-10">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-gray-700">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-gray-900 font-medium">{profile.name}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-gray-900 font-medium">
                    {profile.countryCode} {profile.phoneNumber}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-gray-900 font-medium">{profile.role}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        profile.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {profile.isActive ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Number Verified
                  </dt>
                  <dd className="mt-1 text-gray-900 font-medium">
                    {profile.isNumberVerified ? "Yes" : "No"}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-gray-900">
                    {profile.address || "Not added"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">City</dt>
                  <dd className="mt-1 text-gray-900">
                    {profile.city || "Not added"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Pin Code</dt>
                  <dd className="mt-1 text-gray-900">
                    {profile.pinCode || "Not added"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Created
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;