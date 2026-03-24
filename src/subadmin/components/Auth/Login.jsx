import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { subadminApi } from "../../apis/subadminApi";

const COUNTRY_CODE = "+91";

export default function SubadminLogin() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    const trimmed = (phoneNumber || "").trim().replace(/\D/g, "");
    if (!trimmed || trimmed.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setError("");
    setLoading(true);
    try {
      console.log("[SUBADMIN_LOGIN][REQ]", {
        countryCode: COUNTRY_CODE,
        phoneNumber: trimmed,
      });
      const res = await subadminApi.login({
        countryCode: COUNTRY_CODE,
        phoneNumber: trimmed,
      });
      const payload = res?.data ?? res;
      const userId = payload?.userId;
      console.log("[SUBADMIN_LOGIN][RES]", {
        hasData: !!payload,
        userId: userId ? String(userId) : null,
        message: payload?.message,
      });
      if (!userId) throw new Error("Could not send OTP. Please try again.");

      sessionStorage.setItem("subadminUserId", String(userId));
      sessionStorage.setItem("subadminPhone", trimmed);
      navigate("/subadmin/verify-otp", { state: { userId: String(userId), phone: trimmed } });
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Something went wrong";
      console.log("[SUBADMIN_LOGIN][ERR]", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="h-1 bg-black" />
          <div className="p-8 sm:p-10">
            <div className="text-center mb-9">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Subadmin Login</h1>
              <p className="mt-2 text-gray-600">Log in with your phone number</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">{COUNTRY_CODE}</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="XXXXXXXXXX"
                    maxLength={15}
                    disabled={loading}
                    className="w-full pl-16 pr-5 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="w-full py-4 px-6 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

