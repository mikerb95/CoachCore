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

/** The iOS-style status bar at the top of every screen. */
export function StatusBar() {
  return (
    <div style={css("height:46px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 26px;font:600 14px 'Space Grotesk';color:#E6ECEA;z-index:30")}>
      <span>9:41</span>
      <span style={css("display:flex;gap:7px;font-size:15px;color:#cfd6d3")}>
        <Icon name="ph-fill ph-cell-signal-full" />
        <Icon name="ph-fill ph-wifi-high" />
        <Icon name="ph-fill ph-battery-high" />
      </span>
    </div>
  );
}

/** Notch + device bezel that frames every CoachCore screen. */
export function PhoneFrame({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div style={css("min-height:100vh;background:radial-gradient(120% 90% at 50% 0%,#0E1416 0%,#060809 60%);display:flex;align-items:center;justify-content:center;padding:28px;font-family:'IBM Plex Sans',system-ui,sans-serif")}>
      <div style={{ display: "contents", ...(accent ? cssVars(accent) : {}) }}>
        <div style={css("width:392px;max-width:100%;height:850px;max-height:calc(100vh - 24px);background:#0A0E0F;border-radius:46px;padding:11px;box-shadow:0 50px 120px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.05);position:relative")}>
          <div style={css("position:absolute;top:20px;left:50%;transform:translateX(-50%);width:120px;height:30px;background:#000;border-radius:18px;z-index:40")} />
          <div style={css("width:100%;height:100%;background:#0A0E0F;border-radius:36px;overflow:hidden;position:relative;display:flex;flex-direction:column")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function cssVars(accent: string): React.CSSProperties {
  return { ["--data" as string]: accent, ["--action" as string]: accent } as React.CSSProperties;
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
