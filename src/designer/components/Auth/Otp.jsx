import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { setRole, setToken } from "../../../redux/GlobalSlice";
import { designerApi } from "../../apis/designerApi";
import { ShieldCheck } from "lucide-react";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 45;

export default function DesignerOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const stateUserId = location.state?.userId;
  const statePhone = location.state?.phone || sessionStorage.getItem("designerPhone") || "";
  const userId = stateUserId || sessionStorage.getItem("designerUserId");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const focusInput = (index) => inputsRef.current[index]?.focus();
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (!userId || code.length !== OTP_LENGTH) {
      setError("Enter full 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await designerApi.verifyOtp({ userId, otp: code });
      const payload = res?.data ?? res;
      const token = payload?.accessToken;
      if (!token) throw new Error("Verification failed");
      let role = String(payload?.role || "").toUpperCase();
      if (!role) role = String(jwtDecode(token)?.role || "").toUpperCase();
      if (role !== "DESIGNER") throw new Error("This account is not allowed on designer login.");
      dispatch(setToken(token));
      dispatch(setRole(role));
      navigate("/designer/dashboard", { replace: true });
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId || resendCooldown > 0) return;
    try {
      await designerApi.resendOtp({ userId });
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-700 via-indigo-700 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">Verify OTP</h1>
        <p className="mt-1 text-center text-sm text-gray-600">
          Code sent to <span className="font-semibold text-indigo-700">+91 {statePhone}</span>
        </p>
        <div className="mt-6 grid grid-cols-6 gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              className="h-12 rounded-xl border-2 border-indigo-100 bg-indigo-50/20 text-center text-lg font-semibold text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          ))}
        </div>
        {error ? <p className="mt-3 text-center text-sm font-medium text-rose-600">{error}</p> : null}
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify & continue"}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="mt-3 w-full py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 disabled:text-gray-400"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}
