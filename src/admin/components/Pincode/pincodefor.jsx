import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPincode, updatePincode } from "../../apis/PincodeApi";

const PincodeForm = () => {
  const navigate = useNavigate();
  const { pincode } = useParams(); // edit mode if exists

  const [pinCode, setPinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pincode) {
      setPinCode(pincode); // 👈 because backend uses pincode in URL
    }
  }, [pincode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pinCode) {
      setError("Pincode is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (pincode) {
        // ✅ update
        await updatePincode(pincode, { pinCode });
      } else {
        // ✅ create
        await createPincode({ pinCode });
      }

      navigate("/admin/pincode");
    } catch (err) {
      console.error("Save error:", err);
      setError(err || "Failed to save pincode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/admin/pincode")}
          className="mb-4 text-gray-600 hover:text-black"
        >
          ← Back to Pincodes
        </button>

        <h1 className="text-2xl font-bold mb-6">
          {pincode ? "Edit Pincode" : "Add Pincode"}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl border space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Pincode
            </label>
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
              placeholder="Enter pincode"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/pincode")}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-lg hover:opacity-90"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PincodeForm;
