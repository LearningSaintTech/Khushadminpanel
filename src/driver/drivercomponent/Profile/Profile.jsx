import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LogOut, Edit3, Mail, MapPin, Phone, User } from "lucide-react";
import { driverGetProfile, driverLogout } from "../../apis/driverApi";
import { logout } from "../../../redux/GlobalSlice";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    driverGetProfile()
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res ?? {};
        setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(typeof err === "string" ? err : "Failed to load profile");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await driverLogout();
    } catch {
      // Still clear local state even if API fails (e.g. token expired)
    } finally {
      dispatch(logout());
      sessionStorage.removeItem("driverUserId");
      sessionStorage.removeItem("driverPhone");
      setLogoutLoading(false);
      navigate("/driver/login", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <div className="flex items-center justify-center relative h-14 bg-white border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">PROFILE</h1>
        </div>
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-gray-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <div className="flex items-center justify-center relative h-14 bg-white border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">PROFILE</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-red-600 font-medium">{error}</p>
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

  const avatarUrl = profile?.profileImage || "https://i.pravatar.cc/120";
  const hasDetails =
    profile?.name ||
    profile?.email ||
    profile?.address ||
    profile?.city ||
    profile?.pinCode ||
    profile?.licenseNumber ||
    profile?.bikeNumber;

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <div className="flex items-center justify-center relative h-14 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">PROFILE</h1>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 pb-24">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col items-center pt-6 pb-4">
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">
              {profile?.name || "—"}
            </h2>
            {profile?.phoneNumber && (
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} />
                {profile?.countryCode || "+91"} {profile.phoneNumber}
              </p>
            )}
          </div>

          {hasDetails && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
              {profile?.email && (
                <div className="flex items-start gap-3 text-sm">
                  <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{profile.email}</span>
                </div>
              )}
              {(profile?.address || profile?.city || profile?.pinCode) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700">
                    {[profile.address, profile.city, profile.pinCode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
              {profile?.licenseNumber && (
                <div className="flex items-start gap-3 text-sm">
                  <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700">
                    License: {profile.licenseNumber}
                    {profile.licenseExpiry
                      ? ` · Expires ${new Date(profile.licenseExpiry).toLocaleDateString()}`
                      : ""}
                  </span>
                </div>
              )}
              {profile?.bikeNumber && (
                <p className="text-sm text-gray-600 pl-7">
                  Bike: {profile.bikeNumber}
                  {profile.bikeModel || profile.bikeBrand
                    ? ` · ${[profile.bikeBrand, profile.bikeModel].filter(Boolean).join(" ")}`
                    : ""}
                </p>
              )}
            </div>
          )}

          {!hasDetails && (
            <p className="px-4 pb-4 text-sm text-gray-500 text-center">
              Complete your profile so we can verify your details.
            </p>
          )}
        </div>

        <button
          onClick={() => navigate("/driver/edit-profile")}
          className="mt-4 w-full h-12 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <Edit3 size={18} />
          Edit Profile
        </button>

        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="mt-4 w-full h-12 border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-70"
        >
          <LogOut size={18} />
          {logoutLoading ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  );
}
