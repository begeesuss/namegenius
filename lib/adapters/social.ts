import { normalizeName } from "@/lib/normalize";
import type { SocialHandleResult } from "@/lib/types";

const PLATFORMS = ["X", "Instagram", "LinkedIn", "YouTube", "GitHub"] as const;

export interface SocialHandleAdapter {
  check(name: string): Promise<SocialHandleResult[]>;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export class MockSocialAdapter implements SocialHandleAdapter {
  async check(name: string): Promise<SocialHandleResult[]> {
    const handle = normalizeName(name);
    return PLATFORMS.map((platform, i) => {
      const n = hash(handle + platform);
      if (platform === "LinkedIn" && n % 5 === 0) {
        return { platform, handle, status: "unavailable_to_check" as const };
      }
      return {
        platform,
        handle,
        status: n % 3 === 0 ? ("taken" as const) : ("available" as const),
      };
    });
  }
}

export function getSocialAdapter(): SocialHandleAdapter {
  return new MockSocialAdapter();
}
