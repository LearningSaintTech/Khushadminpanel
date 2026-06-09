import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { decodeTokenRole } from "../../../utils/authRole";
import { setLoading, setError, clearError } from "../../../redux/GlobalSlice";
import { selectLoading, selectError } from "../../../redux/GlobalSelector";
import { supportAgentLogin } from "../../apis/supportAgentApi";

const STORAGE_AGENT_ID = "supportAgent_agentId";
const STORAGE_PHONE = "supportAgent_phone";

export default function SupportAgentLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isValid, setIsValid] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const reduxToken = useSelector((state) => state.global?.token);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  useEffect(() => {
    if (rehydrated !== true) return;
    const token =
      reduxToken ??
      (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (decodeTokenRole(token) === "AGENT") {
      navigate("/support-agent/tickets", { replace: true });
    }
  }, [rehydrated, reduxToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.length !== 10) {
      setIsValid(false);
      return;
    }

    setIsValid(true);
    dispatch(clearError());
    dispatch(setLoading(true));

    try {
      const res = await supportAgentLogin({ countryCode: "+91", phoneNumber: cleaned });

      if (res?.success) {
        const agentId = res.data?.agentId;
        if (!agentId) {
          dispatch(setError("Could not send OTP. Please try again."));
          return;
        }
        localStorage.setItem(STORAGE_AGENT_ID, String(agentId));
        localStorage.setItem(STORAGE_PHONE, cleaned);
        navigate("/support-agent/otp", {
          state: {
            phone: cleaned,
            agentId: String(agentId),
            OTP: res.data?.otp,
          },
        });
      } else {
        dispatch(setError(res?.message || "Could not send OTP. Please try again."));
      }
    } catch (err) {
      dispatch(setError(err?.message || err?.response?.data?.message || "Something went wrong"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          <div className="p-8 sm:p-10">
            <div className="mb-9 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Support Agent</h1>
              <p className="mt-3 text-gray-600">Log in with your phone number</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="font-medium text-gray-500">+91</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setIsValid(true);
                      dispatch(clearError());
                    }}
                    placeholder="XXXXXXXXXX"
                    className={`w-full rounded-xl border bg-white py-4 pl-16 pr-5 transition-all focus:outline-none ${
                      isValid ? "border-gray-300" : "border-red-500"
                    }`}
                    maxLength={15}
                    disabled={loading}
                  />
                </div>
                {!isValid && (
                  <p className="mt-2 text-sm text-red-600">Please enter a valid 10-digit number</p>
                )}
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={!phoneNumber.trim() || loading}
                className="w-full rounded-xl bg-black px-6 py-4 text-white hover:bg-gray-800 disabled:opacity-60"
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
