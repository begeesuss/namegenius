import { normalizeName } from "@/lib/normalize";

export interface UsageEvidence {
  title: string;
  why: string;
}

export interface ExistingUsageResult {
  status: "clear" | "detected" | "unavailable";
  note?: string;
  evidence?: UsageEvidence[];
}

export interface ExistingUsageAdapter {
  check(name: string): Promise<ExistingUsageResult>;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const ENTITIES = [
  "a SaaS analytics product",
  "a consumer mobile app",
  "a studio / agency",
  "an open-source tool",
];

export class MockUsageAdapter implements ExistingUsageAdapter {
  constructor(private fail = false) {}

  async check(name: string): Promise<ExistingUsageResult> {
    if (this.fail) {
      return { status: "unavailable", note: "Usage check unavailable" };
    }
    const n = hash(normalizeName(name));
    if (n % 7 === 0) {
      const entity = ENTITIES[n % ENTITIES.length];
      return {
        status: "detected",
        note: "Existing usage detected — this name is already used by multiple brands/products.",
        evidence: [
          {
            title: `${name} appears as ${entity}`,
            why: "Same or highly similar spelling in a nearby category. Not a legal finding — it raises collision risk in search and brand memory.",
          },
          {
            title: "Web mentions in product directories",
            why: "Shoppers and investors may assume an existing product. Keep the candidate, but rank risk visibly.",
          },
        ],
      };
    }
    return { status: "clear" };
  }
}

export function getUsageAdapter(): ExistingUsageAdapter {
  return new MockUsageAdapter(process.env.MOCK_USAGE_FAIL === "1");
}
