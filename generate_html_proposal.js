const fs = require('fs');
const path = require('path');

// Try requiring marked from backend/node_modules
let marked;
try {
  marked = require('./backend/node_modules/marked').marked;
} catch (e) {
  try {
    marked = require('marked').marked;
  } catch (err) {
    console.error('marked is not yet loaded.');
    process.exit(1);
  }
}

const mdPath = path.join(__dirname, 'NPDMS_Comprehensive_National_Proposal.md');
const outPath = path.join(__dirname, 'NPDMS_Comprehensive_National_Proposal.html');

const mdContent = fs.readFileSync(mdPath, 'utf8');
const bodyHtml = marked.parse(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NPDMS - Comprehensive National Project & Technical Proposal (FDRE - MoH)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #034b75;
      --primary-dark: #022c47;
      --accent: #0284c7;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg-alt: #f8fafc;
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Merriweather', Georgia, serif;
      font-size: 11pt;
      line-height: 1.65;
      color: var(--text);
      background: #f1f5f9;
      margin: 0;
      padding: 0;
    }

    /* Floating Print Control Bar */
    .print-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: white;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: 'Inter', sans-serif;
    }
    .print-bar-title {
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .print-btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .print-btn:hover {
      background: #0369a1;
      transform: translateY(-1px);
    }

    /* Document Sheet Container */
    .doc-sheet {
      max-width: 960px;
      margin: 30px auto;
      background: white;
      padding: 60px 75px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.08);
      border-radius: 4px;
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Inter', -apple-system, sans-serif;
      color: var(--primary-dark);
      font-weight: 800;
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.6em;
    }

    h1 {
      font-size: 24pt;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 8px;
      margin-top: 1.2em;
    }

    h2 {
      font-size: 16pt;
      color: var(--primary);
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
    }

    h3 {
      font-size: 13pt;
    }

    h4 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    p {
      margin-top: 0;
      margin-bottom: 1.1em;
      text-align: justify;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 1.2em;
      padding-left: 28px;
    }

    li {
      margin-bottom: 0.4em;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.8em 0;
      font-family: 'Inter', sans-serif;
      font-size: 9.5pt;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 9px 12px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: var(--bg-alt);
      color: var(--primary-dark);
      font-weight: 700;
      border-bottom: 2px solid #cbd5e1;
    }

    tr:nth-child(even) td {
      background-color: #fafbfc;
    }

    /* Code blocks & ASCII diagrams */
    pre {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 8.5pt;
      line-height: 1.4;
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px 20px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1.5em 0;
    }

    code {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0369a1;
      padding: 2px 5px;
      border-radius: 4px;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid var(--accent);
      background: var(--bg-alt);
      margin: 1.5em 0;
      padding: 12px 20px;
      font-style: italic;
      color: #334155;
    }

    hr {
      border: none;
      height: 1px;
      background: #cbd5e1;
      margin: 2.5em 0;
    }

    /* Print Specific Styles */
    @media print {
      body {
        background: white;
        font-size: 10pt;
      }
      .print-bar {
        display: none !important;
      }
      .doc-sheet {
        max-width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
      }
      @page {
        size: A4 portrait;
        margin: 20mm 15mm 20mm 15mm;
      }
      h1, h2 {
        page-break-after: avoid;
      }
      pre, table, blockquote {
        page-break-inside: avoid;
      }
      /* Force section page breaks on top-level sections */
      h1 {
        page-break-before: always;
      }
      h1:first-of-type {
        page-break-before: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Print Control Bar for Browser Viewing -->
  <div class="print-bar">
    <div class="print-bar-title">
      <span>🇪🇹 Federal Democratic Republic of Ethiopia — Ministry of Health (FDRE - MoH)</span>
      <span style="color: #94a3b8; font-weight: normal;">| National Patient Data Management System (NPDMS)</span>
    </div>
    <button class="print-btn" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0v4h12v-4"></path></svg>
      Print / Save as 50-Page PDF
    </button>
  </div>

  <div class="doc-sheet">
    ${bodyHtml}
  </div>

</body>
</html>
`;

fs.writeFileSync(outPath, fullHtml, 'utf8');
console.log('Successfully generated print-ready HTML proposal at:', outPath);
