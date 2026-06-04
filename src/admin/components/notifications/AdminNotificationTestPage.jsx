import { useState } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { FlaskConical } from "lucide-react";
import { PageToolbar, FormSection, Field, fieldClass } from "./notificationsShared";

const initialEmail = {
  to: "",
  subject: "Test email",
  body: "This is a test email from Khush admin.",
};
const initialSms = {
  countryCode: "+91",
  phoneNumber: "",
  message: "Test SMS from Khush admin.",
};
const initialWhatsApp = {
  countryCode: "+91",
  phoneNumber: "",
  message: "Test WhatsApp from Khush admin.",
};

function StatusLine({ text }) {
  if (!text) return null;
  const ok =
    text.startsWith("Email sent") ||
    text.startsWith("SMS sent") ||
    text.startsWith("WhatsApp sent");
  return (
    <p className={`text-[11px] ${ok ? "text-success" : "text-danger"}`}>{text}</p>
  );
}

export default function AdminNotificationTestPage() {
  const [email, setEmail] = useState(initialEmail);
  const [sms, setSms] = useState(initialSms);
  const [whatsapp, setWhatsApp] = useState(initialWhatsApp);
  const [loading, setLoading] = useState({ email: false, sms: false, whatsapp: false });
  const [message, setMessage] = useState({ email: "", sms: "", whatsapp: "" });

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!email.to?.trim()) {
      setMessage((m) => ({ ...m, email: "Email address is required." }));
      return;
    }
    setLoading((l) => ({ ...l, email: true }));
    setMessage((m) => ({ ...m, email: "" }));
    try {
      await adminNotificationApi.testEmail({
        to: email.to.trim(),
        subject: email.subject?.trim() || "Test",
        body: email.body?.trim() || "Test body",
      });
      setMessage((m) => ({ ...m, email: "Email sent (or queued)." }));
    } catch (err) {
      setMessage((m) => ({ ...m, email: err?.message || "Failed to send email." }));
    } finally {
      setLoading((l) => ({ ...l, email: false }));
    }
  };

  const sendSms = async (e) => {
    e.preventDefault();
    const to = sms.phoneNumber?.trim().replace(/\D/g, "") || sms.phoneNumber;
    if (!to) {
      setMessage((m) => ({ ...m, sms: "Phone number is required." }));
      return;
    }
    setLoading((l) => ({ ...l, sms: true }));
    setMessage((m) => ({ ...m, sms: "" }));
    try {
      await adminNotificationApi.testSms({
        countryCode: sms.countryCode?.trim() || "+91",
        phoneNumber: to,
        message: sms.message?.trim() || "Test SMS",
      });
      setMessage((m) => ({ ...m, sms: "SMS sent (or queued)." }));
    } catch (err) {
      setMessage((m) => ({ ...m, sms: err?.message || "Failed to send SMS." }));
    } finally {
      setLoading((l) => ({ ...l, sms: false }));
    }
  };

  const sendWhatsApp = async (e) => {
    e.preventDefault();
    const to = whatsapp.phoneNumber?.trim().replace(/\D/g, "") || whatsapp.phoneNumber;
    if (!to) {
      setMessage((m) => ({ ...m, whatsapp: "Phone number is required." }));
      return;
    }
    setLoading((l) => ({ ...l, whatsapp: true }));
    setMessage((m) => ({ ...m, whatsapp: "" }));
    try {
      await adminNotificationApi.testWhatsApp({
        countryCode: whatsapp.countryCode?.trim() || "+91",
        phoneNumber: to,
        message: whatsapp.message?.trim() || "Test WhatsApp",
      });
      setMessage((m) => ({ ...m, whatsapp: "WhatsApp sent (or queued)." }));
    } catch (err) {
      setMessage((m) => ({ ...m, whatsapp: err?.message || "Failed to send WhatsApp." }));
    } finally {
      setLoading((l) => ({ ...l, whatsapp: false }));
    }
  };

  const btnClass =
    "rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-brand-700 disabled:opacity-50";

  return (
    <div className="text-stone-900">
      <PageToolbar
        icon={FlaskConical}
        title="Test notifications"
        subtitle="Verify Email, SMS, and WhatsApp. Results appear in notification history."
      />

      <div className="grid gap-2 lg:grid-cols-3">
        <FormSection title="Test email" hint="Send a one-off email">
          <form onSubmit={sendEmail} className="space-y-2.5">
            <Field label="To (email)" required>
              <input
                type="email"
                value={email.to}
                onChange={(e) => setEmail((s) => ({ ...s, to: e.target.value }))}
                placeholder="admin@example.com"
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Subject">
              <input
                type="text"
                value={email.subject}
                onChange={(e) => setEmail((s) => ({ ...s, subject: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Body">
              <textarea
                value={email.body}
                onChange={(e) => setEmail((s) => ({ ...s, body: e.target.value }))}
                rows={3}
                className={fieldClass}
              />
            </Field>
            <StatusLine text={message.email} />
            <button type="submit" disabled={loading.email} className={btnClass}>
              {loading.email ? "Sending…" : "Send test email"}
            </button>
          </form>
        </FormSection>

        <FormSection title="Test SMS" hint="SMS via registered provider">
          <form onSubmit={sendSms} className="space-y-2.5">
            <div className="flex gap-2">
              <div className="w-20">
                <Field label="Country">
                  <input
                    type="text"
                    value={sms.countryCode}
                    onChange={(e) => setSms((s) => ({ ...s, countryCode: e.target.value }))}
                    placeholder="+91"
                    className={fieldClass}
                  />
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Phone" required>
                  <input
                    type="tel"
                    value={sms.phoneNumber}
                    onChange={(e) => setSms((s) => ({ ...s, phoneNumber: e.target.value }))}
                    placeholder="9876543210"
                    className={fieldClass}
                  />
                </Field>
              </div>
            </div>
            <Field label="Message">
              <textarea
                value={sms.message}
                onChange={(e) => setSms((s) => ({ ...s, message: e.target.value }))}
                rows={2}
                className={fieldClass}
              />
            </Field>
            <StatusLine text={message.sms} />
            <button type="submit" disabled={loading.sms} className={btnClass}>
              {loading.sms ? "Sending…" : "Send test SMS"}
            </button>
          </form>
        </FormSection>

        <FormSection title="Test WhatsApp" hint="WhatsApp via registered template">
          <form onSubmit={sendWhatsApp} className="space-y-2.5">
            <div className="flex gap-2">
              <div className="w-20">
                <Field label="Country">
                  <input
                    type="text"
                    value={whatsapp.countryCode}
                    onChange={(e) =>
                      setWhatsApp((s) => ({ ...s, countryCode: e.target.value }))
                    }
                    placeholder="+91"
                    className={fieldClass}
                  />
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Phone" required>
                  <input
                    type="tel"
                    value={whatsapp.phoneNumber}
                    onChange={(e) =>
                      setWhatsApp((s) => ({ ...s, phoneNumber: e.target.value }))
                    }
                    placeholder="9876543210"
                    className={fieldClass}
                  />
                </Field>
              </div>
            </div>
            <Field label="Message">
              <textarea
                value={whatsapp.message}
                onChange={(e) => setWhatsApp((s) => ({ ...s, message: e.target.value }))}
                rows={2}
                className={fieldClass}
              />
            </Field>
            <StatusLine text={message.whatsapp} />
            <button type="submit" disabled={loading.whatsapp} className={btnClass}>
              {loading.whatsapp ? "Sending…" : "Send test WhatsApp"}
            </button>
          </form>
        </FormSection>
      </div>
    </div>
  );
}
