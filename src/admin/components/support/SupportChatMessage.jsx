import { formatDt } from "./supportShared";

export function mediaFileUrl(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const trimmed = item.trim();
    return trimmed || null;
  }
  if (typeof item === "object") {
    const url = item.url || item.imageUrl;
    return typeof url === "string" && url.trim() ? url.trim() : null;
  }
  return null;
}

function isMediaPlaceholder(text) {
  const t = String(text || "").trim().toLowerCase();
  return t === "(media)" || t === "[media]";
}

export function collectMessageMedia(msg = {}) {
  const images = [...(msg.images || [])];
  const videos = [...(msg.videos || [])];

  for (const attachment of msg.attachments || []) {
    const url = mediaFileUrl(attachment);
    if (!url) continue;
    const type = String(attachment?.type || "").toLowerCase();
    if (type.startsWith("video")) {
      videos.push({ ...attachment, url });
    } else {
      images.push({ ...attachment, url });
    }
  }

  return { images, videos };
}

export function hasMessageMedia(msg) {
  const { images, videos } = collectMessageMedia(msg);
  return images.length > 0 || videos.length > 0;
}

export function messageDisplayText(msg) {
  const text = String(msg?.message || msg?.text || "").trim();
  if (!text) return null;
  if (isMediaPlaceholder(text) && hasMessageMedia(msg)) return null;
  return text;
}

export function SupportMediaBlock({ images = [], videos = [], className = "" }) {
  const imageItems = images.map((item, i) => ({ item, i, kind: "image" }));
  const videoItems = videos.map((item, i) => ({ item, i, kind: "video" }));
  const items = [...imageItems, ...videoItems];

  if (!items.length) return null;

  return (
    <div className={`space-y-1.5 ${className || "mt-1.5"}`.trim()}>
      {items.map(({ item, i, kind }) => {
        const url = mediaFileUrl(item);
        if (!url) return null;
        if (kind === "video") {
          return (
            <video
              key={`video-${i}-${url}`}
              src={url}
              controls
              className="max-h-40 max-w-full rounded-lg border border-black/10 bg-black/5"
              preload="metadata"
            />
          );
        }
        return (
          <a key={`image-${i}-${url}`} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt=""
              className="max-h-40 max-w-full rounded-lg border border-black/10 object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </a>
        );
      })}
    </div>
  );
}

export function SupportChatMessageBubble({ msg }) {
  const sender = String(msg.senderType || msg.senderRole || "").toUpperCase();
  const isStaff = sender === "AGENT" || sender === "ADMIN";
  const isSystem = sender === "SYSTEM";
  const text = messageDisplayText(msg);
  const { images, videos } = collectMessageMedia(msg);

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-full bg-stone-100 px-3 py-1 text-center text-[10px] text-stone-600">
          {text || "System update"}
          <span className="ml-1 text-stone-400">{formatDt(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] ${
          isStaff ? "bg-brand-600 text-white" : "bg-canvas-muted text-stone-800"
        }`}
      >
        {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
        <SupportMediaBlock images={images} videos={videos} />
        {!text && !images.length && !videos.length ? (
          <p className="whitespace-pre-wrap italic opacity-70">Empty message</p>
        ) : null}
        <p className={`mt-1 text-[9px] ${isStaff ? "text-brand-100" : "text-stone-400"}`}>
          {formatDt(msg.createdAt)} · {sender || "USER"}
        </p>
      </div>
    </div>
  );
}
