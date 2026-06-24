import { getSafeHttpHref } from "../utils/safeUrl.util.js";

/**
 * External link — only renders for http(s) URLs (blocks javascript: / data: from API payloads).
 */
export default function SafeExternalLink({ href, children, className, title, ...rest }) {
  const safeHref = getSafeHttpHref(href);
  if (!safeHref) return null;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      {...rest}
    >
      {children}
    </a>
  );
}
