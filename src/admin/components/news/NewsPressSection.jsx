import { useEffect, useState } from "react";
import { ExternalLink, Globe, Newspaper, Video, Instagram, Youtube, Twitter, Linkedin, Facebook } from "lucide-react";
import { getActiveNews } from "../../apis/NewsApi";

function getLinkIcon(url = "") {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return <Instagram size={14} className="text-pink-600 shrink-0" />;
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return <Youtube size={14} className="text-red-600 shrink-0" />;
  if (lower.includes("twitter.com") || lower.includes("x.com")) return <Twitter size={14} className="text-sky-500 shrink-0" />;
  if (lower.includes("linkedin.com")) return <Linkedin size={14} className="text-blue-600 shrink-0" />;
  if (lower.includes("facebook.com")) return <Facebook size={14} className="text-blue-700 shrink-0" />;
  if (lower.includes(".mp4") || lower.includes("video")) return <Video size={14} className="text-purple-600 shrink-0" />;
  return <Globe size={14} className="text-stone-400 shrink-0" />;
}

function getLinkLabel(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const pathname = parsed.pathname.length > 1 ? parsed.pathname : "";
    return `${host}${pathname.length > 20 ? pathname.slice(0, 20) + "…" : pathname}`;
  } catch {
    return url;
  }
}

/**
 * Public Press / Media News component
 * Requirement:
 * - List active news via GET /api/news/getActive
 * - Sorted by sortOrder then newest.
 * - Hide the section if data is empty.
 * - UI: show name + logo. Render each URL in links as a tappable row.
 */
export default function NewsPressSection({ items: propItems = null, title = "In The Press & Media", subtitle = "Featured coverage and mentions across leading publications" }) {
  const [items, setItems] = useState(propItems || []);
  const [loading, setLoading] = useState(!propItems);
  const [error, setError] = useState("");

  useEffect(() => {
    if (propItems !== null) {
      setItems(propItems);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchActive = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getActiveNews();
        const data = res?.data?.data || res?.data || [];
        if (isMounted) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("[NewsPressSection] Failed to fetch active news:", err);
        if (isMounted) {
          setError(err?.message || "Failed to load press items");
          setItems([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActive();
    return () => {
      isMounted = false;
    };
  }, [propItems]);

  // If loading and no items
  if (loading && items.length === 0) {
    return (
      <section className="w-full py-8 px-4">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-6 w-48 bg-stone-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-stone-100 rounded mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl border border-border bg-white p-5 space-y-4">
                <div className="h-24 bg-stone-100 rounded-xl"></div>
                <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                <div className="h-8 bg-stone-50 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Hide the section completely if data is empty (per requirements)
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Newspaper size={13} />
            <span>Press & Media</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-stone-500 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <article
              key={item._id || item.id}
              className="group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-300"
            >
              {/* Media / Press Logo */}
              <div className="relative mb-4 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-stone-50 p-4 border border-stone-100">
                {item.logo ? (
                  <img
                    src={item.logo}
                    alt={item.name || "Press coverage"}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-stone-400 gap-1">
                    <Newspaper size={28} />
                    <span className="text-xs">No logo provided</span>
                  </div>
                )}
              </div>

              {/* Publication / Brand Name */}
              <h3 className="text-base font-bold text-stone-900 mb-3 line-clamp-1">
                {item.name}
              </h3>

              {/* Tappable Link Rows */}
              <div className="mt-auto space-y-2 pt-2 border-t border-border/70">
                {Array.isArray(item.links) && item.links.length > 0 ? (
                  item.links.map((linkUrl, idx) => (
                    <a
                      key={idx}
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 bg-stone-50 border border-stone-200/80 transition-all hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getLinkIcon(linkUrl)}
                        <span className="truncate">{getLinkLabel(linkUrl)}</span>
                      </div>
                      <ExternalLink size={13} className="shrink-0 text-stone-400 group-hover:text-brand-600 transition-colors" />
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic">No links available</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
