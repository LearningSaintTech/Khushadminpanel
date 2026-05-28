import { useEffect, useState } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Megaphone, X } from "lucide-react";

const CHANNELS = [
  { value: "in_app", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "web_push", label: "Web push" },
];

// Third-party (WhatsApp/SMS) template keys – select which registered template to use for broadcast.
// BROADCAST uses announcementTitle, announcementBody; others use their own placeholders.
const TEMPLATE_KEY_OPTIONS = [
  { value: "BROADCAST", label: "BROADCAST (announcement)" },
  { value: "ORDER_CONFIRMED", label: "ORDER_CONFIRMED" },
  { value: "ORDER_SHIPPED", label: "ORDER_SHIPPED" },
  { value: "ORDER_DELIVERED", label: "ORDER_DELIVERED" },
  { value: "ORDER_OUT_FOR_DELIVERY", label: "ORDER_OUT_FOR_DELIVERY" },
  { value: "OTP", label: "OTP" },
  { value: "PASSWORD_RESET", label: "PASSWORD_RESET" },
  { value: "ABANDONED_CART", label: "ABANDONED_CART" },
  { value: "POPUP_COUPON", label: "POPUP_COUPON" },
];

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [channels, setChannels] = useState(["in_app"]);
  const [whatsappTemplateKey, setWhatsappTemplateKey] = useState("BROADCAST");
  const [smsTemplateKey, setSmsTemplateKey] = useState("BROADCAST");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      setZoomOpen(false);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const toggleChannel = (value) => {
    setChannels((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!title?.trim()) {
    setError("Title is required");
    return;
  }

  if (channels.length === 0) {
    setError("Select at least one channel");
    return;
  }

  setSubmitting(true);
  setError("");
  setResult(null);

  try {
    const payload = new FormData();
    payload.append("title", title.trim());
    payload.append("body", body?.trim() ?? "");
    channels.forEach((channel) => payload.append("channels", channel));
    if (channels.includes("whatsapp")) {
      payload.append("whatsappTemplateKey", whatsappTemplateKey);
    }
    if (channels.includes("sms")) {
      payload.append("smsTemplateKey", smsTemplateKey);
    }
    if (imageFile) {
      payload.append("image", imageFile);
    }

    console.log("Broadcast payload:", {
      title: title.trim(),
      body: body?.trim() ?? "",
      channels,
      whatsappTemplateKey: channels.includes("whatsapp")
        ? whatsappTemplateKey
        : undefined,
      smsTemplateKey: channels.includes("sms")
        ? smsTemplateKey
        : undefined,
      image: imageFile
        ? {
            name: imageFile.name,
            type: imageFile.type,
            size: imageFile.size,
          }
        : null,
    });

    const data = await adminNotificationApi.broadcast(payload);

    console.log("Broadcast response:", data);

    setResult(data);

    // Reset form
    setTitle("");
    setBody("");
    setImageFile(null);
  } catch (e) {
    console.error("Broadcast failed:", e);

    setError(
      e?.response?.data?.message ||
      e?.message ||
      "Broadcast failed"
    );
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <Megaphone size={24} />
        Broadcast notifications
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        Send a notification to all users. Choose channels (in-app is always recommended).
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {result && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
          Sent to {result.sent ?? result.data?.sent ?? 0} of {result.total ?? result.data?.total ?? 0} users.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Maintenance notice"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body (optional)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message content..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          {imageFile && imagePreviewUrl && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="relative inline-block">
                <img
                  src={imagePreviewUrl}
                  alt={imageFile.name}
                  onClick={() => setZoomOpen(true)}
                  className="h-28 w-44 cursor-zoom-in rounded-md border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setZoomOpen(false);
                  }}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-1 max-w-44 truncate text-xs text-gray-600">
                {imageFile.name}
              </p>
              <p className="text-[11px] text-gray-500">Click image to zoom</p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes(c.value)}
                  onChange={() => toggleChannel(c.value)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        {channels.includes("whatsapp") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp template</label>
            <p className="text-xs text-gray-500 mb-1">Select the third-party registered template to use for WhatsApp.</p>
            <select
              value={whatsappTemplateKey}
              onChange={(e) => setWhatsappTemplateKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {TEMPLATE_KEY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {channels.includes("sms") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMS template</label>
            <p className="text-xs text-gray-500 mb-1">Select the third-party registered template to use for SMS.</p>
            <select
              value={smsTemplateKey}
              onChange={(e) => setSmsTemplateKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {TEMPLATE_KEY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send to all users"}
        </button>
      </form>

      {zoomOpen && imagePreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute -right-2 -top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100"
              aria-label="Close zoom preview"
            >
              <X size={16} />
            </button>
            <img
              src={imagePreviewUrl}
              alt={imageFile?.name || "Preview"}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
