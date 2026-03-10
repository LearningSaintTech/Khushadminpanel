import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";

import Khush from "../../../assets/images/khushh.svg";
import { verifyOtp, resendOtp } from "../../influencerapis/authapi";
import { setToken, setRole, setUser } from "../../../redux/GlobalSlice";

export default function Otp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const reduxToken = useSelector((s) => s.global.token);
  const reduxRole = useSelector((s) => s.global.role);

  const mobile = state?.mobile || "xxxxxxxxxx";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  // Auto focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle paste (very useful for OTP)
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);

      // Focus last filled or last input
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value === "") return; // allow backspace

    const newOtp = [...otp];
    newOtp[index] = value[0] || ""; // take only first digit
    setOtp(newOtp);

    // Auto move to next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const res = await verifyOtp(userId, code);
      const token = res?.accessToken || res?.data?.accessToken;

      if (!token) throw new Error("No token received");

      const decoded = jwtDecode(token);
      const role = (decoded?.role || decoded?.userRole || decoded?.type || "").toUpperCase();

      dispatch(setToken(token));
      dispatch(setRole(role));
      dispatch(setUser(decoded));

      // Role-based navigation
      const routes = {
        ADMIN: "/admin/dashboard",
        SUBADMIN: "/subadmin/dashboard",
        DRIVER: "/driver/dashboard",
        INFLUENCER: "/influencer/dashboard",
      };

      navigate(routes[role] || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimer(30);
    setError("");

    try {
      const userId = localStorage.getItem("userId");
      await resendOtp(userId);
      // You can show success toast here if you have one
    } catch (err) {
      setError("Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <img src={Khush} alt="Logo" className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">
            Verify your mobile number
          </h2>
          <p className="text-gray-500 mt-2">
            Enter OTP sent to +91 {mobile}
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onFocus={(e) => e.target.select()}
              className={`w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg outline-none transition-all
                ${
                  digit
                    ? "border-black bg-gray-50"
                    : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:bg-white"
                }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-center text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
          className="w-full bg-black text-white py-3.5 rounded-xl font-medium
            hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="text-center mt-6 text-sm text-gray-600">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-blue-600 font-medium hover:underline"
            >
              Resend OTP
            </button>
          ) : (
            <p>
              Resend OTP in <span className="font-semibold">{timer}s</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}