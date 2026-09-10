"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneShell } from "@/components/PhoneShell";
import { NAMING_TYPE_LABELS, NAMING_TYPES, STYLE_CARDS } from "@/lib/types";
import type { AnsweredQuestion, NameCandidateRecord, NamingType, QuestionId, QuestionView } from "@/lib/types";

type NavId = "home" | "explore" | "saved" | "more" | "edit";

const ANSWER_FIELD: Record<QuestionId, string> = {
  purpose: "purpose",
  audience: "audience",
  industry: "industry",
  personality: "personality",
  naming_style: "namingStyle",
  include: "include",
  avoid: "avoid",
  geography: "geography",
};

type Payload = {
  session: {
    id: string;
    status: string;
    namingType: NamingType | null;
    answers: Record<string, unknown>;
    currentIndex: number;
    exploredCount: number;
    projectId?: string | null;
  };
  question: QuestionView | null;
  answeredQuestions: AnsweredQuestion[];
  enough: boolean;
  confidence: number;
  candidates: NameCandidateRecord[];
  current: NameCandidateRecord | null;
  upcoming: NameCandidateRecord[];
  saved: NameCandidateRecord[];
  liked: NameCandidateRecord[];
  territories: { territory: string; names: NameCandidateRecord[] }[];
};

function wash(territory?: string) {
  if (!territory) return "";
  if (/light|clarity/i.test(territory)) return "t-light";
  if (/intel/i.test(territory)) return "t-intel";
  if (/motion/i.test(territory)) return "t-motion";
  if (/craft/i.test(territory)) return "t-craft";
  if (/trust/i.test(territory)) return "t-trust";
  if (/play/i.test(territory)) return "t-play";
  return "";
}

