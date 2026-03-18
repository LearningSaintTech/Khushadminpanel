import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { driverGetProfile, driverUpdateProfile } from "../../apis/driverApi";

const formatDateForInput = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    pinCode: "",
    licenseNumber: "",
    licenseExpiry: "",
    bikeNumber: "",
    bikeModel: "",
    bikeBrand: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [licenseImageFile, setLicenseImageFile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    driverGetProfile()
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res ?? {};
        setProfile(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          pinCode: data.pinCode ? String(data.pinCode) : "",
          licenseNumber: data.licenseNumber ?? "",
          licenseExpiry: formatDateForInput(data.licenseExpiry),
          bikeNumber: data.bikeNumber ?? "",
          bikeModel: data.bikeModel ?? "",
          bikeBrand: data.bikeBrand ?? "",
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(typeof err === "string" ? err : "Failed to load profile");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.licenseNumber?.trim()) {
      setError("License number is required");
      return;
    }
    if (!form.bikeNumber?.trim()) {
      setError("Bike number is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      if (form.email?.trim()) fd.append("email", form.email.trim());
      if (form.address?.trim()) fd.append("address", form.address.trim());
      if (form.city?.trim()) fd.append("city", form.city.trim());
      if (form.pinCode?.trim()) fd.append("pinCode", form.pinCode.trim());
      fd.append("licenseNumber", form.licenseNumber.trim());
      if (form.licenseExpiry) fd.append("licenseExpiry", form.licenseExpiry);
      fd.append("bikeNumber", form.bikeNumber.trim());
      if (form.bikeModel?.trim()) fd.append("bikeModel", form.bikeModel.trim());
      if (form.bikeBrand?.trim()) fd.append("bikeBrand", form.bikeBrand.trim());
      if (profileImageFile) fd.append("profileImage", profileImageFile);
      if (licenseImageFile) fd.append("licenseImage", licenseImageFile);

      await driverUpdateProfile(fd);
      navigate("/driver/profile", { replace: true });
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 text-gray-700 text-2xl font-light"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold mx-auto tracking-wide">EDIT PROFILE</h1>
        </div>
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 text-gray-700 text-2xl font-light"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold mx-auto tracking-wide">EDIT PROFILE</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => navigate("/driver/profile")}
            className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const profileImagePreview =
    profileImageFile
      ? URL.createObjectURL(profileImageFile)
      : profile?.profileImage || "https://i.pravatar.cc/120";

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 relative shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 text-gray-700 text-2xl font-light"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold mx-auto tracking-wide">EDIT PROFILE</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-auto px-4 py-6 pb-24">
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <label className="relative block">
              <img
                src={profileImagePreview}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
              <span className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1.5">
                <Camera size={14} />
              </span>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                onChange={(e) => setProfileImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs text-gray-500">Change profile photo</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Street, area"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.pinCode}
                onChange={(e) => handleChange("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Pincode"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License number *</label>
            <input
              type="text"
              value={form.licenseNumber}
              onChange={(e) => handleChange("licenseNumber", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="License number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License expiry</label>
            <input
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => handleChange("licenseExpiry", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bike number *</label>
            <input
              type="text"
              value={form.bikeNumber}
              onChange={(e) => handleChange("bikeNumber", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g. AB12CD1234"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bike brand</label>
              <input
                type="text"
                value={form.bikeBrand}
                onChange={(e) => handleChange("bikeBrand", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bike model</label>
              <input
                type="text"
                value={form.bikeModel}
                onChange={(e) => handleChange("bikeModel", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Model"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLicenseImageFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-black file:text-white file:text-sm"
            />
            {profile?.licenseImage && !licenseImageFile && (
              <p className="text-xs text-gray-500 mt-1">Current image on file. Choose a new file to replace.</p>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full h-12 bg-black text-white rounded-xl font-medium disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/driver/profile")}
          className="mt-3 w-full h-12 border border-gray-300 text-gray-700 rounded-xl font-medium"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
