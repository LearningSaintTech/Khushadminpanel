import { useEffect } from "react";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import { isMutatingControl } from "../utils/moduleAccessLevels";
import { setViewOnlyWritesBlocked } from "../utils/staffWriteGate";

export default function ViewOnlyGuard({ enabled, children }) {
  useEffect(() => {
    setViewOnlyWritesBlocked(enabled);
    return () => setViewOnlyWritesBlocked(false);
  }, [enabled]);

  const block = (event) => {
    if (!enabled) return;
    const el = event.target?.closest?.("a, button, [role='button'], input[type='submit']");
    if (!el) return;
    if (!isMutatingControl(el)) return;
    event.preventDefault();
    event.stopPropagation();
    toast.error("View-only access — you cannot change data in this module.", {
      id: "subadmin-view-only",
    });
  };

  const blockSubmit = (event) => {
    if (!enabled) return;
    if (event.target?.closest?.("[data-view-safe]")) return;
    event.preventDefault();
    event.stopPropagation();
    toast.error("View-only access — you cannot change data in this module.", {
      id: "subadmin-view-only",
    });
  };

  return (
    <div
      className={enabled ? "khush-view-only" : undefined}
      data-view-only={enabled ? "true" : undefined}
      onClickCapture={block}
      onSubmitCapture={blockSubmit}
    >
      {enabled ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-gold-100 bg-gold-50 px-3 py-2 text-[12px] text-gold-600">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">View-only access.</strong> You can browse this
            module, but create, edit, delete, and status updates are disabled.
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
