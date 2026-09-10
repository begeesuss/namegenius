export function parseConversation(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const out: string[] = [`User said: "${t}"`];
  if (/short(er)?|tiny|brief/i.test(t)) out.push("Prefer fewer syllables and shorter spellings.");
  if (/long(er)?|descriptive/i.test(t)) out.push("Allow more descriptive or compound constructions.");
  if (/feminine|masculine|gender/i.test(t)) out.push("Shift toward gender-neutral sound and associations.");
  if (/playful|fun|whims/i.test(t)) out.push("Increase playful tone.");
  if (/premium|luxury|serious/i.test(t)) out.push("Increase premium, restrained tone.");
  if (/meaning|etymolog|real word/i.test(t)) out.push("Prefer meaningful or inspired names over purely invented ones.");
  if (/invent|made up|coined/i.test(t)) out.push("Prefer invented brandable names.");
  if (/keep the meaning|same idea/i.test(t)) out.push("Preserve the current semantic territory.");
  return out;
}
