import fs from "fs";
import path from "path";
import type { GeneratedCandidate, NormalizedBrief } from "@/lib/types";
import { logTelemetry } from "@/lib/telemetry";

const CandidateShape = {
  name: "string",
  meaning: "string",
} as const;

void CandidateShape;

function systemPrompt() {
  const file = path.join(process.cwd(), "prompts", "naming-system.md");
  return fs.readFileSync(file, "utf8");
}

export async function generateCandidatePool(
  brief: NormalizedBrief,
): Promise<{ candidates: GeneratedCandidate[]; source: "llm" | "mock"; latencyMs: number; tokens?: number }> {
  const started = Date.now();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const candidates = mockPool(brief);
    const latencyMs = Date.now() - started;
    logTelemetry("generation", { source: "mock", latencyMs, count: candidates.length });
    return { candidates, source: "mock", latencyMs };
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: JSON.stringify({ brief, count: 60 }) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    const raw = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const candidates = raw.map(coerceCandidate).filter(Boolean) as GeneratedCandidate[];
    if (candidates.length < 8) throw new Error("Too few candidates");
    const latencyMs = Date.now() - started;
    logTelemetry("generation", {
      source: "llm",
      latencyMs,
      count: candidates.length,
      tokens: json.usage?.total_tokens,
    });
    return {
      candidates,
      source: "llm",
      latencyMs,
      tokens: json.usage?.total_tokens,
    };
  } catch (error) {
    const candidates = mockPool(brief);
    const latencyMs = Date.now() - started;
    logTelemetry("generation", {
      source: "mock_fallback",
      latencyMs,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { candidates, source: "mock", latencyMs };
  }
}

function coerceCandidate(raw: Record<string, unknown>): GeneratedCandidate | null {
  const name = String(raw.name ?? "").trim();
  if (name.length < 2 || name.length > 24) return null;
  const invented = Boolean(raw.invented) || String(raw.originKind) !== "existing_word";
  return {
    name,
    meaning: String(raw.meaning ?? `Inspired name for the brief.`),
    pronunciation: String(raw.pronunciation ?? name.toLowerCase()),
    naming_style: String(raw.naming_style ?? "Invented"),
    rationale: String(raw.rationale ?? "Fits the requested personality and use."),
    distinctiveness:
      raw.distinctiveness === "Low" || raw.distinctiveness === "Medium"
        ? raw.distinctiveness
        : "High",
    confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.75))),
    invented,
    originKind:
      raw.originKind === "existing_word" || raw.originKind === "inspired"
        ? raw.originKind
        : "invented",
    territory: String(raw.territory ?? "General"),
  };
}

const STEMS = [
  "lumo", "vera", "nexa", "orbit", "halo", "kiva", "sora", "mira", "flux", "aero",
  "pico", "nova", "zinc", "quartz", "ember", "grove", "pulse", "ridge", "slate", "volt",
  "aria", "bolt", "cinder", "drift", "echo", "forge", "glint", "harbor", "ivy", "jolt",
];

const SUFFIXES = ["ly", "ra", "on", "io", "ex", "um", "is", "a", ""];

const PERSONALITY_STEM_BIAS: Record<string, string[]> = {
  premium: ["lumo", "aria", "nova", "quartz", "harbor"],
  playful: ["kiva", "glint", "jolt", "bolt", "ivy"],
  technical: ["nexa", "orbit", "flux", "pulse", "zinc"],
  minimal: ["halo", "slate", "echo", "drift", "pico"],
  trustworthy: ["harbor", "grove", "ridge", "forge", "vera"],
  bold: ["volt", "cinder", "forge", "jolt", "ember"],
  friendly: ["ivy", "aria", "mira", "sora", "glint"],
  intelligent: ["nexa", "orbit", "vera", "quartz", "echo"],
  futuristic: ["orbit", "flux", "nova", "zinc", "halo"],
};

const STYLE_TAG: Record<string, string> = {
  real_meaningful: "Meaningful",
  invented_brandable: "Invented",
  descriptive: "Descriptive",
  compound: "Compound",
  short_abstract: "Abstract",
};

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function mockPool(brief: NormalizedBrief): GeneratedCandidate[] {
  const type = brief.namingType || "product";
  const includeWords = (brief.include || "").split(/[\s,]+/).filter(Boolean);
  const avoidWords = (brief.avoid || "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 1);
  const fallbackWord = includeWords[0] || "signal";

  const seedSource = [
    type,
    brief.purpose,
    brief.audience,
    (brief.personality || []).join(","),
    brief.namingStyle,
    includeWords.join(","),
    brief.geography,
  ]
    .filter(Boolean)
    .join("|") || "default-seed";
  const random = mulberry32(hashSeed(seedSource));

  const biasStems = (brief.personality || []).flatMap((p) => PERSONALITY_STEM_BIAS[p] || []);
  const uniqueBias = [...new Set(biasStems)];
  const remainingStems = shuffle(
    STEMS.filter((s) => !uniqueBias.includes(s)),
    random,
  );
  const stemOrder = [...uniqueBias, ...remainingStems];
  const suffixOrder = shuffle(SUFFIXES, random);

  const preferredStyle =
    brief.namingStyle && brief.namingStyle !== "no_preference" ? STYLE_TAG[brief.namingStyle] : undefined;
  const baseStyles = ["Invented", "Meaningful", "Descriptive", "Compound", "Abstract"];
  const styleCycle = preferredStyle
    ? [preferredStyle, preferredStyle, ...baseStyles.filter((s) => s !== preferredStyle)]
    : baseStyles;

  const territories = [
    "Light & Clarity",
    "Intelligence",
    "Motion",
    "Craft",
    "Trust",
    "Play",
  ];

  const out: GeneratedCandidate[] = [];
  let attempts = 0;
  while (out.length < 64 && attempts < 200) {
    const i = attempts;
    attempts++;
    const stem = stemOrder[i % stemOrder.length];
    const suffix = suffixOrder[i % suffixOrder.length];
    const word = includeWords[i % includeWords.length] || fallbackWord;
    let name = capitalize(stem + suffix);
    const styleIndex = i % 5;
    if (styleIndex === 2) name = capitalize(word.slice(0, 4) + stem.slice(0, 3));
    if (styleIndex === 3) name = capitalize(stem + word.slice(0, 3));
    if (name.length < 3) name = capitalize(stem + "a");

    const lowerName = name.toLowerCase();
    if (avoidWords.some((w) => lowerName.includes(w))) continue;

    const invented = styleIndex !== 2;
    out.push({
      name,
      meaning: invented
        ? `Invented name inspired by ${brief.purpose || type} and the idea of ${word}.`
        : `Inspired by the concept of ${word} for a ${type}.`,
      pronunciation: pronounce(name),
      naming_style: styleCycle[i % styleCycle.length],
      rationale: `Feels ${brief.personality[0] || "modern"} for a ${type}${brief.audience ? ` used by ${brief.audience}` : ""}.`,
      distinctiveness: i % 9 === 0 ? "Medium" : "High",
      confidence: 0.62 + (i % 8) * 0.04,
      invented,
      originKind: invented ? "invented" : "inspired",
      territory: territories[i % territories.length],
    });
  }
  return out;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function pronounce(name: string) {
  return name.toLowerCase().replace(/([aeiou])/g, "-$1").replace(/^-/, "");
}
