import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { supportAgentResendOtp, supportAgentVerifyOtp } from "../../apis/supportAgentApi";
import {
  setLoading,
  setError,
  clearError,
  setToken,
  setRole,
} from "../../../redux/GlobalSlice";
import { clearOtherPanelSessions } from "../../../utils/authRole";
import { selectLoading, selectError } from "../../../redux/GlobalSelector";

const STORAGE_AGENT_ID = "supportAgent_agentId";
const STORAGE_PHONE = "supportAgent_phone";

export default function SupportAgentOtp() {
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

  const phone =
    location.state?.phone || sessionStorage.getItem(STORAGE_PHONE) || "XXXXXXXXXX";
  const agentId =
    location.state?.agentId || sessionStorage.getItem(STORAGE_AGENT_ID) || null;

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (canResend || resendTimer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setResendTimer((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setCanResend(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canResend]);

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

    if (!agentId) {
      dispatch(setError("Session expired. Please login again."));
      navigate("/support-agent/login", { replace: true });
      return;
    }

    if (otpValue.length !== 6) {
      setIsValid(false);
      return;
    }

    dispatch(clearError());
    dispatch(setLoading(true));
    setIsValid(true);
    setIsSubmitting(true);

    try {
      const res = await supportAgentVerifyOtp({ agentId, otp: otpValue });

      if (res?.success) {
        const accessToken = res.data?.accessToken;
        if (!accessToken) throw new Error("Verification failed");

        dispatch(setToken(accessToken));

        const decoded = jwtDecode(accessToken);
        const role = String(decoded?.role || "").toUpperCase();

        if (role !== "AGENT") {
          throw new Error("This account is not allowed on support agent login.");
        }

        clearOtherPanelSessions(role);
        dispatch(setRole(role));
        navigate("/support-agent/tickets", { replace: true });
      } else {
        setIsValid(false);
        dispatch(setError(res?.message || "Invalid OTP"));
      }
    } catch (err) {
      setIsValid(false);
      dispatch(setError(err?.message || "Verification failed"));
    } finally {
      dispatch(setLoading(false));
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    if (!agentId) {
      dispatch(setError("Session expired. Please login again."));
      navigate("/support-agent/login", { replace: true });
      return;
    }

    try {
      dispatch(clearError());
      dispatch(setLoading(true));

      const res = await supportAgentResendOtp({ agentId });

      if (res?.success) {
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        setResendTimer(30);
        setCanResend(false);
      } else {
        dispatch(setError(res?.message || "Failed to resend OTP"));
      }
    } catch (err) {
      dispatch(setError(err?.message || "Failed to resend OTP"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (!agentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-md text-center">
          <p className="mb-4 text-gray-600">Session expired. Please login again.</p>
          <button
            type="button"
            onClick={() => navigate("/support-agent/login", { replace: true })}
            className="rounded-lg bg-black px-6 py-2 text-white"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40">
          <div className="h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

          <div className="p-8 sm:p-10">
            <div className="mb-9 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Verify Phone</h1>
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
                    ref={(el) => {
                      inputs.current[index] = el;
                    }}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`
                      h-14 w-12 sm:h-16 sm:w-14
                      rounded-lg border bg-white text-center text-2xl font-bold
                      transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20
                      ${
                        isValid
                          ? "border-gray-300 focus:border-black"
                          : "border-red-500 focus:border-red-600"
                      }
                    `}
                    disabled={loading || isSubmitting}
                  />
                ))}
              </div>

              {(!isValid || error) && (
                <p className="text-center text-sm text-red-600">
                  {error || "Please enter a valid 6-digit code"}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || otp.join("").length !== 6 || loading}
                className="w-full rounded-xl bg-black px-6 py-4 font-semibold tracking-wide text-white transition-all duration-300 hover:bg-gray-800 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-black/30 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  className={`font-medium text-black transition-colors ${
                    !canResend ? "cursor-not-allowed opacity-50" : "hover:text-gray-700"
                  }`}
                >
                  {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                </button>
              </p>
              <p className="mt-2 text-xs text-gray-500">Code expires in 5 minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
