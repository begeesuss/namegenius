"use client";

type NavId = "home" | "explore" | "saved" | "more" | "edit";

export function PhoneShell({
  children,
  greeting,
  subtitle,
  showNav = true,
  activeNav = "home",
  onNav,
  headerAction,
}: {
  children: React.ReactNode;
  greeting: string;
  subtitle?: string;
  showNav?: boolean;
  activeNav?: NavId;
  onNav?: (id: NavId) => void;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="app-page">
      <div className="phone-frame">
        <header className="shell-top">
          <div>
            {greeting ? <h1 className="greet">{greeting}</h1> : null}
            {subtitle ? <p className="greet-sub">{subtitle}</p> : null}
          </div>
          {headerAction}
        </header>
        <div className="scroll-area">{children}</div>
      </div>
    </div>
  );
}
