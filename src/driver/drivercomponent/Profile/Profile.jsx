import React from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center justify-center relative h-14 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">PROFILE</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-gray-600 font-medium">No profile data to show</p>
        <p className="text-sm text-gray-500 mt-1">
          Your name and details will appear here when your profile is loaded.
        </p>
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
