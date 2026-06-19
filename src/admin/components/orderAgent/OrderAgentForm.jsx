import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  createOrderAgent,
  getOrderAgentById,
  updateOrderAgent,
} from "../../apis/OrderAgentapi";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm";

export default function OrderAgentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    agentCode: "",
    status: "OPEN",
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getOrderAgentById(id);
        const data = res?.data?.data ?? res?.data;
        setForm({
          name: data?.name || "",
          phoneNumber: data?.phoneNumber || "",
          agentCode: data?.agentCode || "",
          status: data?.status || "OPEN",
        });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load agent");
        navigate(ap("order-agents"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate, ap]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateOrderAgent(id, form);
        toast.success("Order agent updated");
      } else {
        await createOrderAgent(form);
        toast.success("Order agent created");
      }
      navigate(ap("order-agents"));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-4 text-lg font-semibold">
        {isEdit ? "Edit order agent" : "Create order agent"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <label className="block text-sm font-medium text-stone-700">
          Name
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Phone number
          <input
            required
            className={inputClass}
            value={form.phoneNumber}
            onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Agent code
          <input
            required
            className={inputClass}
            value={form.agentCode}
            onChange={(e) => setForm((f) => ({ ...f, agentCode: e.target.value }))}
            placeholder="e.g. OA-001"
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Status
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate(ap("order-agents"))}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
