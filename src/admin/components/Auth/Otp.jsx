// OTP.jsx
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { verifyOtp, resendOtp } from "../../apis/Authapi";
import {
  setLoading,
  setError,
  clearError,
  setToken,
} from "../../../redux/GlobalSlice";
import { selectLoading, selectError } from "../../../redux/GlobalSelector";

export default function OTP() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isValid, setIsValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const phone = location.state?.phone || "XXXXXXXXXX";
  const userId = location.state?.userId || null;

  // Auto-focus first input on mount
  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // Resend OTP countdown timer
  useEffect(() => {
    if (canResend || resendTimer <= 0) {
      setCanResend(true);
      return;
    }

    console.log("[TIMER] Starting countdown from:", resendTimer);

    const interval = setInterval(() => {
      setResendTimer((prev) => {
        const next = prev - 1;
        console.log("[TIMER] Tick:", next);

        if (next <= 0) {
          setCanResend(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      console.log("[TIMER] Cleaning up interval");
      clearInterval(interval);
    };
  }, [canResend]); // Important: depend mainly on canResend

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setIsValid(true);
    dispatch(clearError());

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);
      setIsValid(true);
      dispatch(clearError());

      const nextFocus = Math.min(pasted.length, 5);
      inputs.current[nextFocus]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setIsValid(false);
      return;
    }

    dispatch(clearError());
    dispatch(setLoading(true));
    setIsValid(true);
    setIsSubmitting(true);

    try {
      const res = await verifyOtp({ userId, otp: otpValue });

      if (res.success) {
        const accessToken = res.data.accessToken;
        const refreshToken = res.data.refreshToken; // note: typo fix → referesh → refresh

        dispatch(setToken({ accessToken, refreshToken }));

        localStorage.setItem("token", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        const decoded = jwtDecode(accessToken);
        const role = decoded?.role?.toUpperCase();

        if (!role) throw new Error("Role not found in token");

        localStorage.setItem("userRole", role);

        // Role-based navigation
        switch (role) {
          case "ADMIN":
          case "SUBADMIN":
            navigate("/admin/dashboard", { replace: true });
            break;
          case "INFLUENCER":
            navigate("/influencer/dashboard", { replace: true });
            break;
          case "DRIVER":
            navigate("/driver/dashboard", { replace: true });
            break;
          default:
            navigate("/login", { replace: true });
        }
      } else {
        setIsValid(false);
        dispatch(setError(res.message || "Invalid OTP"));
      }
    } catch (err) {
      console.error("OTP verification failed:", err);
      setIsValid(false);
      dispatch(setError(err.message || "Verification failed"));
    } finally {
      dispatch(setLoading(false));
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    if (!userId) {
      dispatch(setError("User ID is missing"));
      return;
    }

    try {
      dispatch(clearError());
      dispatch(setLoading(true));

      const res = await resendOtp({ userId });

      if (res.success) {
        console.log("[RESEND] Success → resetting UI state");

        // Reset OTP inputs
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();

        // Restart timer — this will trigger the useEffect
        setResendTimer(30);
        setCanResend(false);

        console.log("[RESEND] Timer reset to 30s, canResend = false");
      } else {
        dispatch(setError(res.message || "Failed to resend OTP"));
      }
    } catch (err) {
      console.error("[RESEND] Error:", err);
      dispatch(setError(err.message || "Failed to resend OTP"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/40 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

          <div className="p-8 sm:p-10">
            <div className="text-center mb-9">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Verify Phone
              </h1>
              <p className="mt-3 text-gray-600">Enter the 6-digit code sent to</p>
              <p className="mt-1 font-medium text-gray-900">+91 {phone}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex justify-center gap-3 sm:gap-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={digit}
                    ref={(el) => (inputs.current[index] = el)}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`
                      w-12 h-14 sm:w-14 sm:h-16
                      text-center text-2xl font-bold
                      bg-white border ${
                        isValid
                          ? "border-gray-300 focus:border-black"
                          : "border-red-500 focus:border-red-600"
                      }
                      rounded-lg
                      focus:ring-2 focus:ring-black/20 focus:outline-none
                      transition-all duration-200
                    `}
                    disabled={loading || isSubmitting}
                  />
                ))}
              </div>

              {!isValid && (
                <p className="text-center text-sm text-red-600">
                  {error || "Please enter a valid 6-digit code"}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || otp.join("").length !== 6 || loading}
                className={`
                  w-full py-4 px-6
                  bg-black text-white
                  hover:bg-gray-800
                  font-semibold tracking-wide
                  rounded-xl
                  transition-all duration-300
                  hover:scale-[1.02]
                  focus:outline-none focus:ring-2 focus:ring-black/30 focus:ring-offset-2 focus:ring-offset-white
                  disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
                `}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  className={`
                    text-black font-medium transition-colors
                    ${!canResend ? "opacity-50 cursor-not-allowed" : "hover:text-gray-700"}
                  `}
                >
                  {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                </button>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Code expires in 5 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}