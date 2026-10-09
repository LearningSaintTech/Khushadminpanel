import { Link } from "react-router-dom";
import { X } from "lucide-react";
import {
  BackToHub,
  FlowStep,
  PageHeader,
  Pagination,
  StatCard,
  fieldClass,
  inputClass,
  labelClass,
  tableScrollShell,
} from "../moneyFeatures/moneyFeaturesShared";

export {
  BackToHub,
  FlowStep,
  PageHeader,
  Pagination,
  StatCard,
  fieldClass,
  inputClass,
  labelClass,
  tableScrollShell,
};

export {
  btnOutline,
  btnPrimary,
  Field,
  FormSection,
  pageToolbar,
  tabActive,
  tabInactive,
  thClass,
  tableHeadClass,
} from "../Section/sectionShared";

export function fmtInr(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "₹0";
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function apiMessage(err) {
  if (err?.errors?.code === "AUTHOR_PROFILE_DELETED") {
    return "This creator deleted their community profile. The post cannot be restored.";
  }
  return err?.message || "Request failed";
}

export function unwrapCommunityData(res) {
  const root = res && typeof res === "object" ? res : {};
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) return root.data;
  return root;
}

export function communityPageMeta(res) {
  const unwrapped = unwrapCommunityData(res);
  const nested =
    unwrapped?.data && typeof unwrapped.data === "object" && !Array.isArray(unwrapped.data)
      ? unwrapped.data
      : null;
  const data =
    !Array.isArray(unwrapped?.items) &&
    !Array.isArray(unwrapped?.users) &&
    nested &&
    (Array.isArray(nested.items) || Array.isArray(nested.users))
      ? nested
      : unwrapped;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.users)
      ? data.users
      : extractCommunityList(res, ["users", "communityUsers"]);
  return {
    items,
    page: Number(data?.page) || 1,
    total: Number(data?.total) || 0,
    totalPages: Number(data?.totalPages) || 0,
    salesUnavailable: Boolean(data?.salesUnavailable),
    hasMore: Boolean(data?.hasMore),
    nextCursor: data?.nextCursor || null,
  };
}

function personName(value) {
  const name = String(value || "").trim();
  if (!name || name === "Deleted User") return "";
  return name;
}

export function authorLabel(author, fallbackId) {
  if (!author || typeof author !== "object") return shortId(fallbackId);
  const nested = author.user && typeof author.user === "object" ? author.user : null;
  return (
    personName(author.fullName) ||
    personName(author.name) ||
    personName(author.archivedCommunityName) ||
    personName(nested?.fullName) ||
    personName(nested?.name) ||
    author.username ||
    nested?.username ||
    author.usernameArchive ||
    nested?.usernameArchive ||
    shortId(author.userId || nested?.userId || author._id || nested?._id || fallbackId)
  );
}

export function isVideoMedia(media) {
  const kind = String(media?.kind || "").toLowerCase();
  const mime = String(media?.mimeType || media?.contentType || "").toLowerCase();
  const url = String(media?.url || "").toLowerCase().split("?")[0];
  return kind === "video" || mime.startsWith("video/") || /\.(mp4|mov|webm|m3u8|m4v)$/.test(url);
}

export function mediaThumb(row) {
  const media = Array.isArray(row?.media) ? row.media : [];
  const hit =
    media.find((m) => m?.kind === "thumbnail" && m?.url) ||
    media.find((m) => m?.kind === "image" && m?.url && !isVideoMedia(m)) ||
    media.find((m) => m?.url && !isVideoMedia(m));
  return hit?.url || "";
}

export function videoMedia(row) {
  const media = Array.isArray(row?.media) ? row.media : [];
  return media.find((m) => m?.url && isVideoMedia(m)) || null;
}

