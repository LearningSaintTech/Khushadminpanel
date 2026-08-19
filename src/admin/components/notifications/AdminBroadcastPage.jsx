import { useEffect, useState } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Megaphone, X, Loader2, Send } from "lucide-react";
import {
  Alert,
  FormSection,
  Field,
  fieldClass,
  btnPrimary,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./notificationsShared";

const CHANNELS = [
  { value: "in_app", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "web_push", label: "Web push" },
];

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

function campaignToResult(payload) {
  if (!payload || typeof payload !== "object") return null;
  const inner = payload.data && (payload.campaignId == null && payload._id == null)
    ? payload.data
    : payload;
  const total = Number(inner.total ?? inner.totalUsers ?? 0) || 0;
  const sent = Number(inner.sent ?? inner.processedUsers ?? 0) || 0;
  return {
    campaignId: inner.campaignId ?? inner._id ?? null,
    status: inner.status || "queued",
    total,
    sent,
    error: inner.error || null,
  };
}

function broadcastStatusMessage(result) {
  if (!result) return "";
  const { status, sent, total, error } = result;
  if (status === "completed") return `Sent to ${sent} of ${total} users.`;
  if (status === "failed") return error || "Broadcast failed.";
  if (status === "cancelled") return "Broadcast cancelled.";
  if (status === "running") return `Sending… ${sent} of ${total} users.`;
  return `Queued for ${total} users. Sending…`;
}

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
    const campaignId = result?.campaignId;
    const status = result?.status;
    if (!campaignId || ["completed", "failed", "cancelled"].includes(status)) {
      return undefined;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const payload = await adminNotificationApi.getBroadcastStatus(campaignId);
        if (cancelled) return;
        const next = campaignToResult(payload);
        if (next) setResult(next);
      } catch {
        // keep last known progress
      }
    };
    const timer = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [result?.campaignId, result?.status]);

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
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
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
      const form = new FormData();
      form.append("title", title.trim());
      form.append("body", body?.trim() ?? "");
      channels.forEach((channel) => form.append("channels", channel));
      if (channels.includes("whatsapp")) {
        form.append("whatsappTemplateKey", whatsappTemplateKey);
      }
      if (channels.includes("sms")) {
        form.append("smsTemplateKey", smsTemplateKey);
      }
      if (imageFile) {
        form.append("image", imageFile);
      }

      const response = await adminNotificationApi.broadcast(form);
      setResult(campaignToResult(response));
      setTitle("");
      setBody("");
      setImageFile(null);
    } catch (err) {
      console.error("Broadcast failed:", err);
      setError(err?.response?.data?.message || err?.message || "Broadcast failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${formPageWrap} max-w-3xl`}>
      <div className={formToolbar}>
        <Megaphone className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <div className="mr-auto min-w-0">
          <h1 className="text-base font-bold tracking-tight text-stone-900 sm:text-lg">
            Broadcast notifications
          </h1>
          <p className="text-[10px] text-stone-500">
            Send a notification to all users. In-app is recommended.
          </p>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {result ? (
        <Alert variant={result.status === "failed" ? undefined : "success"}>
          {broadcastStatusMessage(result)}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FormSection title="Message" hint="Title and body for all selected channels">
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maintenance notice"
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Body (optional)">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message content…"
              rows={4}
              className={`${fieldClass} resize-none`}
            />
          </Field>
          <Field label="Image (optional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-[11px] text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-canvas-muted file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
            />
            {imageFile && imagePreviewUrl ? (
              <div className="mt-2 rounded-lg border border-border bg-canvas-muted p-2">
                <div className="relative inline-block">
                  <img
                    src={imagePreviewUrl}
                    alt={imageFile.name}
                    onClick={() => setZoomOpen(true)}
                    className="h-28 w-44 cursor-zoom-in rounded-md border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setZoomOpen(false);
                    }}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900/80 text-white hover:bg-stone-900"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <p className="mt-1 max-w-44 truncate text-[10px] text-stone-600">{imageFile.name}</p>
                <p className="text-[10px] text-stone-500">Click image to zoom</p>
              </div>
            ) : null}
          </Field>
        </FormSection>

        <FormSection title="Channels" hint="Select at least one delivery channel">
          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((c) => (
              <label key={c.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={channels.includes(c.value)}
                  onChange={() => toggleChannel(c.value)}
                  className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                />
                <span className="text-[11px] text-stone-700">{c.label}</span>
              </label>
            ))}
          </div>

          {channels.includes("whatsapp") ? (
            <Field label="WhatsApp template" hint="Registered template for WhatsApp.">
              <select
                value={whatsappTemplateKey}
                onChange={(e) => setWhatsappTemplateKey(e.target.value)}
                className={fieldClass}
              >
                {TEMPLATE_KEY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {channels.includes("sms") ? (
            <Field label="SMS template" hint="Registered template for SMS.">
              <select
                value={smsTemplateKey}
                onChange={(e) => setSmsTemplateKey(e.target.value)}
                className={fieldClass}
              >
                {TEMPLATE_KEY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </FormSection>

        <div className={formStickyFooter}>
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Send to all users
              </>
            )}
          </button>
        </div>
      </form>

      {zoomOpen && imagePreviewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoomOpen(false)}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute -right-2 -top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow hover:bg-canvas-muted"
              aria-label="Close zoom preview"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <img
              src={imagePreviewUrl}
              alt={imageFile?.name || "Preview"}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
