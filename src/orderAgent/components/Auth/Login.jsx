import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { decodeTokenRole } from "../../../utils/authRole";
import { setLoading, setError, clearError } from "../../../redux/GlobalSlice";
import { selectLoading, selectError } from "../../../redux/GlobalSelector";
import { orderAgentLogin } from "../../apis/orderAgentApi";

const STORAGE_AGENT_ID = "orderAgent_agentId";
const STORAGE_PHONE = "orderAgent_phone";

export default function OrderAgentLogin() {
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
    if (decodeTokenRole(token) === "ORDER_AGENT") {
      navigate("/order-agent/orders", { replace: true });
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
      const res = await orderAgentLogin({ countryCode: "+91", phoneNumber: cleaned });
      if (res?.success) {
        const agentId = res.data?.agentId;
        if (!agentId) {
          dispatch(setError("Could not send OTP. Please try again."));
          return;
        }
        localStorage.setItem(STORAGE_AGENT_ID, String(agentId));
        localStorage.setItem(STORAGE_PHONE, cleaned);
        navigate("/order-agent/otp", {
          state: { phone: cleaned, agentId: String(agentId), OTP: res.data?.otp },
        });
      } else {
        dispatch(setError(res?.message || "Could not send OTP."));
      }
    } catch (err) {
      dispatch(setError(err?.message || err?.response?.data?.message || "Something went wrong"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
        <div className="p-8 sm:p-10">
          <div className="mb-9 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Order Agent</h1>
            <p className="mt-2 text-stone-600">Fulfilment &amp; processing workspace</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-stone-700">
                Mobile Number
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-medium text-stone-500">
                  +91
                </span>
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
                  className={`w-full rounded-xl border bg-white py-4 pl-16 pr-5 focus:outline-none ${
                    isValid ? "border-stone-300" : "border-red-500"
                  }`}
                  maxLength={15}
                  disabled={loading}
                />
              </div>
              {!isValid && (
                <p className="mt-2 text-sm text-red-600">Enter a valid 10-digit number</p>
              )}
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={!phoneNumber.trim() || loading}
              className="w-full rounded-xl bg-stone-900 px-6 py-4 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
