"use client";

import { useEffect, useState, type ReactNode } from "react";
import { css } from "@/lib/css";

/**
 * `true` once the viewport is desktop-width. Returns `false` during SSR and the
 * first client render so hydration matches, then updates on mount / resize.
 */
export function useIsDesktop(query = "(min-width: 1024px)") {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return isDesktop;
}

/** Phosphor icon helper. `name` is e.g. "ph-fill ph-house". */
export function Icon({ name, style }: { name: string; style?: React.CSSProperties }) {
  return <i className={name} style={style} />;
}

/** Top spacer that respects the device safe area (notch). Collapses to a small
 *  gap on devices without a notch instead of drawing a fake status bar. */
export function StatusBar() {
  return <div style={{ height: "max(env(safe-area-inset-top, 0px), 14px)", flex: "none" }} />;
}

/**
 * Full-viewport mobile shell. Fills the screen edge to edge (no device bezel)
 * and keeps a fixed height so the inner scroll area scrolls while the bottom
 * nav stays pinned. Desktop uses {@link DesktopFrame} instead.
 */
export function PhoneFrame({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div
      style={{
        ...css("height:100dvh;width:100%;background:#0A0E0F;display:flex;flex-direction:column;overflow:hidden;position:relative;font-family:'IBM Plex Sans',system-ui,sans-serif"),
        ...(accent ? cssVars(accent) : {}),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Full-viewport shell for the auth & marketing screens (home, login, register,
 * password recovery, privacy). No device bezel; content is centred in a
 * comfortable column on wide screens and fills the width on phones.
 */
export function ScreenShell({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div
      style={{
        ...css("min-height:100dvh;width:100%;background:radial-gradient(120% 90% at 50% 0%,#0E1416 0%,#060809 60%);display:flex;flex-direction:column;align-items:center;font-family:'IBM Plex Sans',system-ui,sans-serif"),
        ...(accent ? cssVars(accent) : {}),
      }}
    >
      <div style={css("width:100%;max-width:440px;min-height:100dvh;display:flex;flex-direction:column")}>
        {children}
      </div>
    </div>
  );
}

function cssVars(accent: string): React.CSSProperties {
  return { ["--data" as string]: accent, ["--action" as string]: accent } as React.CSSProperties;
}

/** A single entry in the desktop sidebar. `accent` highlights the primary action. */
export type NavItem = { key: string; icon: string; label: string; accent?: boolean };

/** Sidebar nav that replaces BottomNav on desktop. */
function DesktopNav({ nav, current, onNavigate }: { nav: NavItem[]; current: string; onNavigate: (key: string) => void }) {
  return (
    <aside style={css("flex:none;width:248px;height:100vh;position:sticky;top:0;background:#0A0E0F;border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;padding:26px 16px;gap:4px;z-index:20")}>
      <div style={css("display:flex;align-items:center;gap:11px;padding:0 12px 26px")}>
        <div style={css("width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#1d2528,#11171a);display:flex;align-items:center;justify-content:center;font:700 14px 'Space Grotesk';color:var(--data);border:1px solid rgba(255,255,255,.07)")}>CC</div>
        <span style={css("font:700 17px 'Space Grotesk';color:#fff;letter-spacing:-.3px")}>CoachCore</span>
      </div>
      {nav.map((item) => {
        const active = item.key === current;
        const accentCol = item.accent ? "var(--action)" : "var(--data)";
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className="nav-item"
            style={{ ...css("display:flex;align-items:center;gap:13px;padding:11px 14px;border-radius:12px;border:none;cursor:pointer;width:100%;text-align:left;transition:background .15s ease"), background: active ? "rgba(255,255,255,.05)" : "transparent" }}
          >
            <i className={item.icon} style={{ fontSize: 20, color: active ? accentCol : "#54605A" }} />
            <span style={{ ...css("font:600 14px 'IBM Plex Sans'"), color: active ? "#E6ECEA" : "#8A938F" }}>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

/**
 * Desktop shell: a fixed sidebar (replacing BottomNav) plus a centred content
 * column capped at a comfortable width. Renders the exact same screen
 * components as PhoneFrame, so the mobile path is untouched.
 */
export function DesktopFrame({
  children, nav, current, onNavigate, accent,
}: {
  children: ReactNode;
  nav: NavItem[];
  current: string;
  onNavigate: (key: string) => void;
  accent?: string;
}) {
  return (
    <div style={{ ...css("min-height:100vh;background:radial-gradient(120% 90% at 50% 0%,#0E1416 0%,#060809 60%);display:flex;font-family:'IBM Plex Sans',system-ui,sans-serif"), ...(accent ? cssVars(accent) : {}) }}>
      <DesktopNav nav={nav} current={current} onNavigate={onNavigate} />
      <main className="cc-scroll" style={css("flex:1;height:100vh;overflow-y:auto;display:flex;justify-content:center;background:#0A0E0F;position:relative")}>
        <div style={css("width:100%;max-width:880px;padding:0 32px")}>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Success toast that slides in below the status bar. */
export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={css("position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:60;background:#1B2225;border:1px solid rgba(56,224,123,.4);color:#E6ECEA;padding:10px 16px;border-radius:12px;font:500 13px 'IBM Plex Sans';display:flex;align-items:center;gap:8px;box-shadow:0 16px 40px rgba(0,0,0,.5);animation:ccToast .3s ease;white-space:nowrap")}>
      <Icon name="ph-fill ph-check-circle" style={css("color:var(--data);font-size:17px")} />
      {msg}
    </div>
  );
}
