import { normalizeName } from "@/lib/normalize";
import type { TrademarkSignal } from "@/lib/types";

export interface TrademarkResult {
  signal: TrademarkSignal;
  note?: string;
}

export interface TrademarkAdapter {
  check(name: string): Promise<TrademarkResult>;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export class MockTrademarkAdapter implements TrademarkAdapter {
  async check(name: string): Promise<TrademarkResult> {
    const n = hash(normalizeName(name));
    if (n % 11 === 0) {
      return {
        signal: "potential_conflict",
        note: "Potential conflict detected with related marks. This is a risk signal, not legal clearance.",
      };
    }
    return {
      signal: "low_apparent_conflict",
      note: "Low apparent conflict in mock trademark data. Obtain professional legal review before use.",
    };
  }
}

export function getTrademarkAdapter(): TrademarkAdapter {
  return new MockTrademarkAdapter();
}
