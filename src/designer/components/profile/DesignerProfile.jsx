import { useEffect, useState } from "react";
import { designerApi } from "../../apis/designerApi";
import { User, Mail, MapPin, Hash, ImageIcon, Save, Loader2 } from "lucide-react";

const emptyForm = {
  name: "",
  email: "",
  address: "",
  city: "",
  pinCode: "",
};

const DesignerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await designerApi.getProfile();
      if (res?.success && res.data) {
        setProfile(res.data);
        setForm({
          name: res.data.name || "",
          email: res.data.email || "",
          address: res.data.address || "",
          city: res.data.city || "",
          pinCode: res.data.pinCode != null ? String(res.data.pinCode) : "",
        });
      }
    } catch (e) {
      setError(e?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let body;
      if (file) {
        body = new FormData();
        body.append("name", form.name);
        body.append("email", form.email);
        body.append("address", form.address);
        body.append("city", form.city);
        body.append("pinCode", form.pinCode ? String(Number(form.pinCode) || 0) : "0");
        body.append("profileImage", file);
      } else {
        body = {
          name: form.name,
          email: form.email,
          address: form.address,
          city: form.city,
          pinCode: form.pinCode ? Number(form.pinCode) : 0,
        };
      }
      const res = await designerApi.updateProfile(body);
      if (res?.success) {
        setSuccess("Profile updated.");
        setFile(null);
        await load();
      }
    } catch (e) {
      setError(e?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-800">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-xs text-gray-500">View and update your account details.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div>
      ) : null}

      {/* Read-only identity */}
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-blue-100 bg-linear-to-br from-white to-blue-50/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-2 text-sm">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-blue-800">Phone</p>
            <p className="text-gray-900">
              {profile?.countryCode} {profile?.phoneNumber}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-violet-100 text-[10px] font-bold text-violet-700">#</span>
          <div>
            <p className="text-xs font-medium text-violet-800">Verification</p>
            <p className="text-gray-900">
              {profile?.isNumberVerified ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Verified</span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Pending</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 text-xs font-medium text-emerald-800">Status</span>
          <p>
            {profile?.isActive ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Inactive</span>
            )}
          </p>
        </div>
        {profile?.profileImage ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-1 text-xs font-medium text-gray-600">Current photo</p>
            <img src={profile.profileImage} alt="" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
          </div>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/30 p-3 shadow-sm"
      >
        <h2 className="border-l-4 border-indigo-500 pl-2 text-sm font-semibold text-indigo-900">Edit details</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-gray-700">
              <User size={12} className="text-indigo-600" /> Name
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-gray-700">
              <Mail size={12} className="text-blue-600" /> Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-gray-700">
              <MapPin size={12} className="text-emerald-600" /> City
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              value={form.city}
              onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-gray-700">
              <MapPin size={12} className="text-amber-600" /> Address
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-gray-700">
              <Hash size={12} className="text-violet-600" /> Pin code
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              value={form.pinCode}
              onChange={(e) => setForm((s) => ({ ...s, pinCode: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-gray-700">
              <ImageIcon size={12} className="text-rose-600" /> New profile photo
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-rose-100 file:px-2 file:py-1 file:text-rose-800"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </form>
    </div>
  );
};

export default DesignerProfile;
