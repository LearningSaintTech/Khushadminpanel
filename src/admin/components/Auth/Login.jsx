import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { loginUser } from "../../apis/Authapi";
import { setLoading, setError, clearError } from "../../../redux/GlobalSlice";
import { selectLoading, selectError } from "../../../redux/GlobalSelector";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isValid, setIsValid] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted:", phoneNumber);

    const cleaned = phoneNumber.replace(/\D/g, "");
    console.log("Cleaned phone number:", cleaned);

    if (cleaned.length !== 10) {
      setIsValid(false);
      console.log("Invalid phone number");
      return;
    }

    setIsValid(true);
    dispatch(clearError());
    dispatch(setLoading(true));

    try {
      console.log("Sending OTP...");

      // ✅ Call loginUser instead of registerUser
      const res = await loginUser({
        countryCode: "+91",
        phoneNumber: cleaned,
      });

      console.log("Backend response:", res);

      if (res?.success) {
        localStorage.setItem("admin_userId", res.data.userId);
  localStorage.setItem("admin_phone", cleaned);
        console.log("OTP received:", res.data.otp);
        // Navigate to OTP page with userId & OTP
        navigate("/admin/otp", {
          state: {
            phone: cleaned,
            userId: res.data.userId,
            OTP: res.data.otp,
          },
        });
      }
    } catch (err) {
      console.error("Error sending OTP:", err);
      dispatch(
        setError(err?.response?.data?.message || "Something went wrong"),
      );
    } finally {
      dispatch(setLoading(false));
      console.log("Loading finished");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          <div className="p-8 sm:p-10">
            <div className="text-center mb-9">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Welcome Back Admin
              </h1>
              <p className="mt-3 text-gray-600">
                Log in with your phone number
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">+91</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setIsValid(true);
                      dispatch(clearError());
                      console.log("Phone input:", e.target.value);
                    }}
                    placeholder="XXXXXXXXXX"
                    className={`w-full pl-16 pr-5 py-4 bg-white border ${isValid ? "border-gray-300" : "border-red-500"} rounded-xl focus:outline-none transition-all`}
                    maxLength={15}
                    disabled={loading}
                  />
                </div>
                {!isValid && (
                  <p className="mt-2 text-sm text-red-600">
                    Please enter a valid 10-digit number
                  </p>
                )}
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={!phoneNumber.trim() || loading}
                className="w-full py-4 px-6 bg-black text-white rounded-xl hover:bg-gray-800"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
