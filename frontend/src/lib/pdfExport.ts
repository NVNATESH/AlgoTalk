/**
 * pdfExport.ts — Client-side PDF generation from Goal data.
 *
 * Uses a simple HTML-to-Blob approach with the browser's print API
 * for maximum compatibility (no external dependencies needed).
 */

import type { Goal } from '@/types/goal';

export function goalToFormattedHTML(goal: Goal): string {
  const modules = goal.modules ?? [];
  const resources = goal.resources ?? [];

  const moduleRows = modules.map((m, i) => {
    const status = m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔄' : '⬜';
    return `
      <tr>
        <td style="padding:8px 12px;border:1px solid #333;color:#e5e7eb;">${status} ${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #333;color:#e5e7eb;font-weight:600;">${esc(m.title)}</td>
        <td style="padding:8px 12px;border:1px solid #333;color:#9ca3af;">${m.topics?.join(', ') ?? ''}</td>
        <td style="padding:8px 12px;border:1px solid #333;color:#e5e7eb;text-align:center;">${m.difficulty}</td>
        <td style="padding:8px 12px;border:1px solid #333;color:#e5e7eb;text-align:center;">${m.estimatedHours}h</td>
        <td style="padding:8px 12px;border:1px solid #333;color:#e5e7eb;text-align:center;">${m.quizScore != null ? m.quizScore + '%' : '—'}</td>
      </tr>
    `;
  }).join('');

  const resourceList = resources.map(r =>
    `<li style="margin:4px 0;"><a href="${esc(r.url)}" style="color:#a78bfa;">${esc(r.title)}</a> <span style="color:#6b7280;font-size:11px;">(${r.type})</span></li>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(goal.name)} - LearnHub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Inter, Arial, sans-serif; background: #0a0a0f; color: #e5e7eb; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; background: linear-gradient(90deg, #a78bfa, #f472b6); -webkit-background-clip: text; color: transparent; }
    h2 { font-size: 18px; color: #a78bfa; margin: 24px 0 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
    .meta-item { background: #15151f; border: 1px solid #222; border-radius: 8px; padding: 12px 16px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
    .meta-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { padding: 8px 12px; border: 1px solid #333; background: #15151f; color: #a78bfa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; }
    .progress-bar { background: #1a1a26; border-radius: 8px; height: 8px; overflow: hidden; margin: 8px 0; }
    .progress-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #a78bfa, #f472b6); }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #222; font-size: 11px; color: #6b7280; }
    @media print {
      body { background: white; color: #1a1a2e; padding: 20px; }
      h1 { color: #6d28d9; background: none; -webkit-background-clip: unset; }
      h2 { color: #6d28d9; border-color: #e5e7eb; }
      th { background: #f3f4f6; color: #6d28d9; border-color: #e5e7eb; }
      td { border-color: #e5e7eb; color: #1a1a2e; }
      .meta-item { background: #f9fafb; border-color: #e5e7eb; }
      .meta-label { color: #6b7280; }
      .meta-value { color: #1a1a2e; }
      .progress-bar { background: #e5e7eb; }
      .progress-fill { background: linear-gradient(90deg, #6d28d9, #ec4899); }
      a { color: #6d28d9; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${goal.icon} ${esc(goal.name)}</h1>
    ${goal.description ? `<p style="color:#9ca3af;margin:8px 0;">${esc(goal.description)}</p>` : ''}

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Difficulty</div>
        <div class="meta-value">${goal.difficulty}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Estimated</div>
        <div class="meta-value">${goal.estimatedHours}h</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Progress</div>
        <div class="meta-value">${goal.progress}%</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">XP Reward</div>
        <div class="meta-value">+${goal.xpReward}</div>
      </div>
      ${goal.companyTarget ? `<div class="meta-item"><div class="meta-label">Company</div><div class="meta-value">${esc(goal.companyTarget)}</div></div>` : ''}
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width:${goal.progress}%"></div>
    </div>

    ${goal.rationale ? `<h2>📋 Rationale</h2><p style="color:#9ca3af;line-height:1.6;">${esc(goal.rationale)}</p>` : ''}

    <h2>📦 Modules (${modules.filter(m => m.status === 'completed').length}/${modules.length} completed)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:50px">#</th>
          <th>Module</th>
          <th>Topics</th>
          <th style="text-align:center;width:80px">Difficulty</th>
          <th style="text-align:center;width:60px">Est.</th>
          <th style="text-align:center;width:60px">Quiz</th>
        </tr>
      </thead>
      <tbody>${moduleRows}</tbody>
    </table>

    ${resources.length > 0 ? `<h2>📚 Resources</h2><ul style="padding-left:20px;line-height:1.8;">${resourceList}</ul>` : ''}

    <div class="footer">
      Generated by LearnHub on ${new Date().toLocaleDateString()} · ${new Date().toLocaleTimeString()}
    </div>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function downloadGoalPDF(goal: Goal) {
  const html = goalToFormattedHTML(goal);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 500);
    };
  } else {
    // Fallback: download as HTML
    const a = document.createElement('a');
    a.href = url;
    a.download = `${goal.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function downloadGoalDocx(goal: Goal) {
  // Simple DOCX-like XML (Word accepts well-formed HTML saved as .doc)
  const html = goalToFormattedHTML(goal)
    .replace(/<style[\s\S]*?<\/style>/gi, '') // strip CSS for clean doc
    .replace(/style="[^"]*"/g, ''); // strip inline styles

  const docContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${goal.name}</title></head>
    <body>${html}</body>
    </html>
  `;

  const blob = new Blob([docContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${goal.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
