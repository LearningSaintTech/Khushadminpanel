import fs from "fs";

const md = fs.readFileSync("docs/SUPPORT_REFUNDS_MODULE_TEST_GUIDE.md", "utf8");

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

const lines = md.split(/\r?\n/);
const html = [];
let inTable = false;
let inCode = false;
let inList = false;
let listType = null;

function closeList() {
  if (inList) {
    html.push(listType === "ol" ? "</ol>" : "</ul>");
    inList = false;
    listType = null;
  }
}
function closeTable() {
  if (inTable) {
    html.push("</tbody></table>");
    inTable = false;
  }
}

for (const line of lines) {
  if (line.startsWith("```")) {
    closeList();
    closeTable();
    if (!inCode) {
      inCode = true;
      html.push("<pre><code>");
    } else {
      inCode = false;
      html.push("</code></pre>");
    }
    continue;
  }
  if (inCode) {
    html.push(esc(line) + "\n");
    continue;
  }

  if (/^\|/.test(line)) {
    closeList();
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (!inTable) {
      inTable = true;
      html.push(
        "<table><thead><tr>" +
          cells.map((c) => "<th>" + inline(c) + "</th>").join("") +
          "</tr></thead><tbody>"
      );
    } else {
      html.push(
        "<tr>" + cells.map((c) => "<td>" + inline(c) + "</td>").join("") + "</tr>"
      );
    }
    continue;
  }
  closeTable();

  if (/^---+$/.test(line.trim())) {
    closeList();
    html.push("<hr/>");
    continue;
  }
  if (/^### /.test(line)) {
    closeList();
    html.push("<h3>" + inline(line.slice(4)) + "</h3>");
    continue;
  }
  if (/^## /.test(line)) {
    closeList();
    html.push("<h2>" + inline(line.slice(3)) + "</h2>");
    continue;
  }
  if (/^# /.test(line)) {
    closeList();
    html.push("<h1>" + inline(line.slice(2)) + "</h1>");
    continue;
  }

  const checklist = line.match(/^- \[([ xX])\] (.+)/);
  const ul = line.match(/^- (.+)/);
  const ol = line.match(/^\d+\. (.+)/);
  if (checklist) {
    if (!inList || listType !== "ul") {
      closeList();
      inList = true;
      listType = "ul";
      html.push("<ul>");
    }
    const box = checklist[1].toLowerCase() === "x" ? "☑ " : "☐ ";
    html.push("<li>" + box + inline(checklist[2]) + "</li>");
    continue;
  }
  if (ul) {
    if (!inList || listType !== "ul") {
      closeList();
      inList = true;
      listType = "ul";
      html.push("<ul>");
    }
    html.push("<li>" + inline(ul[1]) + "</li>");
    continue;
  }
  if (ol) {
    if (!inList || listType !== "ol") {
      closeList();
      inList = true;
      listType = "ol";
      html.push("<ol>");
    }
    html.push("<li>" + inline(ol[1]) + "</li>");
    continue;
  }
  closeList();
  if (!line.trim()) continue;
  html.push("<p>" + inline(line) + "</p>");
}
closeList();
closeTable();

const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Khush Admin — Feature Test Guide</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1c1917; }
  h1 { font-size: 18pt; margin: 0 0 8pt; color: #0c0a09; border-bottom: 2px solid #b45309; padding-bottom: 6pt; }
  h2 { font-size: 13pt; margin: 16pt 0 6pt; color: #292524; page-break-after: avoid; border-left: 3px solid #b45309; padding-left: 8pt; }
  h3 { font-size: 11pt; margin: 12pt 0 4pt; color: #44403c; page-break-after: avoid; }
  p { margin: 4pt 0; }
  hr { border: none; border-top: 1px solid #e7e5e4; margin: 12pt 0; }
  code, pre { font-family: Consolas, 'Courier New', monospace; font-size: 8.5pt; }
  code { background: #f5f5f4; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 6px; padding: 8pt; white-space: pre-wrap; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 9pt; }
  th, td { border: 1px solid #d6d3d1; padding: 4pt 6pt; vertical-align: top; text-align: left; }
  th { background: #fafaf9; font-weight: 600; color: #57534e; }
  tr { page-break-inside: avoid; }
  ul, ol { margin: 4pt 0 8pt; padding-left: 18pt; }
  li { margin: 2pt 0; }
  strong { color: #0c0a09; }
  .footer { margin-top: 18pt; font-size: 8.5pt; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 6pt; }
</style>
</head>
<body>
${html.join("\n")}
<div class="footer">Khush MicroService — Internal QA handoff · Share with developers for staging / local testing</div>
</body>
</html>`;

fs.writeFileSync("docs/SUPPORT_REFUNDS_MODULE_TEST_GUIDE.html", doc);
console.log("Wrote docs/SUPPORT_REFUNDS_MODULE_TEST_GUIDE.html");
