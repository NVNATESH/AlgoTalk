/**
 * Lightweight static analyzer for submitted code, fulfilling MASTER_PROMPT
 * Module 9.6 step 1 ("Static Analysis (per language)") — without bringing in
 * tree-sitter, which is heavy to compile on Windows and overkill for the
 * surface signals we need.
 *
 * For each supported language we compute:
 *   - data structures used (vector, map, set, queue, stack, dict, list, ...)
 *   - max nesting depth (counted via balanced brace/indent walk)
 *   - function count
 *   - lines of code (excluding blanks + line comments)
 *
 * These are surface heuristics — a regex won't catch every macro-defined
 * `vector` typedef or every Python decorator-wrapped function. The intent is
 * to give the LLM a useful hint, not to be a compiler. False positives on
 * exotic code are acceptable.
 *
 * Strings and comments are stripped before scanning so we don't pick up
 * `"a vector"` in a printed message or `// uses dict` in a comment.
 */

export type SupportedLanguage = 'cpp' | 'python' | 'javascript' | 'java';

export interface StaticAnalysis {
  language: SupportedLanguage;
  loc: number;
  functionCount: number;
  maxDepth: number;
  dataStructures: string[];
  controlFlow: {
    forLoops: number;
    whileLoops: number;
    ifs: number;
    recursionLikely: boolean;
  };
}