export function ContentMedia({ media, compact = false }) {
  const list = Array.isArray(media) ? media : [];
  const video = list.find((m) => m?.url && isVideoMedia(m));
  const poster =
    list.find((m) => m?.kind === "thumbnail" && m?.url)?.url ||
    list.find((m) => m?.url && !isVideoMedia(m) && m?.kind !== "video")?.url ||
    "";
  const images = list.filter(
    (m) => m?.url && !isVideoMedia(m) && m?.kind !== "thumbnail",
  );

  if (!video && images.length === 0 && !poster) {
    return <p className="text-stone-500">No media</p>;
  }

  return (
    <div className="space-y-2">
      {video ? (
        <video
          key={video.url}
          className={compact ? "h-16 w-16 rounded-md bg-black object-cover" : "max-h-80 w-full rounded-lg bg-black"}
          controls={!compact}
          playsInline
          preload="metadata"
          poster={poster || undefined}
          src={video.url}
        />
      ) : null}
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((m, i) => (
            <img
              key={m.key || m.url || i}
              src={m.url}
              alt=""
              className={compact ? "h-16 w-16 rounded-md object-cover" : "h-24 w-24 rounded-md object-cover"}
            />
          ))}
        </div>
      ) : null}
      {!video && images.length === 0 && poster ? (
        <img src={poster} alt="" className="h-24 w-24 rounded-md object-cover" />
      ) : null}
    </div>
  );
}

export function CommunityBackLink({ to }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
    >
      ← Community
    </Link>
  );
}

export function DetailSection({ title, children }) {
  return (
    <div className="mb-2 rounded-lg border border-border bg-canvas-muted/40 p-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </p>
      <div className="text-[11px] text-stone-800">{children}</div>
    </div>
  );
}

export function DetailDrawer({ title, subtitle, onClose, children, busy }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-stone-900">{title}</h2>
            {subtitle ? (
              <p className="truncate font-mono text-[10px] text-stone-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-canvas-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}

export function shortId(id) {
  const s = String(id || "");
  if (s.length <= 10) return s || "—";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function statusPill(status) {
  const s = String(status || "").toLowerCase();
  if (s === "hidden") {
    return "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800";
  }
  if (s === "removed") {
    return "rounded-full bg-danger-bg px-2 py-0.5 text-[10px] font-medium text-danger";
  }
  if (s === "draft" || s === "processing") {
    return "rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] font-medium text-stone-700";
  }
  if (["available", "paid", "verified", "published", "active", "approved", "dismissed"].some((k) => s.includes(k))) {
    return "rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success";
  }
  if (["pending", "pending_return_window", "open"].some((k) => s.includes(k))) {
    return "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800";
  }
  if (["reject", "cancel", "inactive", "actioned"].some((k) => s.includes(k))) {
    return "rounded-full bg-danger-bg px-2 py-0.5 text-[10px] font-medium text-danger";
  }
  return "rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] font-medium text-stone-700";
}

export function communityRowId(row) {
  return (
    row?.payoutId ||
    row?.id ||
    row?._id ||
    row?.projectId ||
    row?.projectCategoryId ||
    ""
  );
}

export function extractCommunityList(res, extraKeys = []) {
  const root = res && typeof res === "object" ? res : {};
  const nested = root.data && typeof root.data === "object" ? root.data : null;
  const keys = ["items", "projects", "categories", ...extraKeys];
  const layers = [nested, nested?.data, root];
  for (const layer of layers) {
    if (!layer) continue;
    if (Array.isArray(layer)) return layer;
    for (const key of keys) {
      if (Array.isArray(layer[key])) return layer[key];
    }
  }
  return [];
}

export function extractCommunityRecord(res) {
  const root = res && typeof res === "object" ? res : {};
  const nested = root.data && typeof root.data === "object" ? root.data : null;
  if (nested?.project && typeof nested.project === "object") return nested.project;
  if (nested?.category && typeof nested.category === "object") return nested.category;
  if (nested?.report && typeof nested.report === "object") return nested.report;
  if (nested && !Array.isArray(nested) && (nested._id || nested.id || nested.name || nested.reason)) {
    return nested;
  }
  if (root._id || root.id) return root;
  return nested || root;
}
