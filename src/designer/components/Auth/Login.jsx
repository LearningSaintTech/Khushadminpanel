import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { designerApi } from "../../apis/designerApi";
import { Smartphone } from "lucide-react";

const COUNTRY_CODE = "+91";

export default function DesignerLogin() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    const trimmed = (phoneNumber || "").trim().replace(/\D/g, "");
    if (!trimmed || trimmed.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await designerApi.login({ countryCode: COUNTRY_CODE, phoneNumber: trimmed });
      const payload = res?.data ?? res;
      const userId = payload?.userId;
      if (!userId) throw new Error("Could not send OTP. Please try again.");
      sessionStorage.setItem("designerUserId", String(userId));
      sessionStorage.setItem("designerPhone", trimmed);
      navigate("/designer/verify-otp", { state: { userId: String(userId), phone: trimmed } });
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-600 via-violet-700 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <Smartphone size={24} />
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">Designer login</h1>
        <p className="mt-1 text-center text-sm text-gray-600">Sign in with your registered mobile number</p>
        <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-indigo-900/80">
          Mobile number
        </label>
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-sm font-semibold text-indigo-600">{COUNTRY_CODE}</span>
          </div>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="XXXXXXXXXX"
            maxLength={15}
            disabled={loading}
            className="w-full rounded-xl border border-indigo-100 bg-indigo-50/30 py-3 pl-14 pr-4 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
          />
        </div>
        {error ? <p className="mt-2 text-sm font-medium text-rose-600">{error}</p> : null}
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
        >
          {loading ? "Sending OTP…" : "Send OTP"}
        </button>
      </div>
    </div>
  );
}
