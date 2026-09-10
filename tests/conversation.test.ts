import { describe, expect, it } from "vitest";
import { parseConversation } from "../lib/learning/conversation";

describe("conversational refine", () => {
  it("maps free text into constraints", () => {
    const out = parseConversation("Keep the meaning but make it shorter");
    expect(out.some((l) => /shorter/i.test(l))).toBe(true);
    expect(out.some((l) => /semantic territory/i.test(l))).toBe(true);
  });
});
