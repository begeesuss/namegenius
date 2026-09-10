# Name Genius

**Read this file first** if you are a teammate or an AI assistant (Claude, Cursor, etc.) continuing this project.

Mobile-web product that helps founders name companies, products, apps, and other **non-personal** entities: ask a few adaptive questions → generate a large candidate pool → swipe one name at a time → explain meaning → mock-validate usability → learn taste → shortlist.

This README is a session handoff from 8–9 September 2026. It records what was decided, what was built, which files the product owner uploaded, and what to do next.

---

## 1. What happened in this Cursor session

1. **PRD intake.** Owner uploaded `Name_Genius_PRD_Updated_Mobile_Web.docx`. Product is mobile-web only, anonymous-first, Tinder-style swipe (not a grid of 8 names), LLM for creativity, **external adapters** for facts.
2. **Plan.** Phased build: Phase 1 MVP (generate + understand + basic validate), Phase 2 name intelligence, Phase 3 platform. Owner chose:
   - **Greenfield** in `E:\Product_Anatomy_Pro\Pro\NameGenius` (do not continue the old Vite prototype under `PALS-CCode`).
   - **Real LLM when a key exists; mock domain/usage** until UX is approved.
3. **Phase 1 implemented** as Next.js 16 + TypeScript + Drizzle + SQLite (Postgres-shaped schema, local file DB). Full loop: landing → type → questions → generate → swipe → detail → shortlist → regenerate.
4. **UI restyle.** Owner uploaded a TripGlide-style travel UI (stacked hero cards, charcoal floating pill nav, large radius, overlapping sheets). We restyled Name Genius to that **structure** while keeping **Lato** and brand tokens (`--color-primary` orange, not Inter).
5. **Phase 2 productized in UI + adapters (still mocked, swappable):** trademark risk copy, usage evidence, social handles, linguistic flags, territories, compare, conversational refine.
6. **Phase 3 stubs already in code:** health report, naming projects, comments, votes, markdown export. Not a full auth/collaboration product yet.

**Review gates from the original plan:** owner later asked to keep building (UI + Phase 2) without waiting. Teammates should still treat **real domain/search APIs and production auth** as explicit go-ahead items.

---

## 2. Uploaded source files (now in the repo)

| File | Origin | Role |
|---|---|---|
| [docs/uploads/Name_Genius_PRD_Updated_Mobile_Web.docx](docs/uploads/Name_Genius_PRD_Updated_Mobile_Web.docx) | Owner download: `c:\Users\Hitesh\Downloads\Name_Genius_PRD_Updated_Mobile_Web.docx` | Product requirements. **This is the spec.** |
| [docs/uploads/UI_reference_TripGlide_style.png](docs/uploads/UI_reference_TripGlide_style.png) | Chat image upload (TripGlide-like travel app) | Visual direction for layout/interaction, **not** a travel product and **not** a replacement for brand color/type. |

Also treat as binding (workspace, not uploaded in chat):

- Design tokens / Lato / orange CTAs: parent `CLAUDE.md` design system (and [design-system.md](design-system.md) in this repo).
- Original plan (do not edit unless owner asks): Cursor plan `name_genius_phased_build`.

---

## 3. Product rules (do not regress)

- **In scope:** company, product, feature, website, app, project, brand, community, other. **Out of scope:** baby names, pet names.
- **Mobile-web first.** Phone viewport (~430px). No desktop-optimized layout.
- **Not a chatbot.** Progressive questions, chips/cards, swipe deck.
- **Swipe right = Like, left = Dislike.** Keep tap fallbacks. Save, Undo, Skip, More details.
- **8 names per round**, shown one at a time. Internally generate **50–100**, then filter/rank.
- **Never fabricate etymology.** Invented names are labeled invented/inspired.
- **Never claim legal clearance or permanent domain availability.**
- **Adapter failures must not kill generation** (“Unable to check right now” / “Usage check unavailable”).
- **Fit labels, not 0–100 scores:** Excellent fit / Strong fit / Worth considering / Existing usage detected.
- **Anonymous-first.** Cookie `ng_anon`. Account is optional later.
- **No provider keys in the browser.** Prompts live in `/prompts`, not in UI components.

---

## 4. How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in a **phone-sized** viewport (or a real phone).

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

| Variable | Effect |
|---|---|
| `OPENAI_API_KEY` | Live structured generation. If missing, mock pool is used (app still works). |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | OpenAI-compatible API |
| `MOCK_DOMAIN_FAIL=1` | Force domain adapter error path |
| `MOCK_USAGE_FAIL=1` | Force usage adapter error path |

```bash
npm test
```

SQLite file: `data/namegenius.db` (created on first request; gitignored). Schema is defined in [lib/db/schema.ts](lib/db/schema.ts) and `CREATE TABLE` in [lib/db/index.ts](lib/db/index.ts).

---

## 5. Architecture

```
UI (app/, components/)  →  Route handlers (app/api/)  →  session service
                                                         → question orchestrator
                                                         → LLM client + prompts/
                                                         → pipeline (normalize, dedupe, rank)
                                                         → adapters (domain, usage, trademark, social)
SQLite (Drizzle) stores sessions, candidates, feedback, saves, projects
```

