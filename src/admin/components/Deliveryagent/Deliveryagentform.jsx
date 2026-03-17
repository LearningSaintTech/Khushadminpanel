// src/admin/components/Deliveryagent/Deliveryagentform.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createDeliveryAgent,
  getDeliveryAgentById,
  updateDeliveryAgent,
} from "../../apis/Driverapi";
import { toast } from "react-toastify";

/** Extract backend error message from axios error, string (apiConnector reject), or any error. */
function getBackendErrorMessage(err, fallback = "Something went wrong") {
  if (err == null) return fallback;
  // apiConnector response interceptor rejects with a string message
  if (typeof err === "string" && err.trim()) return err.trim();
  const data = err?.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    return typeof first === "string" ? first : first?.msg || first?.message || fallback;
  }
  if (typeof data?.error === "string") return data.error;
  if (typeof err?.message === "string" && err.message) return err.message;
  return fallback;
}

/** Log backend error to console (everywhere). */
function logBackendError(context, err) {
  const msg = getBackendErrorMessage(err, "Unknown error");
  console.error(`[DeliveryAgentForm] ${context}:`, msg, err?.response?.data ?? err);
}

const defaultForm = {
  name: "",
  dob: "",
  countryCode: "+91",
  phoneNumber: "",
  email: "",
  address: "",
  city: "",
  pinCode: "",
  licenseNumber: "",
  licenseExpiry: "",
  bikeNumber: "",
  bikeModel: "",
  bikeBrand: "",
  isActive: true,
};

const DeliveryAgentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState(defaultForm);
  const [licenseImageFile, setLicenseImageFile] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [existingLicenseImageUrl, setExistingLicenseImageUrl] = useState("");
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState("");
  const [licensePreviewUrl, setLicensePreviewUrl] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      const loadAgent = async () => {
        try {
          const res = await getDeliveryAgentById(id);
          const raw = res?.data?.data || res?.data;
          const agent = raw?.deliveryAgent || raw;
          if (!agent) {
            console.warn("[DeliveryAgentForm] Load agent: response OK but no agent data", { id, raw: res?.data });
            toast.error("Agent not found");
            navigate("/admin/driver");
            return;
          }
          const formatDate = (val) => {
            if (!val) return "";
            const d = new Date(val);
            return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
          };
          setFormData({
            name: agent.name || "",
            dob: formatDate(agent.dob),
            countryCode: agent.countryCode || "+91",
            phoneNumber: agent.phoneNumber || "",
            email: agent.email || "",
            address: agent.address || "",
            city: agent.city || "",
            pinCode: agent.pinCode !== undefined && agent.pinCode !== "" ? String(agent.pinCode) : "",
            licenseNumber: agent.licenseNumber || "",
            licenseExpiry: formatDate(agent.licenseExpiry),
            bikeNumber: agent.bikeNumber || "",
            bikeModel: agent.bikeModel || "",
            bikeBrand: agent.bikeBrand || "",
            isActive: agent.isActive !== false,
          });
          setExistingLicenseImageUrl(agent.licenseImage?.trim() || "");
          setExistingProfileImageUrl(agent.profileImage?.trim() || "");
        } catch (err) {
          logBackendError("Load agent failed", err);
          toast.error(getBackendErrorMessage(err, "Failed to load agent data"));
          navigate("/admin/driver");
        } finally {
          setFetching(false);
        }
      };
      loadAgent();
    }
  }, [id, isEdit, navigate]);

  // Preview URLs for newly selected files; revoke on change/unmount
  useEffect(() => {
    if (licenseImageFile) {
      const url = URL.createObjectURL(licenseImageFile);
      setLicensePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setLicensePreviewUrl(null);
  }, [licenseImageFile]);

  useEffect(() => {
    if (profileImageFile) {
      const url = URL.createObjectURL(profileImageFile);
      setProfilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setProfilePreviewUrl(null);
  }, [profileImageFile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /** Build FormData so backend gets multipart and req.files is an array (avoids req.files.find on undefined). */
  const buildFormData = () => {
    const fd = new FormData();
    fd.append("name", formData.name?.trim() ?? "");
    fd.append("countryCode", formData.countryCode?.trim() || "+91");
    fd.append("phoneNumber", formData.phoneNumber?.trim() ?? "");
    fd.append("isActive", formData.isActive);
    if (formData.email?.trim()) fd.append("email", formData.email.trim());
    if (formData.address?.trim()) fd.append("address", formData.address.trim());
    if (formData.city?.trim()) fd.append("city", formData.city.trim());
    if (formData.pinCode) fd.append("pinCode", String(formData.pinCode));
    if (formData.licenseNumber?.trim()) fd.append("licenseNumber", formData.licenseNumber.trim());
    if (formData.bikeNumber?.trim()) fd.append("bikeNumber", formData.bikeNumber.trim());
    if (formData.bikeModel?.trim()) fd.append("bikeModel", formData.bikeModel.trim());
    if (formData.bikeBrand?.trim()) fd.append("bikeBrand", formData.bikeBrand.trim());
    if (formData.dob) fd.append("dob", new Date(formData.dob).toISOString());
    if (formData.licenseExpiry) fd.append("licenseExpiry", new Date(formData.licenseExpiry).toISOString());
    // Backend expects req.files.find(f => f.fieldname === "licenseImage" / "profileImage") — always append so req.files exists
    fd.append("licenseImage", licenseImageFile || new File([], "licenseImage"));
    fd.append("profileImage", profileImageFile || new File([], "profileImage"));
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          name: formData.name?.trim(),
          countryCode: formData.countryCode?.trim() || "+91",
          phoneNumber: formData.phoneNumber?.trim(),
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          pinCode: formData.pinCode ? Number(formData.pinCode) || formData.pinCode : undefined,
          licenseNumber: formData.licenseNumber?.trim() || undefined,
          bikeNumber: formData.bikeNumber?.trim() || undefined,
          bikeModel: formData.bikeModel?.trim() || undefined,
          bikeBrand: formData.bikeBrand?.trim() || undefined,
          isActive: formData.isActive,
        };
        if (formData.dob) payload.dob = new Date(formData.dob).toISOString();
        if (formData.licenseExpiry) payload.licenseExpiry = new Date(formData.licenseExpiry).toISOString();
        await updateDeliveryAgent(id, payload);
        toast.success("Delivery agent updated successfully.");
        setTimeout(() => navigate("/admin/driver"), 400);
      } else {
        await createDeliveryAgent(buildFormData());
        toast.success("Delivery agent created successfully. OTP sent for verification.");
        setTimeout(() => navigate("/admin/driver"), 400);
      }
    } catch (err) {
      logBackendError(isEdit ? "Update agent failed" : "Create agent failed", err);
      toast.error(getBackendErrorMessage(err, "Operation failed"));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-10 text-center text-gray-600">
        Loading agent data...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {isEdit ? "Edit Delivery Agent" : "Create New Delivery Agent"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Phone – driver login uses countryCode + phoneNumber */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Code *</label>
              <input
                type="text"
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                placeholder="+91"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
              <input
                type="text"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleChange}
                placeholder="e.g. 110001"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* License */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="e.g. DL1234567890"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
              <input
                type="date"
                name="licenseExpiry"
                value={formData.licenseExpiry}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bike */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bike / Vehicle Number</label>
              <input
                type="text"
                name="bikeNumber"
                value={formData.bikeNumber}
                onChange={handleChange}
                placeholder="e.g. DL01AB1234"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bike Brand</label>
              <input
                type="text"
                name="bikeBrand"
                value={formData.bikeBrand}
                onChange={handleChange}
                placeholder="e.g. Honda"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bike Model</label>
              <input
                type="text"
                name="bikeModel"
                value={formData.bikeModel}
                onChange={handleChange}
                placeholder="e.g. Honda Activa"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* License image & Profile image: create + edit; show existing in edit, preview when new file chosen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLicenseImageFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">{isEdit ? "Choose a file to replace current image." : "Optional. Upload license image."}</p>
              {(licensePreviewUrl || (isEdit && existingLicenseImageUrl && !licenseImageFile)) && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={licensePreviewUrl || existingLicenseImageUrl}
                    alt="License preview"
                    className="h-32 w-auto max-w-full object-contain rounded-lg border border-gray-200 shadow-sm"
                  />
                  {licensePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setLicenseImageFile(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">{isEdit ? "Choose a file to replace current image." : "Optional. Upload profile photo."}</p>
              {(profilePreviewUrl || (isEdit && existingProfileImageUrl && !profileImageFile)) && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={profilePreviewUrl || existingProfileImageUrl}
                    alt="Profile preview"
                    className="h-32 w-auto max-w-full object-contain rounded-lg border border-gray-200 shadow-sm"
                  />
                  {profilePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileImageFile(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label className="ml-2 block text-sm text-gray-700">Active / Available for deliveries</label>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
            >
              {loading ? "Saving..." : isEdit ? "Update Agent" : "Create Agent"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/driver")}
              className="flex-1 border border-gray-300 py-3 px-6 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryAgentForm;
