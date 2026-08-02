export type DetectedLanguage = {
  id: string;
  label: string;
};

type LanguageRule = {
  id: string;
  label: string;
  patterns: RegExp[];
};

const LANGUAGES: LanguageRule[] = [
  {
    id: "tsx",
    label: "TypeScript / React",
    patterns: [
      /\b(useState|useEffect|useRef|useMemo|useCallback|createContext)\s*\(/,
      /\b(interface|type|enum|namespace)\s+[A-Za-z_]/,
      /:\s*(string|number|boolean|void|Record\s*<|React\.\w+|Promise\s*<)/,
      /import\s+.*\bfrom\s+['"]react['"]/,
      /<\w+[\s>].*\/?>|<\/\w+>/,
    ],
  },
  {
    id: "ts",
    label: "TypeScript",
    patterns: [
      /\b(interface|type|enum|namespace)\s+[A-Za-z_]/,
      /:\s*(string|number|boolean|void|Record\s*<|Promise\s*<)/,
      /(const|let|function)\s+\w+\s*(\([^)]*\))?\s*:\s*\w/,
      /\bas\s+(const|unknown|any)\b/,
      /\b(implements|extends)\s+\w/,
    ],
  },
  {
    id: "python",
    label: "Python",
    patterns: [
      /\b(def|class)\s+\w+/,
      /\b(import|from)\s+[\w.]+/,
      /\b(elif|self|print|lambda|yield|async def)\b/,
      /if\s+__name__\s*==/,
      /:\s*$/m,
    ],
  },
  {
    id: "go",
    label: "Go",
    patterns: [
      /\bpackage\s+\w+/,
      /\bfunc\s+\(?\w*\)?\s*\w*\(/,
      /\bimport\s+\(/,
      /\bgo\s+func\b|:=/,
      /fmt\.(Println|Printf|Sprintf)/,
    ],
  },
  {
    id: "rust",
    label: "Rust",
    patterns: [
      /\bfn\s+\w+/,
      /\blet\s+mut\b|\buse\s+\w+::/,
      /\bimpl\s+\w+/,
      /\bcargo\b|\bmatch\s+\w+\s*\{/,
      /\b(Result|Option|Vec|String)::/,
      /->\s*\w+/,
    ],
  },
  {
    id: "java",
    label: "Java",
    patterns: [
      /\bpublic\s+(class|static|void)\b/,
      /System\.out\.(print|println)/,
      /\bimport\s+java\./,
      /@Override/,
      /\b(ArrayList|HashMap|Optional|StringBuilder)\b/,
    ],
  },
  {
    id: "cpp",
    label: "C / C++",
    patterns: [
      /#include\s*[<"]/,
      /\b(int|void|char)\s+main\s*\(/,
      /printf\s*\(|std::|->|::/,
      /\b(const|static|unsigned)\s+int\b/,
    ],
  },
  {
    id: "csharp",
    label: "C#",
    patterns: [
      /\busing\s+System\b/,
      /\bnamespace\s+\w+/,
      /Console\.WriteLine/,
      /\bpublic\s+class\b/,
      /\b(var|async|await|Task)\b/,
    ],
  },
  {
    id: "php",
    label: "PHP",
    patterns: [
      /<\?php/,
      /\$\w+\s*(=|->)/,
      /\b(echo|require_once|namespace)\b/,
      /=>\s*\w+\s*[,)\n]/,
    ],
  },
  {
    id: "ruby",
    label: "Ruby",
    patterns: [
      /\b(require|require_relative)\b/,
      /\bputs\b|\battr_accessor\b/,
      /\bdef\s+\w+.*\n.*end\b/,
      /#\s*\{/,
    ],
  },
  {
    id: "swift",
    label: "Swift",
    patterns: [
      /\bimport\s+(UIKit|SwiftUI|Foundation)/,
      /\bguard\s+let\b/,
      /\bfunc\s+\w+\s*\(/,
      /\b(UIView|UILabel|NSObject)\b/,
    ],
  },
  {
    id: "kotlin",
    label: "Kotlin",
    patterns: [
      /\bfun\s+\w+/,
      /\bval\s+\w+\s*[:=]/,
      /\bimport\s+kotlin\./,
      /\b(data class|object|companion object)\b/,
    ],
  },
  {
    id: "sql",
    label: "SQL",
    patterns: [
      /\b(SELECT|INSERT INTO|CREATE TABLE|UPDATE|DELETE FROM|ALTER TABLE)\b/i,
      /\b(JOIN|WHERE|GROUP BY|ORDER BY|LIMIT)\b/i,
    ],
  },
  {
    id: "html",
    label: "HTML",
    patterns: [
      /<!DOCTYPE\s+html/i,
      /<html[\s>]/i,
      /<div[^>]*class=/i,
      /<\/body>/i,
    ],
  },
  {
    id: "css",
    label: "CSS / SCSS",
    patterns: [
      /@media|@import\s+url|@keyframes/,
      /[.#][\w-]+\s*\{[^}]*:[^}]*;/,
      /#[0-9a-fA-F]{3,6}\b/,
      /display\s*:\s*(flex|grid|block)/,
    ],
  },
  {
    id: "shell",
    label: "Shell",
    patterns: [
      /#!\/bin\/(bash|sh|zsh)/,
      /\b(echo|export|cd|rm|mkdir|chmod)\s+/,
      /\bnpm\s+run\b|\bgit\s+\w+\b/,
    ],
  },
  {
    id: "json",
    label: "JSON",
    patterns: [
      /^\s*\{\s*$/m,
      /"[^"]+"\s*:\s*("|\[|\{|true|false|\d)/,
    ],
  },
  {
    id: "javascript",
    label: "JavaScript",
    patterns: [
      /\b(const|let|var|function)\s+\w+/,
      /\b(=>|console\.log|document\.|window\.)\b/,
      /\b(import|export)\s+.*\bfrom\b/,
      /\b(addEventListener|querySelector|fetch|Promise|async)\b/,
    ],
  },
];

function score(content: string, rule: LanguageRule): number {
  let total = 0;
  for (const pattern of rule.patterns) {
    const matches = content.match(pattern);
    if (matches) total += Math.min(matches.length, 3);
  }
  return total;
}

/**
 * Cheap, dependency-free heuristic language detection for pasted code.
 * Returns null when the input doesn't look like code at all.
 */
export function detectLanguage(content: string): DetectedLanguage | null {
  const sample = content.slice(0, 60_000);
  if (sample.trim().length < 30) return null;

  let best: LanguageRule | null = null;
  let bestScore = 0;

  for (const rule of LANGUAGES) {
    const s = score(sample, rule);
    if (s > bestScore) {
      best = rule;
      bestScore = s;
    }
  }

  if (!best || bestScore === 0) return null;

  // TSX beats plain TS when JSX is present; plain TS beats JS when it has
  // type annotations. Resolve those overlaps explicitly.
  if (best.id === "ts" || best.id === "javascript" || best.id === "tsx") {
    const tsx = score(sample, LANGUAGES[0]);
    const ts = score(sample, LANGUAGES[1]);
    const js = score(sample, LANGUAGES[17]);
    const winner =
      tsx > 0 && tsx >= ts && tsx >= js
        ? LANGUAGES[0]
        : ts > 0 && ts >= js
          ? LANGUAGES[1]
          : LANGUAGES[17];
    return { id: winner.id, label: winner.label };
  }

  return { id: best.id, label: best.label };
}
