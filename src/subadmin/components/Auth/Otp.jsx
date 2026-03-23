import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { setRole, setToken } from "../../../redux/GlobalSlice";
import { subadminApi } from "../../apis/subadminApi";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 45;

export default function SubadminOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const stateUserId = location.state?.userId;
  const statePhone = location.state?.phone || sessionStorage.getItem("subadminPhone") || "";
  const userId = stateUserId || sessionStorage.getItem("subadminUserId");

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

  const maskedPhone = statePhone
    ? `${statePhone.slice(0, 2)}******${statePhone.slice(-2)}`
    : "**********";

  const focusInput = (index) => {
    if (inputsRef.current[index]) inputsRef.current[index].focus();
  };

  const handleOtpChange = (index, value) => {
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
    }
  };

  const handleVerify = async () => {
    if (!userId) {
      setError("Session expired. Please login again.");
      navigate("/subadmin/login", { replace: true });
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
      console.log("[SUBADMIN_VERIFY][REQ]", { userId, otpLength: code.length });
      const res = await subadminApi.verifyOtp({ userId, otp: code });
      const payload = res?.data ?? res;
      const token = payload?.accessToken;
      let role = String(payload?.role || payload?.user?.role || "").toUpperCase();

      if (!token) throw new Error("Verification failed. Try again.");
      if (!role) {
        try {
          const decoded = jwtDecode(token);
          console.log("[SUBADMIN_VERIFY][DECODED_TOKEN]", decoded);
          role = String(decoded?.role || decoded?.userRole || "").toUpperCase();
        } catch {
          // Ignore decode failures; role validation below will handle it.
        }
      }
      console.log("[SUBADMIN_VERIFY][RES]", {
        hasToken: !!token,
        payloadRole: String(payload?.role || payload?.user?.role || "").toUpperCase() || null,
        finalRole: role || null,
      });
      if (role !== "SUBADMIN" && role !== "SUPER_SUBADMIN") {
        throw new Error("This account is not allowed on subadmin login.");
      }

      dispatch(setToken(token));
      dispatch(setRole(role));
      navigate("/subadmin/dashboard", { replace: true });
    } catch (err) {
      console.log("[SUBADMIN_VERIFY][ERR]", err);
      const msg = typeof err === "string" ? err : err?.message || "Invalid OTP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId || resendCooldown > 0) return;
    setError("");
    try {
      await subadminApi.resendOtp({ userId });
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to resend OTP";
      setError(msg);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-gray-600 mb-4">Session expired. Please login again.</p>
          <button
            type="button"
            onClick={() => navigate("/subadmin/login", { replace: true })}
            className="px-6 py-2 bg-black text-white rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="h-1 bg-black" />
          <div className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Verify OTP</h1>
              <p className="mt-2 text-gray-600">OTP sent to +91 {maskedPhone}</p>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-5">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 text-center text-xl border border-gray-300 rounded-lg outline-none"
                />
              ))}
            </div>

            {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-4 px-6 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="text-sm text-center mt-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-black font-medium disabled:text-gray-400"
              >
                Resend OTP
              </button>
              <div className="text-gray-500 text-xs mt-2">
                {resendCooldown > 0
                  ? `Resend in ${Math.floor(resendCooldown / 60)
                      .toString()
                      .padStart(2, "0")}:${(resendCooldown % 60).toString().padStart(2, "0")}`
                  : "You can resend now"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

