import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createAppPopup, getAppPopupById, updateAppPopup } from "../../apis/appPopupApi";

const PLATFORM_OPTIONS = ["ANDROID", "IOS", "WEB"];
const ACTION_OPTIONS = ["NAVIGATE", "EXTERNAL_LINK", "DEEPLINK", "NONE"];
const AUDIENCE_OPTIONS = ["ALL", "NEW_USERS", "RETURNING_USERS"];

const AppPopupForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    popupId: "",
    title: "",
    description: "",
    image: "",
    imageFile: null,
    ctaText: "Check it out",
    ctaAction: "NAVIGATE",
    ctaValue: "",
    secondaryText: "Maybe later",
    isClosable: true,
    showOnce: true,
    priority: 1,
    startDate: "",
    endDate: "",
    isActive: true,
    audience: "ALL",
    platforms: ["ANDROID", "IOS"],
  });

  useEffect(() => {
    if (!isEdit) return;
    const loadPopup = async () => {
      try {
        setLoading(true);
        const res = await getAppPopupById(id);
        const popup = res?.data;
        if (!popup) return;
        setForm({
          popupId: popup.popupId || "",
          title: popup.title || "",
          description: popup.description || "",
          image: popup.image || "",
          imageFile: null,
          ctaText: popup.ctaText || "Check it out",
          ctaAction: popup.ctaAction || "NAVIGATE",
          ctaValue: popup.ctaValue || "",
          secondaryText: popup.secondaryText || "Maybe later",
          isClosable: Boolean(popup.isClosable),
          showOnce: Boolean(popup.showOnce),
          priority: popup.priority || 1,
          startDate: popup.startDate ? new Date(popup.startDate).toISOString().slice(0, 16) : "",
          endDate: popup.endDate ? new Date(popup.endDate).toISOString().slice(0, 16) : "",
          isActive: Boolean(popup.isActive),
          audience: popup.audience || "ALL",
          platforms: Array.isArray(popup.platforms) && popup.platforms.length ? popup.platforms : ["ANDROID", "IOS"],
        });
      } catch (error) {
        console.error("Failed to load popup:", error);
        alert(error?.message || "Failed to load popup");
      } finally {
        setLoading(false);
      }
    };

    loadPopup();
  }, [id, isEdit]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const togglePlatform = (platform) => {
    setForm((prev) => {
      const exists = prev.platforms.includes(platform);
      return {
        ...prev,
        platforms: exists ? prev.platforms.filter((p) => p !== platform) : [...prev.platforms, platform],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      priority: Number(form.priority) || 1,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
      endDate: form.endDate ? new Date(form.endDate).toISOString() : "",
    };

    if (!payload.popupId || !payload.title || !payload.startDate || !payload.endDate) {
      alert("Please fill popupId, title, startDate and endDate");
      return;
    }

    if (!payload.platforms.length) {
      alert("Please select at least one platform");
      return;
    }
    if (!isEdit && !form.imageFile) {
      alert("Please upload popup image");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("popupId", payload.popupId);
      formData.append("title", payload.title);
      formData.append("description", payload.description || "");
      formData.append("ctaText", payload.ctaText || "");
      formData.append("ctaAction", payload.ctaAction || "NONE");
      formData.append("ctaValue", payload.ctaValue || "");
      formData.append("secondaryText", payload.secondaryText || "");
      formData.append("priority", String(payload.priority));
      formData.append("startDate", payload.startDate);
      formData.append("endDate", payload.endDate);
      formData.append("isClosable", String(payload.isClosable));
      formData.append("showOnce", String(payload.showOnce));
      formData.append("isActive", String(payload.isActive));
      formData.append("audience", payload.audience || "ALL");
      formData.append("platforms", JSON.stringify(payload.platforms));
      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      if (isEdit) {
        await updateAppPopup(id, formData);
      } else {
        await createAppPopup(formData);
      }
      navigate("/admin/app-popup");
    } catch (error) {
      console.error("Save popup failed:", error);
      alert(error?.message || "Failed to save popup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/admin/app-popup")} className="mb-4 text-sm text-gray-600 hover:text-black">
          Back to Popups
        </button>
        <h1 className="text-2xl font-bold mb-1">{isEdit ? "Edit App Popup" : "Create App Popup"}</h1>
        <p className="text-sm text-gray-500 mb-6">Configure popup shown when app opens.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border rounded px-3 py-2" placeholder="popupId*" value={form.popupId} onChange={(e) => setField("popupId", e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="title*" value={form.title} onChange={(e) => setField("title", e.target.value)} />
          </div>

          <textarea className="border rounded px-3 py-2 w-full" rows={3} placeholder="description" value={form.description} onChange={(e) => setField("description", e.target.value)} />
          <div>
            <label className="block text-sm text-gray-600 mb-1">Popup image {isEdit ? "(optional)" : "*"}</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setForm((prev) => ({
                  ...prev,
                  imageFile: file,
                  image: file ? URL.createObjectURL(file) : prev.image,
                }));
              }}
            />
            {form.image && (
              <img
                src={form.image}
                alt="Popup preview"
                className="mt-3 h-28 w-28 object-cover rounded border border-gray-200"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="border rounded px-3 py-2" placeholder="CTA text" value={form.ctaText} onChange={(e) => setField("ctaText", e.target.value)} />
            <select className="border rounded px-3 py-2" value={form.ctaAction} onChange={(e) => setField("ctaAction", e.target.value)}>
              {ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input className="border rounded px-3 py-2" placeholder="CTA value" value={form.ctaValue} onChange={(e) => setField("ctaValue", e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="border rounded px-3 py-2" placeholder="Secondary button text" value={form.secondaryText} onChange={(e) => setField("secondaryText", e.target.value)} />
            <input className="border rounded px-3 py-2" type="number" min={1} placeholder="Priority" value={form.priority} onChange={(e) => setField("priority", e.target.value)} />
            <select className="border rounded px-3 py-2" value={form.audience} onChange={(e) => setField("audience", e.target.value)}>
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Start date*</label>
              <input className="border rounded px-3 py-2 w-full" type="datetime-local" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">End date*</label>
              <input className="border rounded px-3 py-2 w-full" type="datetime-local" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Platforms</p>
            <div className="flex flex-wrap gap-3">
              {PLATFORM_OPTIONS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.platforms.includes(platform)} onChange={() => togglePlatform(platform)} />
                  {platform}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isClosable} onChange={(e) => setField("isClosable", e.target.checked)} />
              Closable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showOnce} onChange={(e) => setField("showOnce", e.target.checked)} />
              Show once
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate("/admin/app-popup")} className="px-5 py-2 border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-50">
              {loading ? "Saving..." : isEdit ? "Update Popup" : "Create Popup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppPopupForm;
