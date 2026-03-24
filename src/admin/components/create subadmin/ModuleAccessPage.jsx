import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { moduleAccessApi } from "../../apis/ModuleAccessapi";

const ROLE_OPTIONS = [
  { value: "subadmin", label: "Subadmin" },
  { value: "super_subadmin", label: "Super Subadmin" },
];

export default function ModuleAccessPage() {
  const [role, setRole] = useState("subadmin");
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleLabel = useMemo(
    () => ROLE_OPTIONS.find((r) => r.value === role)?.label || role,
    [role]
  );

  const loadMetaAndRole = async (targetRole) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [meta, roleAccess] = await Promise.all([
        moduleAccessApi.getMeta(),
        moduleAccessApi.getRoleAccess(targetRole),
      ]);
      setAvailableModules(meta?.availableModules || []);
      setSelectedModules(roleAccess?.allowedModules || []);
    } catch (e) {
      setError(e?.message || "Failed to load module access");
      setAvailableModules([]);
      setSelectedModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetaAndRole(role);
  }, [role]);

  const toggleModule = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((m) => m !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const selectAll = () => setSelectedModules([...availableModules]);
  const clearAll = () => setSelectedModules([]);

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await moduleAccessApi.setRoleAccess({
        role,
        allowedModules: selectedModules,
      });
      setSuccess(`Updated module permissions for ${roleLabel}.`);
    } catch (e) {
      setError(e?.message || "Failed to save module access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={22} className="text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-900">Module Access Control</h1>
      </div>

      <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[220px]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={selectAll}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
        >
          Clear All
        </button>
      </div>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading modules...</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600 mb-3">
            Choose which modules <span className="font-medium text-gray-900">{roleLabel}</span> can access.
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

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

