import type { DomainCheckResult } from "@/lib/types";
import { normalizeName } from "@/lib/normalize";

export const PHASE1_TLDS = [".com", ".ai", ".io", ".co", ".app", ".dev"] as const;

export interface DomainAvailabilityAdapter {
  check(name: string, tlds?: readonly string[]): Promise<DomainCheckResult[]>;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const ALT_PREFIXES = ["get", "use", "try"] as const;

function buildAlternatives(
  base: string,
  takenTld: string,
  allResults: DomainCheckResult[],
): string[] {
  const suggestions = ALT_PREFIXES.slice(0, 2).map((prefix) => `${prefix}${base}${takenTld}`);
  const availableAltTld = allResults.find(
    (r) => r.tld !== takenTld && r.availability === "available",
  );
  if (availableAltTld) suggestions.push(`${base}${availableAltTld.tld}`);
  return suggestions.slice(0, 3);
}

export class MockDomainAdapter implements DomainAvailabilityAdapter {
  constructor(private fail = false) {}

  async check(name: string, tlds: readonly string[] = PHASE1_TLDS) {
    if (this.fail) {
      const now = new Date().toISOString();
      return tlds.map((tld) => ({
        domain: `${normalizeName(name)}${tld}`,
        tld,
        availability: "unavailable" as const,
        provider: "mock-domain",
        checkedAt: now,
        errorState: "Unable to check right now",
      }));
    }

    const base = normalizeName(name);
    const now = new Date().toISOString();
    const results: DomainCheckResult[] = tlds.map((tld, i) => {
      const n = hash(base + tld);
      const taken = tld === ".com" ? n % 3 === 0 : n % 4 === 0;
      return {
        domain: `${base}${tld}`,
        tld,
        availability: taken ? "taken" : "available",
        provider: "mock-domain",
        checkedAt: now,
      };
    });

    for (const r of results) {
      if (r.availability === "taken") {
        r.alternatives = buildAlternatives(base, r.tld, results);
      }
    }
    return results;
  }
}

export function getDomainAdapter(): DomainAvailabilityAdapter {
  return new MockDomainAdapter(process.env.MOCK_DOMAIN_FAIL === "1");
}
