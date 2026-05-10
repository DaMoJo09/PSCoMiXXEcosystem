#!/usr/bin/env node
/**
 * Build a print-ready B&W PDF from docs/PSCoMiXX_User_Guide.md
 *
 *   node docs/build-pdf.mjs
 *
 * Requires: pandoc, chromium (installed via system deps).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "PSCoMiXX_User_Guide.md");
const HTML = resolve(__dirname, "PSCoMiXX_User_Guide.html");
const PDF = resolve(__dirname, "PSCoMiXX_User_Guide.pdf");

if (!existsSync(SRC)) {
  console.error(`Source not found: ${SRC}`);
  process.exit(1);
}

const md = readFileSync(SRC, "utf8")
  // pandoc uses \newpage for page breaks via raw HTML
  .replace(/\\newpage/g, '<div class="page-break"></div>');

writeFileSync(SRC + ".tmp", md);

console.log("[1/3] Converting Markdown -> HTML with pandoc...");
const css = `
  @page { size: Letter; margin: 0.75in 0.75in 1in 0.75in; }
  * { box-sizing: border-box; }
  html, body {
    background: #ffffff;
    color: #000000;
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
  }
  h1 {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 28pt;
    font-weight: 900;
    letter-spacing: -0.5px;
    border-bottom: 3px solid #000;
    padding-bottom: 6pt;
    margin-top: 24pt;
    page-break-after: avoid;
  }
  h2 {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 18pt;
    font-weight: 800;
    margin-top: 22pt;
    margin-bottom: 10pt;
    border-bottom: 1.5px solid #000;
    padding-bottom: 4pt;
    page-break-after: avoid;
  }
  h3 {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 13pt;
    font-weight: 700;
    margin-top: 16pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
  }
  h4 { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; font-weight: 700; margin-top: 12pt; }
  p { margin: 0 0 8pt 0; }
  a { color: #000; text-decoration: underline; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  code {
    font-family: "Courier New", Courier, monospace;
    font-size: 9.5pt;
    background: #f0f0f0;
    border: 0.5pt solid #999;
    padding: 0 3pt;
    border-radius: 2pt;
  }
  pre {
    background: #f5f5f5;
    border: 1pt solid #000;
    border-left: 4pt solid #000;
    padding: 10pt 12pt;
    font-family: "Courier New", Courier, monospace;
    font-size: 9.5pt;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    page-break-inside: avoid;
    margin: 10pt 0;
  }
  pre code { background: none; border: 0; padding: 0; font-size: inherit; }
  /* Image-placeholder pre blocks (start with "[ INSERT SCREENSHOT") get the dashed-box treatment */
  pre:has(code:first-line) { /* fallback handled below via JS-free approach */ }
  blockquote {
    border-left: 4pt solid #000;
    background: #f5f5f5;
    margin: 10pt 0;
    padding: 8pt 12pt;
    page-break-inside: avoid;
  }
  blockquote p { margin: 0; }
  ul, ol { margin: 6pt 0 10pt 22pt; padding: 0; }
  li { margin: 2pt 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10pt 0;
    page-break-inside: avoid;
    font-size: 10pt;
  }
  th, td {
    border: 0.75pt solid #000;
    padding: 5pt 7pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: #000; color: #fff; font-family: Helvetica, Arial, sans-serif; font-weight: 700; }
  tr:nth-child(even) td { background: #f5f5f5; }
  hr { border: 0; border-top: 1pt solid #000; margin: 18pt 0; }
  .page-break { page-break-after: always; height: 0; }

  /* Cover page styling: first H1 is the title */
  body > h1:first-child {
    font-size: 64pt;
    border: none;
    text-align: center;
    margin-top: 200pt;
    padding-bottom: 0;
  }
  body > h2:first-of-type {
    text-align: center;
    border: none;
    font-size: 22pt;
    font-weight: 400;
    margin-top: 8pt;
  }
`;

// Build a small Lua filter or post-process: turn pre blocks containing
// "[ INSERT SCREENSHOT" into styled placeholder boxes.
const POST_PROCESS = `
<script>
document.querySelectorAll('pre').forEach(function(pre){
  var t = pre.textContent || '';
  if (t.trim().startsWith('[ INSERT SCREENSHOT')) {
    pre.style.background = '#ffffff';
    pre.style.borderLeft = '1pt solid #000';
    pre.style.border = '1.5pt dashed #000';
    pre.style.padding = '24pt 16pt';
    pre.style.minHeight = '120pt';
    pre.style.fontFamily = 'Helvetica, Arial, sans-serif';
    pre.style.fontSize = '9.5pt';
    pre.style.color = '#000';
    pre.style.textAlign = 'left';
    pre.classList.add('screenshot-placeholder');
  }
});
</script>
`;

execSync(
  `pandoc "${SRC}.tmp" -f markdown+raw_html -t html5 --standalone --metadata title="PSCoMiXX User Guide" -o "${HTML}"`,
  { stdio: "inherit" }
);

// Inject CSS + post-process script
let html = readFileSync(HTML, "utf8");
html = html.replace(
  "</head>",
  `<style>${css}</style></head>`
);
html = html.replace("</body>", `${POST_PROCESS}</body>`);
writeFileSync(HTML, html);

console.log("[2/3] Rendering HTML -> PDF with chromium...");
execSync(
  `chromium --headless --disable-gpu --no-sandbox --hide-scrollbars --print-to-pdf-no-header --print-to-pdf="${PDF}" "file://${HTML}"`,
  { stdio: "inherit" }
);

console.log(`[3/3] Done -> ${PDF}`);
