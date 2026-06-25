"use client";

import { useState } from "react";
import { css } from "@/lib/css";
import {
  CATEGORIES,
  machines,
  MachineIllo,
  type Machine,
  type MachineCategory,
  type MachineStatus,
} from "@/lib/machines";

const DATA = "#38E07B";
const ACTION = "#FF7A1A";
const MUTED = "#8A938F";

const statusMeta: Record<MachineStatus, { label: string; col: string; bg: string }> = {
  libre: { label: "Libre", col: DATA, bg: "rgba(56,224,123,.12)" },
  ocupada: { label: "Ocupada", col: ACTION, bg: "rgba(255,122,26,.12)" },
  mantenimiento: { label: "Mantenim.", col: MUTED, bg: "rgba(138,147,143,.14)" },
};

// Deterministic pseudo-random so the demo charts/history stay stable per machine.
function seeded(n: number) {
  let s = (n * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function weeklyBars(uses: number) {
  const rnd = seeded(uses + 7);
  const base = Math.max(1, Math.round(uses / 4));
  const vals = Array.from({ length: 8 }, () => Math.round(base * (0.55 + rnd() * 0.9)));
  const max = Math.max(...vals);
  return vals.map((v, i) => ({ h: Math.round((v / max) * 64) + 8, label: "S" + (i + 1), last: i === 7 }));
}

export type HistoryEntry = { when: string; val: string };

// Fallback sample history, used only when the host app doesn't provide a real
// machineId → log mapping (e.g. cardio machines with no logged sets).
function mockHistory(m: Machine): HistoryEntry[] {
  if (m.category === "cardio") {
    return [
      { when: "Hoy", val: "24 min · 312 kcal" },
      { when: "Hace 3 días", val: "22 min · 288 kcal" },
      { when: "Hace 6 días", val: "20 min · 265 kcal" },
    ];
  }
  const h = [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 20 + (h % 60);
  return [
    { when: "Hoy", val: base + 5 + " kg × 10" },
    { when: "Hace 3 días", val: base + " kg × 12" },
    { when: "Hace 6 días", val: base - 2.5 + " kg × 12" },
  ];
}

export function MachineInventory({
  onBack,
  historyFor,
}: {
  onBack?: () => void;
  historyFor?: (machineId: string) => HistoryEntry[];
}) {
  const [cat, setCat] = useState<MachineCategory | "all">("all");
  const [sel, setSel] = useState<Machine | null>(null);

  const list = machines.filter((m) => cat === "all" || m.category === cat);

  return (
    <>
      <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
        {onBack && (
          <button onClick={onBack} style={css("width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#12181A;color:#C6CFCB;font-size:18px;cursor:pointer;margin-bottom:10px")}>
            <i className="ph-bold ph-caret-left" />
          </button>
        )}
        <div style={css("font:700 30px 'Space Grotesk';color:#fff;letter-spacing:-.6px;margin-bottom:4px")}>Máquinas</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#6E7A76;margin-bottom:16px")}>{machines.length} en el gimnasio</div>

        <div className="cc-scroll" style={css("display:flex;gap:8px;overflow-x:auto;margin:0 -18px 18px;padding:2px 18px")}>
          {[{ key: "all", label: "Todas" }, ...CATEGORIES].map((t) => {
            const active = cat === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setCat(t.key as MachineCategory | "all")}
                style={{
                  ...css("flex:none;height:34px;padding:0 14px;border-radius:11px;font:600 12.5px 'IBM Plex Sans';cursor:pointer"),
                  background: active ? DATA : "#12181A",
                  color: active ? "#06140C" : "#9FA8A3",
                  border: `1px solid ${active ? DATA : "rgba(255,255,255,.06)"}`,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:10px")}>
          {list.map((m) => {
            const st = statusMeta[m.status];
            return (
              <div key={m.id} onClick={() => setSel(m)} style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:12px;cursor:pointer")}>
                <div style={css("height:84px;border-radius:12px;background:#0E1416;border:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;margin-bottom:10px")}>
                  <MachineIllo id={m.id} size={88} />
                </div>
                <div style={css("font:600 13.5px 'IBM Plex Sans';color:#fff;line-height:1.25")}>{m.name}</div>
                <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{m.muscle}</div>
                <div style={css("display:flex;align-items:center;justify-content:space-between;margin-top:9px")}>
                  <span style={{ ...css("display:inline-flex;align-items:center;gap:5px;font:600 10.5px 'IBM Plex Sans';padding:3px 8px;border-radius:7px"), color: st.col, background: st.bg }}>
                    <span style={{ ...css("width:5px;height:5px;border-radius:50%"), background: st.col }} />{st.label}
                  </span>
                  <span style={css("font:500 10px 'JetBrains Mono';color:#5E6A66")}>{m.uses30d}↑</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sel && <MachineSheet machine={sel} onClose={() => setSel(null)} historyFor={historyFor} />}
    </>
  );
}

function MachineSheet({
  machine,
  onClose,
  historyFor,
}: {
  machine: Machine;
  onClose: () => void;
  historyFor?: (machineId: string) => HistoryEntry[];
}) {
  const st = statusMeta[machine.status];
  const bars = weeklyBars(machine.uses30d);
  const provided = historyFor?.(machine.id);
  // Real machineId-linked entries when available; otherwise the sample log.
  const log = provided ?? mockHistory(machine);
  const real = provided != null;
  const catLabel = CATEGORIES.find((c) => c.key === machine.category)?.label ?? "";

  return (
    <>
      <div onClick={onClose} style={css("position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:50")} />
      <div className="cc-scroll" style={css("position:absolute;left:0;right:0;bottom:0;z-index:51;background:#0E1416;border-radius:28px 28px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:14px 18px 26px;max-height:88%;overflow-y:auto;animation:ccSlide .4s cubic-bezier(.2,.8,.2,1)")}>
        <div style={css("width:38px;height:4px;border-radius:3px;background:#2A3338;margin:0 auto 18px")} />

        <div style={css("display:flex;align-items:center;gap:14px;margin-bottom:16px")}>
          <div style={css("width:78px;height:78px;border-radius:18px;flex:none;background:#0A0F11;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center")}>
            <MachineIllo id={machine.id} size={70} />
          </div>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("font:700 20px 'Space Grotesk';color:#fff;letter-spacing:-.3px;line-height:1.15")}>{machine.name}</div>
            <div style={css("font:500 12.5px 'IBM Plex Sans';color:#6E7A76;margin-top:3px")}>{catLabel} · {machine.muscle}</div>
            <span style={{ ...css("display:inline-flex;align-items:center;gap:5px;font:600 11px 'IBM Plex Sans';padding:3px 9px;border-radius:8px;margin-top:8px"), color: st.col, background: st.bg }}>
              <span style={{ ...css("width:6px;height:6px;border-radius:50%"), background: st.col }} />{st.label}
            </span>
          </div>
        </div>

        <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:14px;margin-bottom:14px")}>
          <div style={css("display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px")}>
            <div>
              <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76")}>Uso (últimas 8 semanas)</div>
              <div style={css("font:700 22px 'Space Grotesk';color:#fff;margin-top:3px")}>{machine.uses30d} <span style={css("font-size:12px;color:#6E7A76")}>usos / 30d</span></div>
            </div>
            <i className="ph-fill ph-chart-bar" style={css("color:var(--data);font-size:20px")} />
          </div>
          <div style={css("display:flex;align-items:flex-end;gap:7px;height:76px")}>
            {bars.map((b, i) => (
              <div key={i} style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end")}>
                <div style={{ ...css("width:100%;border-radius:5px 5px 3px 3px"), background: b.last ? DATA : "rgba(56,224,123,.26)", height: `${b.h}px` }} />
                <span style={css("font:500 8.5px 'JetBrains Mono';color:#5E6A66")}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={css("font:600 11px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase;margin-bottom:9px")}>
          {real ? "Ejercicios en tu rutina" : "Tu historial"}
        </div>
        {log.length === 0 ? (
          <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:18px 14px;margin-bottom:18px;text-align:center;font:500 12.5px 'IBM Plex Sans';color:#6E7A76")}>
            Esta máquina aún no está en tu rutina actual.
          </div>
        ) : (
          <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;overflow:hidden;margin-bottom:18px")}>
            {log.map((h, i) => (
              <div key={i} style={{ ...css("display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px"), borderBottom: i < log.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                <span style={css("font:500 12.5px 'IBM Plex Sans';color:#9FA8A3;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{h.when}</span>
                <span style={css("font:700 13px 'JetBrains Mono';color:#fff;flex:none")}>{h.val}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={css("width:100%;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#171E21;color:#C6CFCB;font:600 14px 'IBM Plex Sans';cursor:pointer")}>Cerrar</button>
      </div>
    </>
  );
}
