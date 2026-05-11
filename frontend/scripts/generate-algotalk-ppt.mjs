import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'AlgoTalk Team';
pptx.title = 'AlgoTalk — Project Presentation';

/* ── Approved palette ───────────────────────────────────── */
const C = {
  bg:        'FAF4DF',
  primary:   'E3562B',
  secondary: '1D3639',
  neutral:   '7F7F7F',
  white:     'FFFFFF',
  dark:      '1A1A1A',
};

/* ── Helpers ─────────────────────────────────────────────── */
function base(slide) {
  slide.background = { color: C.bg };
  // thin accent bar at top
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.18,
    fill: { color: C.primary },
  });
}

function title(slide, text, sub) {
  slide.addText(text, {
    x: 0.7, y: 0.4, w: 12, h: 0.7,
    fontFace: 'Poppins', bold: true, fontSize: 36, color: C.secondary,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.7, y: 1.1, w: 12, h: 0.4,
      fontFace: 'Poppins', fontSize: 20, color: C.neutral, italic: true,
    });
  }
}

function bullets(slide, items, opts = {}) {
  const rows = items.map(t => ({
    text: t,
    options: { bullet: { indent: 18 }, breakLine: true },
  }));
  slide.addText(rows, {
    x: opts.x ?? 0.9, y: opts.y ?? 1.7, w: opts.w ?? 11.5, h: opts.h ?? 5.0,
    fontFace: 'Poppins', fontSize: opts.fs ?? 20, color: C.dark,
    paraSpaceAfterPt: 10, valign: 'top',
  });
}

function pill(slide, label, x, y, w, bg) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.5, rectRadius: 0.08,
    fill: { color: bg },
  });
  slide.addText(label, {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.34,
    fontFace: 'Poppins', fontSize: 16, bold: true, color: C.white, align: 'center',
  });
}

/* ════════════════════════════════════════════════════════════
   SLIDE 1 — COVER
   ════════════════════════════════════════════════════════════ */
{
  const s = pptx.addSlide();
  base(s);

  s.addText('AlgoTalk', {
    x: 0.7, y: 1.0, w: 12, h: 1.0,
    fontFace: 'Poppins', bold: true, fontSize: 44, color: C.secondary,
  });
  s.addText('AI-Powered Collaborative DSA Learning Platform', {
    x: 0.7, y: 2.0, w: 10, h: 0.5,
    fontFace: 'Poppins', fontSize: 24, color: C.primary, bold: true,
  });

  // Team info
  s.addText([
    { text: 'Team Name:  ', options: { bold: true } },
    { text: 'AlgoTalk', options: {} },
  ], {
    x: 0.9, y: 3.2, w: 8, h: 0.4,
    fontFace: 'Poppins', fontSize: 20, color: C.dark,
  });

  s.addText([
    { text: 'Team Members:  ', options: { bold: true } },
    { text: '<Add your names here>', options: { color: C.neutral } },
  ], {
    x: 0.9, y: 3.7, w: 8, h: 0.4,
    fontFace: 'Poppins', fontSize: 20, color: C.dark,
  });

  // decorative accent
  s.addShape(pptx.ShapeType.rect, {
    x: 0.7, y: 2.7, w: 2.5, h: 0.06,
    fill: { color: C.primary },
  });
}

/* ════════════════════════════════════════════════════════════
   SLIDE 2 — PROBLEM STATEMENT
   ════════════════════════════════════════════════════════════ */
{
  const s = pptx.addSlide();
  base(s);
  title(s, 'Problem Statement', 'What students struggle with today');

  bullets(s, [
    '90–95% of students skip upsolving after contests — after 10 contests, most upsolve only 1.',
    'Students rely on AI / solution tabs for direct answers and miss the problem-solving approach.',
    'Progress is scattered across LeetCode, GFG, CodeChef, Codeforces with no unified tracking.',
    'Each platform has a different focus (algorithms vs math/logic) — no cross-platform roadmap.',
    'Students know the logic but fail interviews because they cannot communicate their approach clearly.',
  ]);
}