**LLM** generates and explains. **Adapters** check the world. **Backend** owns ranking, preference learning, persistence. **UI** never contains API keys or prompt text.

### Core modules

| Module | Path |
|---|---|
| Types | [lib/types.ts](lib/types.ts) |
| Questions | [lib/questions/orchestrator.ts](lib/questions/orchestrator.ts) |
| Generation | [lib/generation/pipeline.ts](lib/generation/pipeline.ts), [lib/llm/client.ts](lib/llm/client.ts) |
| Ranking | [lib/ranking/rank.ts](lib/ranking/rank.ts) |
| Preference | [lib/learning/preference.ts](lib/learning/preference.ts) |
| Conversation → constraints | [lib/learning/conversation.ts](lib/learning/conversation.ts) |
| Domain / usage / TM / social | [lib/adapters/](lib/adapters/) |
| Session + APIs | [lib/services/session.ts](lib/services/session.ts), [app/api/](app/api/) |
| UI shell + deck | [components/PhoneShell.tsx](components/PhoneShell.tsx), [components/SessionApp.tsx](components/SessionApp.tsx) |
| Tokens + motion | [app/globals.css](app/globals.css), [design-system.md](design-system.md) |
| System prompt | [prompts/naming-system.md](prompts/naming-system.md) |

### MVP APIs (PRD)

- `POST /api/sessions` — create (optional `{ demo: true }`)
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/answers` — type, Q&A, or `{ generateNow: true }`
- `POST /api/sessions/:id/generate`
- `POST /api/sessions/:id/regenerate` — `{ steering, conversation }`
- `GET /api/candidates/:id` — detail + health report
- `POST /api/candidates/:id/feedback` — `like` \| `dislike` \| `save` \| `skip` \| `undo`
- `POST /api/domains/check`
- Projects: `POST /api/projects`, comments, votes, `GET /api/projects/:id/export`

---

## 6. UX map (current)

1. Landing — “Hello there” / featured hero / **Find my name** / demo brief / floating nav.
2. Type — snapping pills (Company … Community) + Other.
3. Questions — one at a time; sticky **Continue** / **Generate names now**; optional style cards.
4. Explore — stacked hero swipe card; See more; circular like/dislike/undo/skip.
5. Detail sheet — overlapping sheet; tabs Fit / Usage / Marks / Social / Sound; domains.
6. Saved — Names / Territories / Compare; steering chips; another round.
7. More — conversational refine, project comments/votes/export.

---

## 7. What is done vs what to do next

### Done (working locally)

- Greenfield Next.js app, design tokens, Lato, mobile shell.
- Anonymous sessions, adaptive questions, skip-to-generate.
- Pool → dedupe → rank → 8 cards; mock domain/usage/TM/social.
- Swipe preference learning (Save > Like > Dislike > Skip), undo, regenerate.
- TripGlide-inspired UI + design-system.md.
- Phase 2 **surfaces** (risk, evidence, social, linguistic, territories, compare, chat refine).
- Phase 3 **stubs** (health report JSON, projects).
- Tests: normalize/dedupe/rank/preference/questions/pipeline/conversation.

### Next work for a teammate / Claude (priority)

1. **Wire a real domain API** behind [lib/adapters/domain.ts](lib/adapters/domain.ts) without changing UI. Keep mocks for tests.
2. **Optional real LLM QA** of name quality (meanings, diversity, anti-etymology) with `OPENAI_API_KEY`.
3. **Polish detail sheet stacking** so the white sheet clearly overlaps the hero (TripGlide destination screen).
4. **Mid-session naming-type change** (PRD: re-evaluate remaining questions).
5. **Postgres** if deploying (schema is already relational; swap Drizzle driver).
6. Phase 2 remaining: live web/entity search adapter (replace usage mock), real social APIs where allowed.
7. Phase 3: real auth, cross-device projects, team sharing, brand health PDF, marketplace/TLD handoff.
8. Accessibility pass: focus order, swipe vs buttons, reduced-motion already partially handled.

Do **not** put trademarks as “legally safe.” Do **not** add baby/pet naming. Do **not** switch the font off Lato.

---

## 8. Design contract

- Font: **Lato only** (400/700/900).
- Primary CTA: `--color-primary` `#FF5500`. Ink/nav chrome: `--color-black` floating pill (from UI reference).
- Radius: featured surfaces `--radius-2xl` (30px); buttons `--radius-pill`.
- Motion: only `transform` and `opacity`; ease-out; press `scale(0.97)`; honor `prefers-reduced-motion`.
- Details: [design-system.md](design-system.md).

---

## 9. Zip package

A source zip (no `node_modules`, `.next`, or local DB):

- Parent folder: `E:\Product_Anatomy_Pro\Pro\NameGenius-handoff.zip`
- In-repo copy: [docs/NameGenius-handoff.zip](docs/NameGenius-handoff.zip)

Unzip, `npm install`, `npm run dev`.
