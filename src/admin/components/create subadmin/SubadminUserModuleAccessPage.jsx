import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { moduleAccessApi } from "../../apis/ModuleAccessapi";
import {
  getSubAdminById,
  getSubAdminModuleAccess,
  setSubAdminModuleAccess,
} from "../../apis/subadminapi";

export default function SubadminUserModuleAccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [subadminName, setSubadminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [meta, byUser, profile] = await Promise.all([
        moduleAccessApi.getMeta(),
        getSubAdminModuleAccess(id),
        getSubAdminById(id),
      ]);
      setAvailableModules(meta?.availableModules || []);
      setSelectedModules(byUser?.data?.allowedModules || byUser?.allowedModules || []);
      setSubadminName(profile?.data?.name || "");
    } catch (e) {
      setError(e?.message || "Failed to load module access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const toggleModule = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((m) => m !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await setSubAdminModuleAccess(id, selectedModules);
      setSuccess("Module access updated successfully.");
    } catch (e) {
      setError(e?.message || "Failed to save module access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate("/admin/subadmin")}
        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-4"
      >
        <ArrowLeft size={16} />
        Back to Sub-Admins
      </button>

      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={22} className="text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-900">
          User Module Access {subadminName ? `- ${subadminName}` : ""}
        </h1>
      </div>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600 mb-3">
            Select modules for this specific user (ID-based override).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableModules.map((moduleKey) => (
              <label
                key={moduleKey}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedModules.includes(moduleKey)}
                  onChange={() => toggleModule(moduleKey)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-800">{moduleKey}</span>
              </label>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedModules([])}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

