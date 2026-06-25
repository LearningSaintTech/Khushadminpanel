import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function resolveOriginFromUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value.replace(/\/api\/?$/, "") || value);
    return url.origin;
  } catch {
    return "";
  }
}

function securityHeadersPlugin({ apiOrigin, cdnOrigin }) {
  return {
    name: "khush-security-headers",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV !== "production") return html;

      const connectOrigins = ["'self'", "ws:", "wss:"];
      if (apiOrigin) connectOrigins.push(apiOrigin);
      if (cdnOrigin && cdnOrigin !== apiOrigin) connectOrigins.push(cdnOrigin);

      const imgOrigins = ["'self'", "data:", "blob:", "https:"];
      if (cdnOrigin) imgOrigins.push(cdnOrigin);

      const connectSrc = [
        ...connectOrigins,
        "https://maps.googleapis.com",
      ];
      const frameSrc = [
        "https://www.google.com",
        "https://maps.google.com",
        "https://maps.googleapis.com",
      ];
      const csp = [
        "default-src 'self'",
        "script-src 'self' https://maps.googleapis.com",
        "style-src 'self' 'unsafe-inline'",
        `img-src ${imgOrigins.join(" ")}`,
        "font-src 'self' data:",
        `connect-src ${connectSrc.join(" ")}`,
        `frame-src ${frameSrc.join(" ")}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; ");

      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`
      );
    },
  };
}

function resolveBuildAppEnv(env, mode) {
  const v = String(env.VITE_APP_ENV ?? "").toLowerCase().trim();
  if (v === "dev" || v === "development") return "dev";
  if (v === "prod" || v === "production") return "prod";
  return mode === "development" ? "dev" : "prod";
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = resolveOriginFromUrl(env.VITE_API_BASE_URL || env.VITE_API_URL || "");
  const cdnOrigin = resolveOriginFromUrl(env.VITE_CDN_BASE_URL || "");
  const exposeDevServerOnLan = env.VITE_DEV_LAN === "true";
  const isProdApp = resolveBuildAppEnv(env, mode) === "prod";

  const devProxy = apiOrigin
    ? {
        "/api": {
          target: apiOrigin,
          changeOrigin: true,
        },
        "/socket.io": {
          target: apiOrigin,
          changeOrigin: true,
          ws: true,
        },
      }
    : undefined;

  if (mode === "development" && !apiOrigin) {
    console.warn(
      "[Khushadminpanel] VITE_API_BASE_URL is not set — dev /api proxy disabled. Add it to .env.",
    );
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      securityHeadersPlugin({ apiOrigin, cdnOrigin }),
    ],
    esbuild: {
      drop: isProdApp ? ["console", "debugger"] : [],
    },
    server: {
      host: exposeDevServerOnLan ? true : "localhost",
      port: 5173,
      strictPort: true,
      ...(devProxy ? { proxy: devProxy } : {}),
    },
    preview: {
      host: exposeDevServerOnLan ? true : "localhost",
      port: 5173,
      strictPort: true,
    },
  };
});