const DATA_STRUCTURE_PATTERNS: Record<SupportedLanguage, Array<[RegExp, string]>> = {
  cpp: [
    [/\bstd::vector\b|\bvector\s*</, 'vector'],
    [/\bstd::map\b|\bmap\s*</, 'map'],
    [/\bstd::unordered_map\b|\bunordered_map\s*</, 'unordered_map'],
    [/\bstd::set\b|\bset\s*</, 'set'],
    [/\bstd::unordered_set\b|\bunordered_set\s*</, 'unordered_set'],
    [/\bstd::queue\b|\bqueue\s*</, 'queue'],
    [/\bstd::deque\b|\bdeque\s*</, 'deque'],
    [/\bstd::stack\b|\bstack\s*</, 'stack'],
    [/\bstd::priority_queue\b|\bpriority_queue\s*</, 'priority_queue'],
    [/\bstd::list\b|\blist\s*</, 'linked_list'],
    [/\bstd::pair\b|\bpair\s*</, 'pair'],
    [/\bstd::tuple\b|\btuple\s*</, 'tuple'],
    [/\bstd::string\b|\bstring\b/, 'string'],
    [/\bstd::bitset\b|\bbitset\s*</, 'bitset'],
    [/\bstd::array\b|\barray\s*</, 'fixed_array'],
  ],
  python: [
    [/\bdict\s*\(|{[^}]*:[^}]*}/, 'dict'],
    [/\bset\s*\(|{[^}{]+}/, 'set'],
    [/\blist\s*\(|\[[^\]]*\]/, 'list'],
    [/\btuple\s*\(|\(\s*[^,)]+\s*,/, 'tuple'],
    [/\bdeque\s*\(|from\s+collections\s+import[^\n]*deque/, 'deque'],
    [/\bCounter\s*\(|from\s+collections\s+import[^\n]*Counter/, 'counter'],
    [/\bdefaultdict\s*\(|from\s+collections\s+import[^\n]*defaultdict/, 'defaultdict'],
    [/\bheapq\b/, 'heap'],
    [/\bnp\.array\b|\bnumpy\.array\b/, 'numpy_array'],
  ],
  javascript: [
    [/\bnew\s+Map\s*\(/, 'map'],
    [/\bnew\s+Set\s*\(/, 'set'],
    [/\bnew\s+Array\s*\(|\[[^\]]*\]/, 'array'],
    [/\bnew\s+WeakMap\s*\(/, 'weakmap'],
    [/\bnew\s+WeakSet\s*\(/, 'weakset'],
    [/\{\s*[a-zA-Z0-9_]+\s*:/, 'object'],
  ],
  java: [
    [/\bArrayList\s*</, 'array_list'],
    [/\bLinkedList\s*</, 'linked_list'],
    [/\bHashMap\s*</, 'hash_map'],
    [/\bTreeMap\s*</, 'tree_map'],
    [/\bHashSet\s*</, 'hash_set'],
    [/\bTreeSet\s*</, 'tree_set'],
    [/\bArrayDeque\s*</, 'deque'],
    [/\bPriorityQueue\s*</, 'priority_queue'],
    [/\bStack\s*</, 'stack'],
    [/\bQueue\s*</, 'queue'],
    [/\bString\b/, 'string'],
    [/\bint\s*\[\s*\]|long\s*\[\s*\]/, 'array'],
  ],
};

const FUNCTION_PATTERNS: Record<SupportedLanguage, RegExp> = {
  cpp: /(?:^|\n)\s*(?:[a-zA-Z_][a-zA-Z0-9_<>:&*\s]*\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\([^;{)]*\)\s*(?:const\s*)?\{/g,
  python: /(?:^|\n)\s*def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g,
  javascript:
    /(?:^|[^a-zA-Z0-9_])(?:function\s+[a-zA-Z_$][a-zA-Z0-9_$]*|const\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*\{)/g,
  java:
    /(?:public|private|protected|static)\s+[a-zA-Z_<>,\[\]]+\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/g,
};

/** Strip /* ... *‍/, // ... and string literals. Keeps newlines so line counts stay sane. */
function strip(code: string, language: SupportedLanguage): string {
  let out = code;
  // Block comments
  out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // Python triple-quoted "comments"
  if (language === 'python') {
    out = out.replace(/"""[\s\S]*?"""/g, (m) => m.replace(/[^\n]/g, ' '));
    out = out.replace(/'''[\s\S]*?'''/g, (m) => m.replace(/[^\n]/g, ' '));
  }
  // Line comments
  if (language === 'python') {
    out = out.replace(/(^|[^"'\\])#[^\n]*/g, (_, p) => `${p}`);
  } else {
    out = out.replace(/\/\/[^\n]*/g, '');
  }
  // String literals (cheap — doesn't handle every escape but good enough)
  out = out.replace(/"(?:\\.|[^"\\])*"/g, '""');
  out = out.replace(/'(?:\\.|[^'\\])*'/g, "''");
  return out;
}

function countLoc(code: string): number {
  return code.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}

function maxBraceDepth(code: string): number {
  let depth = 0;
  let max = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === '{') {
      depth++;
      if (depth > max) max = depth;
    } else if (c === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return max;
}

function maxIndentDepth(code: string): number {
  // Approximate Python nesting: count leading spaces / 4 (or tab = 4 spaces).
  let max = 0;
  for (const line of code.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.match(/^( +|\t+)/);
    const lead = m ? m[0].replace(/\t/g, '    ').length : 0;
    const depth = Math.floor(lead / 4);
    if (depth > max) max = depth;
  }
  return max;
}

function detectRecursion(code: string, fnNames: string[]): boolean {
  // For each defined function, check if its body invokes itself by name.
  // Cheap approach: just look for `name(` occurrences and require ≥ 2 (one is
  // the definition, others are calls).
  return fnNames.some((name) => {
    const re = new RegExp(`\\b${escapeRegex(name)}\\s*\\(`, 'g');
    let count = 0;
    while (re.exec(code)) count++;
    return count >= 2;
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFunctionNames(code: string, language: SupportedLanguage): string[] {
  const names: string[] = [];
  let re: RegExp;
  if (language === 'python') {
    re = /(?:^|\n)\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  } else if (language === 'cpp') {
    re = /(?:^|\n)\s*[a-zA-Z_][a-zA-Z0-9_<>:&*\s]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^;{)]*\)\s*(?:const\s*)?\{/g;
  } else if (language === 'java') {
    re = /(?:public|private|protected|static)\s+[a-zA-Z_<>,\[\]]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  } else {
    re = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g;
  }
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const name = m[1] ?? m[2];
    if (name) names.push(name);
  }
  return names;
}

export function analyzeCode(
  code: string,
  language: SupportedLanguage
): StaticAnalysis {
  const stripped = strip(code, language);

  // Data structures
  const found = new Set<string>();
  for (const [pattern, label] of DATA_STRUCTURE_PATTERNS[language]) {
    if (pattern.test(stripped)) found.add(label);
  }

  // Function count (ignore false-positives by also using the per-function name extractor)
  const fnNames = extractFunctionNames(stripped, language);
  const functionCount = Math.max(
    fnNames.length,
    (stripped.match(FUNCTION_PATTERNS[language]) ?? []).length
  );

  // Depth
  const maxDepth =
    language === 'python' ? maxIndentDepth(stripped) : maxBraceDepth(stripped);

  // Control-flow signals
  const forLoops = (stripped.match(/\bfor\s*\(?[^:]/g) ?? []).length;
  const whileLoops = (stripped.match(/\bwhile\s*\(?/g) ?? []).length;
  const ifs = (stripped.match(/\bif\s*\(?/g) ?? []).length;

  return {
    language,
    loc: countLoc(stripped),
    functionCount,
    maxDepth,
    dataStructures: Array.from(found).sort(),
    controlFlow: {
      forLoops,
      whileLoops,
      ifs,
      recursionLikely: detectRecursion(stripped, fnNames),
    },
  };
}

/**
 * Render the analysis as a compact human-readable hint block. Used by the
 * Gemini code analyzer prompt builders so the LLM doesn't waste a token
 * budget re-deriving information we already know.
 */
export function formatAnalysisHints(a: StaticAnalysis): string {
  const lines = [
    `Language: ${a.language}`,
    `LOC (excluding comments/blank): ${a.loc}`,
    `Function count: ${a.functionCount}`,
    `Max nesting depth: ${a.maxDepth}`,
    `Data structures detected: ${
      a.dataStructures.length > 0 ? a.dataStructures.join(', ') : 'none recognized'
    }`,
    `Control flow: ${a.controlFlow.forLoops} for, ${a.controlFlow.whileLoops} while, ${a.controlFlow.ifs} if${a.controlFlow.recursionLikely ? ' · recursion likely' : ''}`,
  ];
  return lines.join('\n');
}
