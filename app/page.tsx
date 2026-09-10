"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneShell } from "@/components/PhoneShell";

export default function LandingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start(demo = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo }),
      });
      const data = await res.json();
      const id = data.session?.id ?? data.id;
      if (!id) throw new Error("Could not start session");
      router.push(`/session/${id}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <PhoneShell greeting="" activeNav="home">
      <div className="welcome">
        <div className="welcome-mark" aria-hidden>
          N
        </div>

        <div className="welcome-illustration" aria-hidden>
          <div className="welcome-glow" />
          <div className="mini-card mini-card--back" />
          <div className="mini-card mini-card--mid" />
          <div className="mini-card mini-card--front">
            <span className="mini-card-bar" />
            <span className="mini-card-bar mini-card-bar--short" />
            <span className="mini-card-check">✓</span>
          </div>
        </div>

        <h1 className="welcome-title">
          Welcome to
          <br />
          Name Genius
        </h1>
        <p className="welcome-subtext">
          AI names your next thing, then proves you can actually use it.
        </p>

        <button
          className="btn btn-primary welcome-cta"
          disabled={busy}
          onClick={() => start(false)}
        >
          Let&apos;s find a name
        </button>
      </div>
    </PhoneShell>
  );
}
