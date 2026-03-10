import React from "react";
import { useNavigate } from "react-router-dom";

export default function EditProfileScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 text-gray-700 text-2xl font-light">
          ←
        </button>
        <h1 className="text-lg font-semibold mx-auto tracking-wide">EDIT PROFILE</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-gray-600 font-medium">No profile data to edit</p>
        <p className="text-sm text-gray-500 mt-1">
          When your profile is available, you can edit it here.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