export function SessionApp({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [other, setOther] = useState("");
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<NameCandidateRecord | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [openIntel, setOpenIntel] = useState("fit");
  const [compare, setCompare] = useState<string[]>([]);
  const [conversation, setConversation] = useState("");
  const [comment, setComment] = useState("");
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [listTab, setListTab] = useState<"names" | "territories" | "compare">("names");
  const [navOverride, setNavOverride] = useState<NavId | null>(null);
  const [editingId, setEditingId] = useState<QuestionId | null>(null);
  const [editingType, setEditingType] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) throw new Error("Session not found");
    setData(await res.json());
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [sessionId]);

  async function postAnswers(body: unknown) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setData(await res.json());
      setText("");
      setMulti([]);
      setEditingId(null);
      setEditingType(false);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(q: AnsweredQuestion) {
    setEditingId(q.id);
    const raw = data?.session.answers[ANSWER_FIELD[q.id]];
    if (q.kind === "multi_chips") {
      setMulti(Array.isArray(raw) ? (raw as string[]) : []);
    } else {
      setText(typeof raw === "string" ? raw : "");
    }
  }

  async function feedback(id: string, action: string) {
    setBusy(true);
    const res = await fetch(`/api/candidates/${id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setData(await res.json());
    setBusy(false);
  }

  async function regenerate(steering?: string, conv?: string) {
    setBusy(true);
    const res = await fetch(`/api/sessions/${sessionId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steering, conversation: conv }),
    });
    setData(await res.json());
    setNavOverride("explore");
    setBusy(false);
  }

  async function openDetails(c: NameCandidateRecord) {
    setDetail(c);
    const res = await fetch(`/api/candidates/${c.id}`);
    const json = await res.json();
    setReport(json.report);
    setDetail(json.candidate ?? c);
  }

  if (error) {
    return (
      <PhoneShell greeting="Something broke" subtitle={error} showNav={false}>
        <p style={{ padding: 20 }}>{error}</p>
      </PhoneShell>
    );
  }

  if (!data) {
    return (
      <PhoneShell greeting="Name Genius" subtitle="Opening your session…">
        <div className="card" style={{ margin: 20 }}>Loading…</div>
      </PhoneShell>
    );
  }

  const status = data.session.status;
  const nav: NavId =
    navOverride ??
    (status === "deck" ? "explore" : status === "shortlist" ? "saved" : "home");

  function onNav(id: NavId) {
    if (id === "home") {
      router.push("/");
      return;
    }
    setNavOverride(id);
  }

  const editingFromShortlist = nav === "edit";

  const greeting = editingFromShortlist
    ? "Your answers"
    : status === "type"
      ? "Let's name it then claim it."
      : status === "questions"
        ? "Let's name it then claim it."
        : status === "generating"
          ? "Finding names"
          : status === "deck"
            ? "Explore names"
            : "Your shortlist";

  const showExplore = nav === "explore" && status === "deck" && data.current;
  const showSaved =
    (nav === "saved" || status === "shortlist" || (nav === "explore" && !data.current)) &&
    !editingFromShortlist;
  const showMore = nav === "more";
  const showHomeFlow = nav === "home" || (nav !== "explore" && nav !== "saved" && nav !== "more" && nav !== "edit");
  const showQuestionFlow = editingFromShortlist || (showHomeFlow && status === "questions");

  return (
    <PhoneShell
      greeting={greeting}
      subtitle={
        editingFromShortlist
          ? "Tap any answer to change it."
          : status === "type" || status === "questions"
            ? "Drop in a few details and let’s cook up a name worth claiming."
            : undefined
      }
      activeNav={nav}
      onNav={onNav}
      headerAction={
        editingFromShortlist ? (
          <button
            className="skip-link skip-link--header"
            type="button"
            onClick={() => setNavOverride("saved")}
          >
            Done
          </button>
        ) : undefined
      }
    >
      {showHomeFlow && status === "type" && (
        <div style={{ padding: "0 var(--spacing-5)" }}>
          <TypeStep other={other} setOther={setOther} busy={busy} onPick={(type) => postAnswers({ namingType: type, otherLabel: type === "other" ? other : undefined })} />
        </div>
      )}

      {showQuestionFlow && (
        <div style={{ padding: "0 var(--spacing-5)", display: "grid", gap: 12 }}>
          {data.session.namingType && (
            editingType ? (
              <TypeStep
                key="type"
                other={other}
                setOther={setOther}
                busy={busy}
                onPick={(type) => postAnswers({ namingType: type, otherLabel: type === "other" ? other : undefined })}
              />
            ) : (
              <button type="button" className="card qcard qcard--done" onClick={() => setEditingType(true)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="question-eyebrow" style={{ marginBottom: 2 }}>Type</p>
                    <p className="qcard-summary">
                      {data.session.namingType === "other"
                        ? String(data.session.answers.otherLabel ?? "Other")
                        : NAMING_TYPE_LABELS[data.session.namingType]}
                    </p>
                  </div>
                  <span className="qcard-edit-icon" aria-hidden>✎</span>
                </div>
              </button>
            )
          )}
          {data.answeredQuestions.map((q) =>
            q.id === editingId ? (
              <QuestionStep
                key={q.id}
                question={q}
                isEditing
                enough={data.enough}
                confidence={data.confidence}
                text={text}
                setText={setText}
                multi={multi}
                setMulti={setMulti}
                busy={busy}
                onSubmit={() =>
                  postAnswers({
                    questionId: q.id,
                    value: q.kind === "multi_chips" ? multi : text,
                    noAutoGenerate: editingFromShortlist,
                  })
                }
                onStyle={(id) =>
                  postAnswers({ questionId: "naming_style", value: id, noAutoGenerate: editingFromShortlist })
                }
                onGenerateNow={() => postAnswers({ generateNow: true })}
                onSkip={() => postAnswers({ questionId: q.id, skip: true, noAutoGenerate: editingFromShortlist })}
              />
            ) : (
              <QCardCollapsed key={q.id} question={q} onEdit={() => startEdit(q)} />
            ),
          )}
          {!editingId && data.question && (
            <QuestionStep
              question={data.question}
              isEditing={false}
              enough={data.enough}
              confidence={data.confidence}
              text={text}
              setText={setText}
              multi={multi}
              setMulti={setMulti}
              busy={busy}
              onSubmit={() =>
                postAnswers({
                  questionId: data.question?.id,
                  value: data.question?.kind === "multi_chips" ? multi : text,
                  noAutoGenerate: editingFromShortlist,
                })
              }
              onStyle={(id) =>
                postAnswers({ questionId: "naming_style", value: id, noAutoGenerate: editingFromShortlist })
              }
              onGenerateNow={() => postAnswers({ generateNow: true })}
              onSkip={() =>
                postAnswers({ questionId: data.question?.id, skip: true, noAutoGenerate: editingFromShortlist })
              }
            />
          )}
        </div>
      )}

      {status === "generating" && (
        <div style={{ padding: "var(--spacing-5)" }}>
          <div className="hero-card" style={{ minHeight: 220 }}>
            <div className="hero-wash t-intel" />
            <div className="hero-body">
              <h2 className="name-hero" style={{ color: "var(--color-text-inverse)" }}>
                Working the brief
              </h2>
              <p>Pooling candidates, then ranking with meaning and risk signals.</p>
            </div>
          </div>
        </div>
      )}

      {showExplore && data.current && (
        <DeckStep
          current={data.current}
          upcoming={data.upcoming}
          busy={busy}
          exploredCount={data.session.exploredCount}
          onFeedback={feedback}
          onDetail={openDetails}
        />
      )}

      {(showSaved || (status === "shortlist" && nav !== "more" && !editingFromShortlist)) && nav !== "explore" && (
        <ShortlistStep
          data={data}
          listTab={listTab}
          setListTab={setListTab}
          compare={compare}
          setCompare={setCompare}
          busy={busy}
          onEditAnswers={() => setNavOverride("edit")}
          onReport={openDetails}
          onRegenerate={regenerate}
        />
      )}

      {showMore && (
        <MoreStep
          conversation={conversation}
          setConversation={setConversation}
          comment={comment}
          setComment={setComment}
          project={project}
          busy={busy}
          onRegenerate={regenerate}
          onProject={async () => {
            const res = await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
            setProject(await res.json());
          }}
          shortlist={data.saved.length ? data.saved : data.liked}
        />
      )}

      {detail && (
        <DetailExperience
          candidate={detail}
          report={report}
          openIntel={openIntel}
          setOpenIntel={setOpenIntel}
          onClose={() => {
            setDetail(null);
            setReport(null);
          }}
          onSave={() => feedback(detail.id, "save")}
        />
      )}
    </PhoneShell>
  );
}

