import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../src/admin/components/common components/sidebar.jsx");

let s = fs.readFileSync(file, "utf8");

if (!s.includes("const Sidebar = () => {")) {
  console.error("Unexpected sidebar.jsx structure");
  process.exit(1);
}

s = s.replace(
  "const Sidebar = () => {",
  `const Sidebar = ({ basePath = "/admin", filterByModules = false }) => {
  const ap = (suffix) => {
    const t = String(suffix || "").replace(/^\\/+/,"");
    return \`\${basePath}/\${t}\`.replace(/\\/+/g, "/");
  };
`
);

s = s.replace(/navigate\("\/admin"\)/g, "navigate(basePath)");
s = s.replace(/window\.location\.href = "\/"/g, 'window.location.href = basePath + "/"');

s = s.replace(/to="\/admin\/([^"]+)"/g, (_, p) => `to={ap("${p}")}`);
s = s.replace(/isActive\("\/admin\/([^"]+)"\)/g, (_, p) => `isActive(ap("${p}"))`);
s = s.replace(/location\.pathname === "\/admin\/([^"]+)"/g, (_, p) => `location.pathname === ap("${p}")`);
s = s.replace(/location\.pathname\.includes\("\/admin\/([^"]+)"\)/g, (_, p) => `location.pathname.includes(ap("${p}"))`);

s = s.replace(
  'const isActive = (path) => location.pathname === path;',
  'const isActive = (path) => location.pathname === path || location.pathname.replace(/\\/+/g, "/") === path;'
);

s = s.replace(
  'const isNotificationSectionActive = () => location.pathname.startsWith("/admin/notifications");',
  "const isNotificationSectionActive = () => location.pathname.startsWith(ap(\"notifications\"));"
);

fs.writeFileSync(file, s);
console.log("Patched sidebar paths");
