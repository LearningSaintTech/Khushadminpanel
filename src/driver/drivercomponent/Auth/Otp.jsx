import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { driverVerifyOtp, driverResendOtp } from "../../apis/driverApi";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 45;

export default function Otp() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateUserId = location.state?.userId;
  const statePhone = location.state?.phone || "";
  const storedUserId = sessionStorage.getItem("driverUserId");
  const userId = stateUserId || storedUserId;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputsRef = useRef([]);

  const maskedPhone = statePhone
    ? `${statePhone.slice(0, 2)}******${statePhone.slice(-2)}`
    : "+91 ******??";

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const focusInput = (index) => {
    if (inputsRef.current[index]) inputsRef.current[index].focus();
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      const next = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = d;
      });
      setOtp(next);
      const nextEmpty = next.findIndex((d) => !d);
      focusInput(nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty);
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");
    if (digit && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      focusInput(index - 1);
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
    }
  };

  const handleVerify = async () => {
    if (!userId) {
      setError("Session expired. Please login again.");
      navigate("/driver/login");
      return;
    }
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Enter full 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await driverVerifyOtp({ userId, otp: code });
      const payload = data?.data ?? data;
      const token = payload?.accessToken ?? data?.accessToken;
      if (token) {
        localStorage.setItem("token", token);
        navigate("/driver/dashboard", { replace: true });
      } else {
        setError("Verification failed. Try again.");
      }
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !userId) return;
    setError("");
    try {
      await driverResendOtp({ userId });
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to resend OTP");
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col items-center justify-center p-4">
        <p className="text-gray-600 mb-4">Session expired. Please login again.</p>
        <button
          onClick={() => navigate("/driver/login")}
          className="px-6 py-2 bg-black text-white rounded-lg"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f2f2f2] flex flex-col items-center">
      <div
        className="flex flex-col items-center text-center mt-[124px]"
        style={{ width: "299px", gap: "32px" }}
      >
        <div>
          <h1 className="text-[28px] font-semibold">Verify OTP</h1>
          <p className="text-gray-600 text-sm mt-2">
            Enter the OTP sent to +91 {maskedPhone}
          </p>
        </div>

        <div className="flex justify-between w-full">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-10 text-center text-2xl bg-transparent border-b border-gray-400 focus:border-black outline-none"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="text-sm">
          <span className="text-gray-400">Didn&apos;t receive the OTP? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-black font-medium disabled:text-gray-400"
          >
            Resend OTP
          </button>
          <div className="flex justify-center items-center gap-1 mt-3 text-gray-500 text-xs">
            ⏱ {String(Math.floor(resendCooldown / 60)).padStart(2, "0")} : {String(resendCooldown % 60).padStart(2, "0")}
          </div>
        </div>
      </div>

      <button
        onClick={handleVerify}
        disabled={loading}
        className="absolute bottom-[82px] w-[343px] h-[56px] bg-black text-white rounded-lg py-4 px-6 tracking-wide disabled:opacity-70"
      >
        {loading ? "Verifying…" : "VERIFY OTP"}
      </button>
    </div>
  );
}