function TypeStep({
  other,
  setOther,
  busy,
  onPick,
}: {
  other: string;
  setOther: (v: string) => void;
  busy: boolean;
  onPick: (t: NamingType) => void;
}) {
  return (
    <div className="card qcard qcard--active">
      <p className="question-eyebrow">Type</p>
      <h2 className="name-hero" style={{ marginBottom: 4 }}>What are you naming?</h2>
      <div className="type-grid stagger" style={{ marginTop: "var(--spacing-3)" }}>
        {NAMING_TYPES.filter((t) => t !== "other").map((type) => (
          <button key={type} className="chip type-grid-item" disabled={busy} onClick={() => onPick(type)}>
            {NAMING_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "var(--spacing-4)" }}>
        <label className="field-label" htmlFor="other">
          Something else?
        </label>
        <input
          id="other"
          className="input"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="e.g. newsletter, podcast, community"
        />
        <button
          className="btn btn-ink"
          style={{ marginTop: 12 }}
          disabled={busy || other.trim().length < 2}
          onClick={() => onPick("other")}
        >
          Continue with other
        </button>
      </div>
    </div>
  );
}

function toggleInList(current: string, label: string) {
  const items = current.split(",").map((s) => s.trim()).filter(Boolean);
  const exists = items.some((i) => i.toLowerCase() === label.toLowerCase());
  const next = exists
    ? items.filter((i) => i.toLowerCase() !== label.toLowerCase())
    : [...items, label];
  return next.join(", ");
}

function briefStrength(confidence: number): { tier: 1 | 2 | 3; caption: string } {
  if (confidence >= 0.95) return { tier: 3, caption: "Great brief — this gives us the most to work with." };
  if (confidence >= 0.8) return { tier: 2, caption: "Good brief — solid signal for distinctive names." };
  return { tier: 1, caption: "Basic brief — names will be broad." };
}

function QuestionStep(props: {
  question: QuestionView;
  isEditing: boolean;
  enough: boolean;
  confidence: number;
  text: string;
  setText: (v: string) => void;
  multi: string[];
  setMulti: (v: string[]) => void;
  busy: boolean;
  onSubmit: () => void;
  onStyle: (id: string) => void;
  onGenerateNow: () => void;
  onSkip?: () => void;
}) {
  const { question } = props;
  return (
    <div className={`card qcard qcard--active${props.isEditing ? " qcard--editing" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {question.eyebrow && <p className="question-eyebrow">{question.eyebrow}</p>}
          <h2 className="name-hero" style={{ marginBottom: 4 }}>{question.title}</h2>
        </div>
        {!question.required && props.onSkip && (
          <button className="skip-link" type="button" disabled={props.busy} onClick={props.onSkip}>
            Skip
          </button>
        )}
      </div>
      <p className="field-hint" style={{ marginTop: 0 }}>{question.helper}</p>

      {question.kind === "text" && ((question.quickPicks && question.quickPicks.length > 0) || (question.smartPicks && question.smartPicks.length > 0)) && (
        <div className="quick-picks" style={{ padding: 0, marginTop: "var(--spacing-3)" }}>
          {[
            ...(question.smartPicks ?? []).map((pick) => ({ pick, smart: true })),
            ...(question.quickPicks ?? [])
              .filter((pick) => !(question.smartPicks ?? []).includes(pick))
              .map((pick) => ({ pick, smart: false })),
          ].map(({ pick, smart }) => {
            const active =
              question.quickPickMode === "toggle"
                ? props.text.split(",").map((s) => s.trim().toLowerCase()).includes(pick.toLowerCase())
                : props.text.trim().toLowerCase() === pick.toLowerCase();
            return (
              <button
                key={pick}
                type="button"
                className="chip"
                data-active={active}
                data-smart={smart || undefined}
                onClick={() =>
                  props.setText(
                    question.quickPickMode === "toggle" ? toggleInList(props.text, pick) : pick,
                  )
                }
              >
                {smart && <span className="chip-smart-mark" aria-hidden>✨</span>}
                {pick}
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "text" && (
        <div style={{ marginTop: "var(--spacing-3)" }}>
          <textarea className="textarea" rows={3} value={props.text} onChange={(e) => props.setText(e.target.value)} placeholder={question.placeholder || "A short answer is enough"} />
        </div>
      )}

      {question.kind === "multi_chips" && (
        <div className="stagger" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "var(--spacing-3)" }}>
          {question.options?.map((opt) => (
            <button
              key={opt.id}
              className="chip"
              data-active={props.multi.includes(opt.id)}
              onClick={() =>
                props.setMulti(
                  props.multi.includes(opt.id)
                    ? props.multi.filter((x) => x !== opt.id)
                    : [...props.multi, opt.id],
                )
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {question.kind === "style_cards" && (
        <div className="stagger" style={{ display: "grid", gap: 8, marginTop: "var(--spacing-3)" }}>
          {STYLE_CARDS.map((card) => (
            <button key={card.id} className="input style-card" disabled={props.busy} onClick={() => props.onStyle(card.id)}>
              <span className="style-card-examples">e.g. {card.examples}</span>
              <strong>{card.title}</strong>
              <p className="field-hint" style={{ margin: "4px 0 0" }}>{card.description}</p>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginTop: "var(--spacing-4)" }}>
        {question.kind !== "style_cards" && (
          <button className="btn btn-ink" disabled={props.busy} onClick={props.onSubmit}>
            Continue
          </button>
        )}
        {question.canGenerateNow && props.enough && (
          <div>
            <button className="btn btn-primary" disabled={props.busy} onClick={props.onGenerateNow}>
              Generate names now
            </button>
            <div className="brief-strength" style={{ marginTop: 8 }}>
              <div className="brief-strength-bars" aria-hidden>
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="brief-strength-bar"
                    data-filled={i <= briefStrength(props.confidence).tier}
                  />
                ))}
              </div>
              <p className="field-hint" style={{ margin: 0 }}>{briefStrength(props.confidence).caption}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QCardCollapsed({
  question,
  onEdit,
}: {
  question: AnsweredQuestion;
  onEdit: () => void;
}) {
  return (
    <button type="button" className="card qcard qcard--done" onClick={onEdit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {question.eyebrow && <p className="question-eyebrow" style={{ marginBottom: 2 }}>{question.eyebrow}</p>}
          {question.skipped ? (
            <p className="qcard-summary qcard-summary--skipped">Skipped</p>
          ) : (
            <p className="qcard-summary">{question.displayValue || question.title}</p>
          )}
        </div>
        <span className="qcard-edit-icon" aria-hidden>✎</span>
      </div>
    </button>
  );
}

function DeckStep({
  current,
  upcoming,
  busy,
  exploredCount,
  onFeedback,
  onDetail,
}: {
  current: NameCandidateRecord;
  upcoming: NameCandidateRecord[];
  busy: boolean;
  exploredCount: number;
  onFeedback: (id: string, action: string) => void;
  onDetail: (c: NameCandidateRecord) => void;
}) {
  const [dx, setDx] = useState(0);
  const [label, setLabel] = useState<"Like" | "Dislike" | "">("");
  const startX = useRef<number | null>(null);
  const startT = useRef(0);

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startT.current = Date.now();
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    const delta = e.clientX - startX.current;
    setDx(delta);
    setLabel(delta > 40 ? "Like" : delta < -40 ? "Dislike" : "");
  }
  function onPointerUp() {
    const dist = dx;
    const velocity = Math.abs(dist) / Math.max(1, Date.now() - startT.current);
    const like = dist > 80 || (dist > 28 && velocity > 0.11);
    const dislike = dist < -80 || (dist < -28 && velocity > 0.11);
    if (like) onFeedback(current.id, "like");
    else if (dislike) onFeedback(current.id, "dislike");
    setDx(0);
    setLabel("");
    startX.current = null;
  }

  const com = current.domainChecks.find((d) => d.tld === ".com");

  return (
    <div>
      <div className="swipe-stage">
        {upcoming[0] && (
          <article className="hero-card swipe-stack">
            <div className={`hero-wash ${wash(upcoming[0].territory)}`} />
          </article>
        )}
        <article
          className="hero-card swipe-card"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ transform: `translateX(${dx}px) rotate(${dx / 22}deg)` }}
        >
          <div className={`hero-wash ${wash(current.territory)}`} />
          {label && (
            <span
              className="swipe-stamp"
              style={{
                left: label === "Dislike" ? 16 : "auto",
                right: label === "Like" ? 16 : "auto",
                color: label === "Like" ? "var(--color-success)" : "var(--color-error)",
              }}
            >
              {label === "Like" ? "♡ Like" : "✕ Not for me"}
            </span>
          )}
          <div className="hero-actions">
            <span className="badge badge-brand">{current.territory}</span>
            <button className="icon-btn" type="button" aria-label="Save" disabled={busy} onClick={() => onFeedback(current.id, "save")}>
              ♡
            </button>
          </div>
          <div className="hero-body">
            <p className="swipe-pronounce">{current.pronunciation}</p>
            <h2 className={`swipe-name ${wash(current.territory)}`}>{current.name}</h2>
            <div className="swipe-divider" />
            <p className="swipe-meaning">{current.meaning}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              <span className="badge badge-brand">{current.fitLabel}</span>
              <span className="badge badge-warning">{current.distinctiveness}</span>
              {current.usageStatus === "detected" && <span className="badge badge-error">Existing usage</span>}
              {current.trademarkSignal === "potential_conflict" && (
                <span className="badge badge-error">TM risk</span>
              )}
            </div>
            {com?.availability === "taken" && com.alternatives?.length ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {com.alternatives.slice(0, 2).map((alt) => (
                  <span key={alt} className="badge badge-brand">{alt}</span>
                ))}
              </div>
            ) : null}
            <div className="swipe-meta-row">
              <p className="swipe-domain">
                {com?.availability === "unavailable"
                  ? "Unable to check right now"
                  : `${com?.domain ?? ""} · ${com?.availability ?? ""} · checked just now`}
              </p>
              <button className="more-link" type="button" onClick={() => onDetail(current)}>
                See more ›
              </button>
            </div>
          </div>
        </article>
      </div>

      <p className="explored-count">{exploredCount} {exploredCount === 1 ? "name" : "names"} explored</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "20px 20px 0" }}>
        <button className="icon-btn" style={{ width: "100%" }} disabled={busy} onClick={() => onFeedback(current.id, "dislike")} aria-label="Dislike">✕</button>
        <button className="icon-btn" style={{ width: "100%" }} disabled={busy} onClick={() => onFeedback(current.id, "undo")} aria-label="Undo">↩</button>
        <button className="icon-btn" style={{ width: "100%", background: "var(--color-success)", color: "white" }} disabled={busy} onClick={() => onFeedback(current.id, "like")} aria-label="Like">♡</button>
      </div>
    </div>
  );
}

function ShortlistStep({
  data,
  listTab,
  setListTab,
  compare,
  setCompare,
  busy,
  onEditAnswers,
  onReport,
  onRegenerate,
}: {
  data: Payload;
  listTab: "names" | "territories" | "compare";
  setListTab: (t: "names" | "territories" | "compare") => void;
  compare: string[];
  setCompare: (ids: string[]) => void;
  busy: boolean;
  onEditAnswers: () => void;
  onReport: (c: NameCandidateRecord) => void;
  onRegenerate: (steering?: string) => void;
}) {
  const pool = data.saved.length ? data.saved : data.liked.length ? data.liked : data.candidates;
  const compared = pool.filter((c) => compare.includes(c.id));

  return (
    <div>
      <div style={{ padding: "0 20px", marginBottom: 4 }}>
        <button className="skip-link" type="button" style={{ padding: "4px 0" }} onClick={onEditAnswers}>
          Edit your answers
        </button>
      </div>
      <div className="chip-row">
        <button className="chip" data-active={listTab === "names"} onClick={() => setListTab("names")}>Names</button>
        <button className="chip" data-active={listTab === "territories"} onClick={() => setListTab("territories")}>Territories</button>
        <button className="chip" data-active={listTab === "compare"} onClick={() => setListTab("compare")}>Compare</button>
      </div>

      {listTab !== "compare" && (
        <div style={{ padding: "0 20px", display: "grid", gap: 12 }}>
          {(listTab === "territories" ? data.territories : [{ territory: "Shortlist", names: pool }]).map((block) => (
            <section key={block.territory}>
              <h3 style={{ margin: "8px 0", fontSize: "var(--font-size-md)" }}>{block.territory}</h3>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory" }}>
                {block.names.map((n) => (
                  <button
                    key={n.id}
                    className="hero-card"
                    style={{ minWidth: 220, minHeight: 160, scrollSnapAlign: "start", textAlign: "left", border: 0 }}
                    onClick={() => onReport(n)}
                  >
                    <div className={`hero-wash ${wash(n.territory)}`} />
                    <div className="hero-body">
                      <strong>{n.name}</strong>
                      <p style={{ margin: 0, fontSize: 12 }}>{n.fitLabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {listTab === "compare" && (
        <div style={{ padding: "0 20px" }}>
          <p className="field-hint">Pick up to three names.</p>
          {pool.map((n) => (
            <label key={n.id} className="card" style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={compare.includes(n.id)}
                onChange={() =>
                  setCompare(
                    compare.includes(n.id) ? compare.filter((x) => x !== n.id) : [...compare, n.id].slice(0, 3),
                  )
                }
              />
              <span>
                <strong>{n.name}</strong>
                <span className="field-hint" style={{ display: "block", margin: 0 }}>{n.fitLabel}</span>
              </span>
            </label>
          ))}
          {compared.length >= 2 && (
            <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${compared.length}, 1fr)` }}>
              {compared.map((c) => (
                <div key={c.id} className="card" style={{ padding: 12 }}>
                  <strong>{c.name}</strong>
                  <p className="field-hint">Fit {c.fitLabel}</p>
                  <p className="field-hint">Say {c.pronunciation}</p>
                  <p className="field-hint">Use {c.usageStatus}</p>
                  <p className="field-hint">TM {c.trademarkSignal.replace(/_/g, " ")}</p>
                  <p className="field-hint">.com {c.domainChecks.find((d) => d.tld === ".com")?.availability}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chip-row" style={{ marginTop: 12 }}>
        {["More like this", "More distinctive", "Shorter", "More premium", "More playful", "More meaningful"].map(
          (chip) => (
            <button key={chip} className="chip" disabled={busy} onClick={() => onRegenerate(chip)}>
              {chip}
            </button>
          ),
        )}
      </div>
      <div style={{ padding: "8px 20px 0" }}>
        <button className="btn btn-ink" disabled={busy} onClick={() => onRegenerate()}>
          Generate another round
        </button>
      </div>
    </div>
  );
}


function MoreStep({
  conversation,
  setConversation,
  comment,
  setComment,
  project,
  busy,
  onRegenerate,
  onProject,
  shortlist,
}: {
  conversation: string;
  setConversation: (v: string) => void;
  comment: string;
  setComment: (v: string) => void;
  project: Record<string, unknown> | null;
  busy: boolean;
  onRegenerate: (steering?: string, conv?: string) => void;
  onProject: () => void;
  shortlist: NameCandidateRecord[];
}) {
  const p = project?.project as { id: string; title: string } | undefined;
  const comments = (project?.comments as { id: string; author: string; body: string }[]) || [];
  return (
    <div style={{ padding: "0 20px", display: "grid", gap: 12 }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Tell us in a sentence</h3>
        <p className="field-hint">We turn this into constraints — shorter, more neutral, keep the meaning.</p>
        <textarea className="textarea" rows={3} value={conversation} onChange={(e) => setConversation(e.target.value)} placeholder="Keep the meaning but make it shorter" />
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || !conversation.trim()} onClick={() => onRegenerate(undefined, conversation)}>
          Apply and regenerate
        </button>
      </div>
      <button className="btn btn-ink" disabled={busy} onClick={onProject}>
        Save as a naming project
      </button>
      <p className="field-hint">No account required. Sign in later to keep this on another device.</p>
      {p && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{p.title}</h3>
          {comments.map((c) => (
            <p key={c.id}><strong>{c.author}:</strong> {c.body}</p>
          ))}
          <textarea className="textarea" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          <button
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            onClick={async () => {
              await fetch(`/api/projects/${p.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ author: "You", body: comment }),
              });
              setComment("");
            }}
          >
            Add comment
          </button>
          {shortlist[0] && (
            <button
              className="btn btn-tertiary"
              onClick={async () => {
                await fetch(`/api/projects/${p.id}/votes`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ candidateId: shortlist[0].id, voter: "You", value: 1 }),
                });
              }}
            >
              Vote for {shortlist[0].name}
            </button>
          )}
          <a className="btn btn-secondary" href={`/api/projects/${p.id}/export`}>Export report</a>
        </div>
      )}
    </div>
  );
}

function DetailExperience({
  candidate,
  report,
  openIntel,
  setOpenIntel,
  onClose,
  onSave,
}: {
  candidate: NameCandidateRecord;
  report: Record<string, unknown> | null;
  openIntel: string;
  setOpenIntel: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const rec = report?.recommendation as string | undefined;
  const evidence = candidate.usageEvidence ?? [];
  const primaryDomain = candidate.domainChecks.find((d) => d.tld === ".com");
  const otherDomains = candidate.domainChecks.filter((d) => d.tld !== ".com");
  const domainAvailable = primaryDomain?.availability === "available";
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-backdrop" />
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", height: "92%" }}>
        <article className="hero-card" style={{ borderRadius: 0, minHeight: 220, flex: "0 0 auto" }}>
          <div className={`hero-wash ${wash(candidate.territory)}`} />
          <div className="hero-actions">
            <button className="icon-btn" type="button" onClick={onClose} aria-label="Back">←</button>
            <button className="icon-btn" type="button" onClick={onSave} aria-label="Save">♡</button>
          </div>
          <div className="hero-body">
            <p style={{ margin: 0 }}>{candidate.pronunciation}</p>
            <h2 className={`name-hero ${wash(candidate.territory)}`} style={{ color: "var(--color-text-inverse)" }}>{candidate.name}</h2>
          </div>
        </article>
        <div className="card overlap-sheet" style={{ flex: 1, overflow: "auto", margin: 0, borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0" }}>
          <div className="chip-row" style={{ padding: 0 }}>
            {[
              ["fit", "Fit"],
              ["usage", "Usage"],
              ["marks", "Marks"],
              ["social", "Social"],
              ["sound", "Sound"],
            ].map(([id, label]) => (
              <button key={id} className="chip" data-active={openIntel === id} onClick={() => setOpenIntel(id)}>
                {label}
              </button>
            ))}
          </div>
          {openIntel === "fit" && (
            <div>
              <p><strong>{candidate.fitLabel}</strong> · {candidate.style}</p>
              <p>{candidate.meaning}</p>
              <p>{candidate.rationale}</p>
              {rec && <p className="badge badge-brand">{rec}</p>}
              <p className="field-hint">Risk signals are not legal clearance.</p>
            </div>
          )}
          {openIntel === "usage" && (
            <div>
              <p>{candidate.usageNote || "No strong existing-use warning in this check."}</p>
              {evidence.map((ev) => (
                <details key={ev.title} className="accordion" open>
                  <summary>{ev.title}</summary>
                  <p className="field-hint">{ev.why}</p>
                </details>
              ))}
            </div>
          )}
          {openIntel === "marks" && (
            <div>
              <p className="badge badge-warning">{candidate.trademarkSignal.replace(/_/g, " ")}</p>
              <p>{candidate.trademarkNote}</p>
              <p className="field-hint">Obtain professional legal review before use.</p>
            </div>
          )}
          {openIntel === "social" && (
            <div>
              {candidate.socialHandles.map((h) => (
                <p key={h.platform}>
                  {h.platform}: {h.status === "unavailable_to_check" ? "unavailable to check" : h.status}
                </p>
              ))}
            </div>
          )}
          {openIntel === "sound" && (
            <div>
              <p>Difficulty: {candidate.linguistic.pronunciationDifficulty}</p>
              {candidate.linguistic.unintendedMeanings.map((m) => (
                <p key={m}>{m}</p>
              ))}
              {candidate.linguistic.crossLanguageNotes.map((m) => (
                <p key={m}>{m}</p>
              ))}
              {candidate.linguistic.offensiveRisk !== "none" && (
                <p className="badge badge-error">Possible sensitive reading</p>
              )}
            </div>
          )}
          <h3>Domains</h3>
          {primaryDomain && (
            <div className={`detail-domain-card ${domainAvailable ? "detail-domain-card--available" : ""}`}>
              <div className="detail-domain-card-top">
                <span className="detail-domain-name">{primaryDomain.domain}</span>
                <span
                  className={`badge ${domainAvailable ? "badge-success" : primaryDomain.errorState ? "badge-warning" : "badge-error"}`}
                >
                  {primaryDomain.errorState ? "Unable to check" : domainAvailable ? "Available" : "Taken"}
                </span>
              </div>
              <p className="detail-domain-hint">
                {domainAvailable
                  ? "This one's open right now — claim it before someone else does."
                  : primaryDomain.errorState || "Someone already owns this exact domain."}
              </p>
              {primaryDomain.alternatives?.length ? (
                <div className="detail-domain-alts">
                  {primaryDomain.alternatives.map((alt) => (
                    <span key={alt} className="badge badge-brand">{alt}</span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {otherDomains.length > 0 && (
            <div className="detail-domain-others">
              {otherDomains.map((d) => (
                <p key={d.tld} className="field-hint" style={{ margin: "0 0 4px" }}>
                  {d.domain}: {d.errorState || d.availability}
                </p>
              ))}
            </div>
          )}

          <div className="detail-cta-row">
            <button
              className="btn btn-primary"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                // TODO: wire to registrar affiliate link once selected
                console.log("Claim domain CTA clicked (stub)", primaryDomain?.domain ?? candidate.name);
              }}
            >
              Claim {primaryDomain?.domain ?? `${candidate.name}.com`}
            </button>
            <button className="btn btn-secondary" onClick={onSave}>Save this name</button>
          </div>
        </div>
      </div>
    </div>
  );
}
