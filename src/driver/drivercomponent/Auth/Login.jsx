import React, { useState } from "react";
import logo from "../../../assets/images/khush.svg";
import bgPattern from "../../../assets/images/khushbackground.svg";
import { useNavigate } from "react-router-dom";
import { driverLogin } from "../../apis/driverApi";

const COUNTRY_CODE = "+91";

export default function Login() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    const trimmed = (phoneNumber || "").trim().replace(/\D/g, "");
    if (!trimmed || trimmed.length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await driverLogin({
        countryCode: COUNTRY_CODE,
        phoneNumber: trimmed,
      });
      const payload = data?.data ?? data;
      const userId = payload?.userId ?? data?.userId ?? data?.user?._id;
      const id = userId != null ? String(userId) : null;
      if (id) {
        sessionStorage.setItem("driverUserId", id);
        if (rememberMe) sessionStorage.setItem("driverPhone", trimmed);
        navigate("/driver/verify-otp", { state: { userId: id, phone: trimmed } });
      } else {
        setError("Could not send OTP. Please try again.");
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Something went wrong";
      if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
        setError("Too many attempts. Please wait 5 minutes and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col ">
      <div
        className="flex-1 flex justify-center pt-20 bg-top bg-no-repeat"
        style={{
          backgroundImage: `url(${bgPattern})`,
          backgroundSize: "contain",
        }}
      >
        <img src={logo} alt="Khush Logo" className="w-52 object-contain" />
      </div>

      <div className="bg-black rounded-t-[60px] px-6 pt-10 pb-16 text-white">
        <label className="block text-sm mb-3">Mobile No.</label>

        <div className="bg-white flex items-center px-3 py-3 text-black">
          <span className="mr-2 text-sm">{COUNTRY_CODE}</span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit number"
            className="w-full outline-none bg-transparent text-sm"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            className="mr-2"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="text-sm">Remember me</span>
        </div>

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full mt-8 bg-white text-black py-3 rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-70"
        >
          {loading ? "Sending OTP…" : "Continue"}
          <span className="text-lg">›</span>
        </button>
      </div>
    </div>
  );
}