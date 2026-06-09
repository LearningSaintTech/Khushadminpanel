import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../../context/AdminPanelBasePathContext";
import {
  createSupportAgent,
  getSupportAgentById,
  updateSupportAgent,
} from "../../../apis/SupportAgentapi";
import { btnPrimary, btnSecondary, inputClass, unwrapData } from "../supportShared";

const emptyForm = {
  name: "",
  phoneNumber: "",
  ticketNumber: "",
  status: "OPEN",
};

export default function SupportAgentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await getSupportAgentById(id);
        const agent = unwrapData(res)?.agent || unwrapData(res);
        setForm({
          name: agent.name || "",
          phoneNumber: agent.phoneNumber || "",
          ticketNumber: agent.ticketNumber || "",
          status: agent.status || "OPEN",
        });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load agent");
        navigate(ap("support-agents"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate, ap]);

  const onChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phoneNumber.trim() || !form.ticketNumber.trim()) {
      toast.error("Name, phone, and staff badge are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        ticketNumber: form.ticketNumber.trim() || undefined,
        status: form.status,
      };
      if (isEdit) {
        await updateSupportAgent(id, payload);
        toast.success("Agent updated");
      } else {
        await createSupportAgent(payload);
        toast.success("Agent created");
      }
      navigate(ap("support-agents"));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <button
        type="button"
        className={`${btnSecondary} flex items-center gap-1.5`}
        onClick={() => navigate(ap("support-agents"))}
      >
        <ArrowLeft size={14} />
        Back to agents
      </button>

      <h1 className="text-lg font-semibold text-stone-900">
        {isEdit ? "Edit Support Agent" : "Create Support Agent"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-stone-700">Name *</span>
          <input className={`${inputClass} w-full`} value={form.name} onChange={onChange("name")} required />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-stone-700">Phone number *</span>
          <input
            className={`${inputClass} w-full`}
            value={form.phoneNumber}
            onChange={onChange("phoneNumber")}
            placeholder="10-digit mobile"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-stone-700">Staff badge / ticket number *</span>
          <input
            className={`${inputClass} w-full`}
            value={form.ticketNumber}
            onChange={onChange("ticketNumber")}
            placeholder="Unique agent ID shown in chat"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-stone-700">Status</span>
          <select className={`${inputClass} w-full`} value={form.status} onChange={onChange("status")}>
            <option value="OPEN">OPEN — can receive tickets</option>
            <option value="CLOSED">CLOSED — not assignable</option>
          </select>
        </label>
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update agent" : "Create agent"}
        </button>
      </form>
    </div>
  );
}
