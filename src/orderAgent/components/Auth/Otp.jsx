import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { orderAgentResendOtp, orderAgentVerifyOtp } from "../../apis/orderAgentApi";
import {
  setLoading,
  setError,
  clearError,
  setToken,
  setRole,
} from "../../../redux/GlobalSlice";
import { clearOtherPanelSessions } from "../../../utils/authRole";
import { selectLoading, selectError } from "../../../redux/GlobalSelector";

const STORAGE_AGENT_ID = "orderAgent_agentId";
const STORAGE_PHONE = "orderAgent_phone";

export default function OrderAgentOtp() {
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
    location.state?.phone || localStorage.getItem(STORAGE_PHONE) || "XXXXXXXXXX";
  const agentId =
    location.state?.agentId || localStorage.getItem(STORAGE_AGENT_ID) || null;

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
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setIsValid(false);
      return;
    }
    if (!agentId) {
      navigate("/order-agent/login", { replace: true });
      return;
    }

    setIsSubmitting(true);
    dispatch(clearError());
    dispatch(setLoading(true));

    try {
      const res = await orderAgentVerifyOtp({ agentId, otp: code });
      if (res?.success && res.data?.accessToken) {
        const token = res.data.accessToken;
        localStorage.setItem("token", token);
        if (res.data.refreshToken) {
          localStorage.setItem("refreshToken", res.data.refreshToken);
        }
        const role = jwtDecode(token)?.role || "order_agent";
        dispatch(setToken(token));
        dispatch(setRole(String(role).toUpperCase()));
        clearOtherPanelSessions("ORDER_AGENT");
        navigate("/order-agent/orders", { replace: true });
      } else {
        dispatch(setError(res?.message || "Invalid OTP"));
      }
    } catch (err) {
      dispatch(setError(err?.response?.data?.message || err?.message || "Verification failed"));
    } finally {
      setIsSubmitting(false);
      dispatch(setLoading(false));
    }
  };

  const handleResend = async () => {
    if (!canResend || !agentId) return;
    try {
      await orderAgentResendOtp({ agentId });
      setCanResend(false);
      setResendTimer(30);
    } catch (err) {
      dispatch(setError(err?.response?.data?.message || "Could not resend OTP"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-stone-900">Verify OTP</h1>
        <p className="mt-2 text-center text-sm text-stone-600">Sent to +91 {phone}</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-lg border border-stone-300 text-center text-lg font-semibold"
              />
            ))}
          </div>
          {!isValid && <p className="text-center text-sm text-red-600">Enter 6-digit OTP</p>}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full rounded-xl bg-stone-900 py-4 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Verifying…" : "Continue"}
          </button>
          <p className="text-center text-sm text-stone-600">
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              className="font-medium text-stone-900 disabled:opacity-50"
            >
              {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
