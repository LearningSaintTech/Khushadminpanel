import React, { useState } from "react";
import Khush from "../../../assets/images/khush.svg";
import { useNavigate } from "react-router-dom";
import { loginInfluencer } from "../../influencerapis/authapi"; // ✅ import API

export default function Login() {
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (phoneNumber.length !== 10) {
      setError("Please enter valid 10 digit mobile number");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await loginInfluencer("+91", phoneNumber);

      console.log("Login Success:", response);

      // navigate to verify page
      navigate("/influencer/verify-otp");

    } catch (err) {
      console.error("Login Failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-8 sm:p-10 space-y-8">

          {/* Logo */}
          <div className="text-center space-y-5">
            <img
              src={Khush}
              alt="Khush Logo"
              className="w-24 sm:w-32 mx-auto"
            />

            <h1 className="text-xl font-bold text-gray-900">
              Welcome to Khush Influencer Panel
            </h1>
          </div>

          {/* Form */}
          <div className="space-y-6">

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Mobile Number
              </label>

              <div className="flex rounded-xl overflow-hidden border border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 bg-white">
                <span className="inline-flex items-center px-5 py-4 bg-gray-100 text-gray-700 font-medium text-sm border-r border-gray-300">
                  +91
                </span>

                <input
                  type="tel"
                  placeholder="Enter your number"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-4 outline-none"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
            </div>

            {/* Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 rounded-xl transition"
            >
              {loading ? "Sending OTP..." : "Continue →"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}