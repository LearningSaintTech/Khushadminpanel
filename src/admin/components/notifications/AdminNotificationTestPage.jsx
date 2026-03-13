import { useState } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Mail, MessageSquare, Phone } from "lucide-react";

const initialEmail = { to: "", subject: "Test email", body: "This is a test email from Khush admin." };
const initialSms = { countryCode: "+91", phoneNumber: "", message: "Test SMS from Khush admin." };
const initialWhatsApp = { countryCode: "+91", phoneNumber: "", message: "Test WhatsApp from Khush admin." };

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Test notifications</h1>
      <p className="text-gray-600 text-sm mb-6">
        Send test Email, SMS, and WhatsApp to verify channel configuration. Results appear in Notification History.
      </p>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Test Email */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={22} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Test Email</h2>
          </div>
          <form onSubmit={sendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To (email) *</label>
              <input
                type="email"
                value={email.to}
                onChange={(e) => setEmail((s) => ({ ...s, to: e.target.value }))}
                placeholder="admin@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={email.subject}
                onChange={(e) => setEmail((s) => ({ ...s, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={email.body}
                onChange={(e) => setEmail((s) => ({ ...s, body: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            {message.email && (
              <p className={`text-sm ${message.email.startsWith("Email sent") ? "text-green-600" : "text-red-600"}`}>
                {message.email}
              </p>
            )}
            <button
              type="submit"
              disabled={loading.email}
              className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading.email ? "Sending..." : "Send test email"}
            </button>
          </form>
        </section>

        {/* Test SMS */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={22} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Test SMS</h2>
          </div>
          <form onSubmit={sendSms} className="space-y-4">
            <div className="flex gap-2">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={sms.countryCode}
                  onChange={(e) => setSms((s) => ({ ...s, countryCode: e.target.value }))}
                  placeholder="+91"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number *</label>
                <input
                  type="tel"
                  value={sms.phoneNumber}
                  onChange={(e) => setSms((s) => ({ ...s, phoneNumber: e.target.value }))}
                  placeholder="9876543210"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={sms.message}
                onChange={(e) => setSms((s) => ({ ...s, message: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            {message.sms && (
              <p className={`text-sm ${message.sms.startsWith("SMS sent") ? "text-green-600" : "text-red-600"}`}>
                {message.sms}
              </p>
            )}
            <button
              type="submit"
              disabled={loading.sms}
              className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading.sms ? "Sending..." : "Send test SMS"}
            </button>
          </form>
        </section>

        {/* Test WhatsApp */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={22} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Test WhatsApp</h2>
          </div>
          <form onSubmit={sendWhatsApp} className="space-y-4">
            <div className="flex gap-2">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={whatsapp.countryCode}
                  onChange={(e) => setWhatsApp((s) => ({ ...s, countryCode: e.target.value }))}
                  placeholder="+91"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number *</label>
                <input
                  type="tel"
                  value={whatsapp.phoneNumber}
                  onChange={(e) => setWhatsApp((s) => ({ ...s, phoneNumber: e.target.value }))}
                  placeholder="9876543210"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={whatsapp.message}
                onChange={(e) => setWhatsApp((s) => ({ ...s, message: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            {message.whatsapp && (
              <p className={`text-sm ${message.whatsapp.startsWith("WhatsApp sent") ? "text-green-600" : "text-red-600"}`}>
                {message.whatsapp}
              </p>
            )}
            <button
              type="submit"
              disabled={loading.whatsapp}
              className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading.whatsapp ? "Sending..." : "Send test WhatsApp"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
