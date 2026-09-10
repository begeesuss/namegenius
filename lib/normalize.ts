export function normalizeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function estimateSyllables(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 1;
  const groups = cleaned.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

export function similarNames(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return Math.min(na.length, nb.length) >= 4;
  return levenshtein(na, nb) <= 1 && Math.min(na.length, nb.length) >= 4;
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

export function dedupeCandidates<T extends { name: string }>(items: T[]) {
  const kept: T[] = [];
  for (const item of items) {
    const duplicate = kept.some((existing) => similarNames(existing.name, item.name));
    if (!duplicate) kept.push(item);
  }
  return kept;
}

const FABRICATED = [
  /from the latin word/i,
  /ancient greek for/i,
  /old norse term/i,
  /sanskrit meaning/i,
];

export function looksFabricatedEtymology(meaning: string, invented: boolean) {
  if (!invented) return FABRICATED.some((re) => re.test(meaning));
  return FABRICATED.some((re) => re.test(meaning));
}

export function rewriteInventedMeaning(name: string, meaning: string) {
  if (!looksFabricatedEtymology(meaning, true)) return meaning;
  return `Invented name inspired by the sound and idea of ${name}, not an established dictionary word.`;
}