/* ════════════════════════════════════════════════════════════
   SLIDE 3 — SOLUTION OVERVIEW
   ════════════════════════════════════════════════════════════ */
{
  const s = pptx.addSlide();
  base(s);
  title(s, 'Solution Overview', 'How AlgoTalk addresses each gap');

  bullets(s, [
    'Weak-area analytics map mistakes by topic and difficulty to identify gaps.',
    'Post-contest upsolving workflow pushes guided reviews instead of skipping.',
    'Guided AI hints give direction and thinking domains — never full solutions.',
    'Cross-platform dashboard unifies LeetCode, GFG, CodeChef, Codeforces, and 3 more.',
    'Mock interview module scores both code quality and verbal communication.',
  ]);
}

/* ════════════════════════════════════════════════════════════
   SLIDE 4 — FEATURES & TECH STACK
   ════════════════════════════════════════════════════════════ */
{
  const s = pptx.addSlide();
  base(s);
  title(s, 'Features & Technology Stack');

  // Left card — Features
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 1.55, w: 6.0, h: 5.2, rectRadius: 0.12,
    fill: { color: 'FFF6E8' }, line: { color: 'EED8B5', width: 1 },
  });
  pill(s, 'Key Features', 1.5, 1.75, 3.6, C.primary);
  bullets(s, [
    'Personalized roadmaps from weak-topic analysis',
    'Guided upsolving after every contest',
    'Hints & approach guidance — no direct solutions',
    'Cross-platform progress tracking (7 platforms)',
    'AI mock interviews with communication scoring',
  ], { x: 0.8, y: 2.5, w: 5.4, h: 4.0, fs: 18 });

  // Right card — Tech Stack
  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.8, y: 1.55, w: 6.0, h: 5.2, rectRadius: 0.12,
    fill: { color: 'F0F6F6' }, line: { color: 'C8DCDD', width: 1 },
  });
  pill(s, 'Tech Stack', 7.8, 1.75, 3.6, C.secondary);
  bullets(s, [
    'Frontend: Next.js 14, Tailwind, Zustand',
    'Backend: Express + TypeScript, MongoDB',
    'AI: Google Gemini 2.5 (multi-key rotation)',
    'Real-time: WebSocket, Yjs CRDT, WebRTC voice',
    'Testing: Vitest — 144 unit tests',
  ], { x: 7.1, y: 2.5, w: 5.4, h: 4.0, fs: 18 });
}

/* ════════════════════════════════════════════════════════════
   SLIDE 5 — CLOSING
   ════════════════════════════════════════════════════════════ */
{
  const s = pptx.addSlide();
  base(s);
  title(s, 'Closing');

  // Team intro heading
  s.addText('Team Introduction', {
    x: 0.9, y: 1.5, w: 5, h: 0.4,
    fontFace: 'Poppins', fontSize: 22, bold: true, color: C.secondary,
  });
  s.addText('<Add member names and roles here>', {
    x: 0.9, y: 2.0, w: 6, h: 0.35,
    fontFace: 'Poppins', fontSize: 18, color: C.neutral,
  });

  // Learnings
  s.addText('Learnings', {
    x: 0.9, y: 2.7, w: 5, h: 0.4,
    fontFace: 'Poppins', fontSize: 22, bold: true, color: C.secondary,
  });
  bullets(s, [
    'Students need structured guidance, not instant answers.',
    'Upsolving habits grow only with active prompts and tracking.',
    'Communication practice is as important as coding practice.',
  ], { x: 0.9, y: 3.2, w: 11, h: 2.2, fs: 18 });

  // Thank-you pill
  pill(s, 'Thank You!', 4.5, 5.8, 4.3, C.primary);

  // Questions badge
  s.addShape(pptx.ShapeType.roundRect, {
    x: 10.0, y: 5.8, w: 2.6, h: 0.5, rectRadius: 0.08,
    fill: { color: C.secondary },
  });
  s.addText('Questions?', {
    x: 10.1, y: 5.88, w: 2.4, h: 0.34,
    fontFace: 'Poppins', fontSize: 16, bold: true, color: C.white, align: 'center',
  });
}

/* ── Write file ──────────────────────────────────────────── */
const outPath = 'c:/Users/sai/OneDrive/Desktop/project_space/docs/AlgoTalk-Presentation.pptx';
await pptx.writeFile({ fileName: outPath });
console.log('✔  Created:', outPath);
