"use client";

import { useEffect, useRef, useState } from "react";
import { css } from "@/lib/css";
import { PhoneFrame, DesktopFrame, StatusBar, Toast, useIsDesktop, type NavItem } from "@/components/Frame";
import { AccountActions } from "@/components/AccountActions";
import { MachineInventory } from "@/components/Machines";
import { saveCheckin as saveCheckinDB, sendMyMessage } from "@/app/actions/data";

const DATA = "#38E07B";
const ACTION = "#FF7A1A";
const U = "kg";

type Screen = "home" | "log" | "machines" | "progress" | "coach" | "celebrate";

const CLIENT_NAV: NavItem[] = [
  { key: "home", icon: "ph-fill ph-house", label: "Hoy" },
  { key: "machines", icon: "ph-fill ph-squares-four", label: "Máquinas" },
  { key: "log", icon: "ph-fill ph-barbell", label: "Entrenar" },
  { key: "progress", icon: "ph-fill ph-chart-line-up", label: "Progreso" },
  { key: "coach", icon: "ph-fill ph-chat-circle", label: "Coach" },
];
type Msg = { from: "me" | "coach"; text: string; time: string };
type SetEntry = { w?: number; r?: number; done?: boolean };

type Exercise = { name: string; meta: string; count: number; w: number; r: number; prev: string; machineId?: string };

const exercises: Exercise[] = [
  { name: "Sentadilla trasera", meta: "5 × 5  ·  82.5% RM  ·  desc. 180s", count: 5, w: 102.5, r: 5, prev: "100" + U + " × 5", machineId: "power-rack" },
  { name: "Press de banca", meta: "5 × 5  ·  80% RM  ·  desc. 180s", count: 5, w: 92.5, r: 5, prev: "90" + U + " × 5", machineId: "bench-flat" },
  { name: "Remo con barra", meta: "4 × 8  ·  RPE 8  ·  desc. 120s", count: 4, w: 72.5, r: 8, prev: "70" + U + " × 8" },
  { name: "Press militar", meta: "3 × 10  ·  RPE 8  ·  desc. 90s", count: 3, w: 47.5, r: 10, prev: "45" + U + " × 10", machineId: "shoulder-press" },
  { name: "Zancadas mancuerna", meta: "3 × 12  ·  RPE 8  ·  desc. 90s", count: 3, w: 24, r: 12, prev: "22" + U + " × 12" },
  { name: "Curl femoral", meta: "3 × 12  ·  RPE 8  ·  desc. 75s", count: 3, w: 42.5, r: 12, prev: "40" + U + " × 12", machineId: "leg-curl" },
  { name: "Plancha", meta: "3 × 45s  ·  RPE 7  ·  desc. 60s", count: 3, w: 0, r: 45, prev: "40s" },
];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const seed = (): Msg[] => [
  { from: "coach", text: "¡Buen trabajo ayer! La técnica de peso muerto mejoró un montón 👏", time: "8:02" },
  { from: "me", text: "Gracias! La última serie la sentí pesada", time: "8:15" },
  { from: "coach", text: "Normal, subimos carga. Hoy cuida la lumbar y avísame cómo va la sentadilla.", time: "8:16" },
];

export default function ClientApp({ user }: { user: { name: string; email: string } }) {
  const isDesktop = useIsDesktop();
  const [screen, setScreen] = useState<Screen>("home");
  const [weight, setWeight] = useState(78.4);
  const [sleep, setSleep] = useState(7.5);
  const [energy, setEnergy] = useState(4);
  const [soreness, setSoreness] = useState(1);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [ex, setEx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry>>({});
  const [rpe, setRpe] = useState<Record<number, number>>({});
  const [rest, setRest] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingCheckin = useRef(false);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  const saveCheckin = async () => {
    if (savingCheckin.current) return; // evita doble envío mientras está en vuelo
    savingCheckin.current = true;
    try {
      await saveCheckinDB({ weightKg: weight, sleepHours: sleep, energy, soreness });
      setCheckinSaved(true);
      showToast("Check-in enviado a Juan Camilo");
    } catch {
      // Datos de salud: nunca damos por guardado algo que falló.
      showToast("No se pudo enviar el check-in. Revisa tu conexión e inténtalo.");
    } finally {
      savingCheckin.current = false;
    }
  };
  const setSet = (key: string, field: keyof SetEntry, val: number | boolean) =>
    setSets((s) => ({ ...s, [key]: { ...(s[key] || {}), [field]: val } }));
  const toggleRest = () => {
    if (restActive) {
      if (timer.current) clearInterval(timer.current);
      setRestActive(false); setRest(0);
      return;
    }
    setRestActive(true); setRest(120);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setRest((r) => {
        if (r <= 1) { if (timer.current) clearInterval(timer.current); setRestActive(false); return 0; }
        return r - 1;
      });
    }, 1000);
  };
  const send = () => {
    const d = draft.trim();
    if (!d) return;
    const now = new Date();
    const t = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    setMessages((m) => [...(m || seed()), { from: "me", text: d, time: t }]);
    setDraft("");
    void sendMyMessage(d).catch(() => {
      showToast("No se pudo enviar el mensaje. Inténtalo de nuevo.");
    });
  };

  // Real per-machine history: the exercises in this client's routine that use
  // the machine, showing what was actually logged this session (or the target).
  const machineHistory = (machineId: string) => {
    const out: { when: string; val: string }[] = [];
    exercises.forEach((e, idx) => {
      if (e.machineId !== machineId) return;
      const done: SetEntry[] = [];
      for (let i = 1; i <= e.count; i++) {
        const s = sets[idx + "-" + i];
        if (s && s.done) done.push(s);
      }
      if (done.length) {
        const last = done[done.length - 1];
        const w = last.w != null ? last.w : e.w;
        const r = last.r != null ? last.r : e.r;
        out.push({ when: e.name, val: `${w}${U} × ${r} · ${done.length}/${e.count} series` });
      } else {
        out.push({ when: e.name, val: `${e.w}${U} × ${e.r} · objetivo` });
      }
      out.push({ when: "↳ Sesión anterior", val: e.prev });
    });
    return out;
  };

  const screens = (
    <>
      {screen === "home" && (
          <Home
            user={user}
            weight={weight} sleep={sleep} energy={energy} soreness={soreness} saved={checkinSaved}
            onStart={() => setScreen("log")}
            wInc={() => { setWeight((w) => Math.round((w + 0.1) * 10) / 10); setCheckinSaved(false); }}
            wDec={() => { setWeight((w) => Math.round((w - 0.1) * 10) / 10); setCheckinSaved(false); }}
            sInc={() => { setSleep((s) => Math.round((s + 0.5) * 10) / 10); setCheckinSaved(false); }}
            sDec={() => { setSleep((s) => Math.max(0, Math.round((s - 0.5) * 10) / 10)); setCheckinSaved(false); }}
            setEnergy={(v) => { setEnergy(v); setCheckinSaved(false); }}
            setSoreness={(v) => { setSoreness(v); setCheckinSaved(false); }}
            save={saveCheckin}
          />
        )}
        {screen === "log" && (
          <Log
            ex={ex} sets={sets} rpe={rpe} restActive={restActive} rest={rest}
            setSet={setSet} setRpe={setRpe} toggleRest={toggleRest}
            prevEx={() => setEx((e) => Math.max(0, e - 1))}
            nextEx={() => setEx((e) => { if (e >= exercises.length - 1) { setScreen("celebrate"); return e; } return e + 1; })}
          />
        )}
        {screen === "machines" && <MachineInventory historyFor={machineHistory} />}
        {screen === "progress" && <Progress />}
        {screen === "coach" && (
          <Coach messages={messages || seed()} draft={draft} setDraft={setDraft} send={send} />
        )}
        {screen === "celebrate" && (
          <Celebrate
            onShare={() => { showToast("Resumen enviado a Camilo"); setScreen("coach"); }}
            onHome={() => setScreen("home")}
          />
        )}
    </>
  );

  if (isDesktop) {
    return (
      <DesktopFrame nav={CLIENT_NAV} current={screen} onNavigate={(k) => setScreen(k as Screen)}>
        <Toast msg={toast} />
        <div style={css("padding:24px 0 80px")}>{screens}</div>
      </DesktopFrame>
    );
  }

  return (
    <PhoneFrame>
      <StatusBar />
      <Toast msg={toast} />

      <div className="cc-scroll" style={css("flex:1;overflow-y:auto;position:relative;background:#0A0E0F")}>
        {screens}
      </div>

      {screen !== "celebrate" && <BottomNav screen={screen} go={setScreen} />}
    </PhoneFrame>
  );
}

/* ============================ HOME / CHECK-IN ============================ */
function Home({
  user, weight, sleep, energy, soreness, saved, onStart, wInc, wDec, sInc, sDec, setEnergy, setSoreness, save,
}: {
  user: { name: string; email: string };
  weight: number; sleep: number; energy: number; soreness: number; saved: boolean;
  onStart: () => void;
  wInc: () => void; wDec: () => void; sInc: () => void; sDec: () => void;
  setEnergy: (v: number) => void; setSoreness: (v: number) => void; save: () => void;
}) {
  const energyDefs = [
    "ph-fill ph-smiley-x-eyes", "ph-fill ph-smiley-sad", "ph-fill ph-smiley-meh", "ph-fill ph-smiley", "ph-fill ph-smiley-wink",
  ];
  const soreDefs = ["Ninguna", "Leve", "Media", "Alta"];

  return (
    <div style={css("padding:6px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("background:linear-gradient(135deg,#16271D 0%,#10191400 70%);border:1px solid rgba(56,224,123,.16);border-radius:22px;padding:18px;margin-bottom:16px")}>
        <div style={css("display:flex;justify-content:space-between;align-items:flex-start")}>
          <div>
            <div style={css("font:500 12px 'IBM Plex Sans';color:#7FA890;text-transform:uppercase;letter-spacing:.4px")}>Martes, 24 jun</div>
            <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin-top:3px")}>¡Buenas, Andrés!</div>
            <div style={css("font:500 13.5px 'IBM Plex Sans';color:#9FB0A8;margin-top:3px")}>Hoy toca pierna. Vamos a por ese PR.</div>
          </div>
          <div style={css("width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#1f3d2a,#16291d);display:flex;align-items:center;justify-content:center;font:700 15px 'Space Grotesk';color:var(--data);border:1px solid rgba(255,255,255,.08)")}>MV</div>
        </div>
        <div style={css("display:flex;gap:8px;margin-top:14px")}>
          <div style={css("display:flex;align-items:center;gap:6px;background:rgba(255,122,26,.14);border:1px solid rgba(255,122,26,.25);padding:6px 11px;border-radius:11px")}>
            <i className="ph-fill ph-fire" style={css("color:var(--action);font-size:16px")} />
            <span style={css("font:700 13px 'Space Grotesk';color:#fff")}>12</span>
            <span style={css("font:500 12px 'IBM Plex Sans';color:#C9B3A4")}>días de racha</span>
          </div>
          <div style={css("display:flex;align-items:center;gap:6px;background:rgba(56,224,123,.12);border:1px solid rgba(56,224,123,.22);padding:6px 11px;border-radius:11px")}>
            <i className="ph-fill ph-check-circle" style={css("color:var(--data);font-size:16px")} />
            <span style={css("font:500 12px 'IBM Plex Sans';color:#9FB0A8")}>94% adherencia</span>
          </div>
        </div>
      </div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:16px;margin-bottom:14px")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:4px")}>
          <span style={css("font:600 11px 'JetBrains Mono';color:var(--data);letter-spacing:.5px")}>TU ENTRENO DE HOY</span>
          <span style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76")}>Asignado por Camilo</span>
        </div>
        <div style={css("font:700 21px 'Space Grotesk';color:#fff;letter-spacing:-.3px")}>Fuerza · Día A</div>
        <div style={css("display:flex;gap:14px;margin:11px 0 15px;font:500 12.5px 'IBM Plex Sans';color:#8A938F")}>
          <span style={css("display:flex;align-items:center;gap:5px")}><i className="ph ph-barbell" />7 ejercicios</span>
          <span style={css("display:flex;align-items:center;gap:5px")}><i className="ph ph-clock" />~62 min</span>
          <span style={css("display:flex;align-items:center;gap:5px")}><i className="ph ph-stack" />3 bloques</span>
        </div>
        <button onClick={onStart} style={css("width:100%;height:52px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer")}>
          <i className="ph-fill ph-play" />Empezar entreno
        </button>
      </div>

      <div style={css("background:#171116;border:1px solid rgba(255,122,26,.18);border-radius:16px;padding:14px;margin-bottom:14px;display:flex;gap:11px")}>
        <i className="ph-fill ph-chat-teardrop-text" style={css("color:var(--action);font-size:20px;flex:none")} />
        <div>
          <div style={css("font:600 12px 'IBM Plex Sans';color:#E6ECEA;margin-bottom:3px")}>Nota de Camilo</div>
          <div style={css("font:500 13px 'IBM Plex Sans';color:#C9B3A4;line-height:1.5")}>&quot;Cuida la postura lumbar hoy. Si la 1ª serie de sentadilla sale fácil, sube 2.5 kg.&quot;</div>
        </div>
      </div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:16px;margin-bottom:14px")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px")}>
          <span style={css("font:600 15px 'Space Grotesk';color:#E6ECEA;display:flex;align-items:center;gap:7px")}>
            <i className="ph-fill ph-clipboard-text" style={css("color:var(--data)")} />Check-in de hoy
          </span>
          {saved && (
            <span style={css("font:600 11px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:4px")}>
              <i className="ph-fill ph-check-circle" />Enviado
            </span>
          )}
        </div>

        <Stepper icon="ph ph-scales" label="Peso corporal" value={weight.toFixed(1) + " " + U} onDec={wDec} onInc={wInc} border />
        <Stepper icon="ph ph-moon" label="Sueño" value={sleep.toFixed(1) + " h"} onDec={sDec} onInc={sInc} border />

        <div style={css("padding:13px 0 6px")}>
          <span style={css("font:500 13.5px 'IBM Plex Sans';color:#C6CFCB;display:flex;align-items:center;gap:8px;margin-bottom:10px")}>
            <i className="ph ph-lightning" style={css("color:#6E7A76;font-size:17px")} />¿Cómo te sientes?
          </span>
          <div style={css("display:flex;gap:8px")}>
            {energyDefs.map((icon, i) => {
              const sel = energy === i + 1;
              return (
                <button key={i} onClick={() => setEnergy(i + 1)} style={{ ...css("flex:1;height:46px;border-radius:12px;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center"), background: sel ? "rgba(56,224,123,.14)" : "#0A0F11", border: `1px solid ${sel ? DATA : "rgba(255,255,255,.08)"}`, color: sel ? DATA : "#5E6A66" }}>
                  <i className={icon} />
                </button>
              );
            })}
          </div>
        </div>

        <div style={css("padding:13px 0 4px")}>
          <span style={css("font:500 13.5px 'IBM Plex Sans';color:#C6CFCB;display:flex;align-items:center;gap:8px;margin-bottom:10px")}>
            <i className="ph ph-bandaids" style={css("color:#6E7A76;font-size:17px")} />Molestias / dolor
          </span>
          <div style={css("display:flex;gap:8px")}>
            {soreDefs.map((label, i) => {
              const sel = soreness === i;
              const c = i >= 2 ? ACTION : DATA;
              return (
                <button key={i} onClick={() => setSoreness(i)} style={{ ...css("flex:1;height:40px;border-radius:11px;font:600 12.5px 'IBM Plex Sans';cursor:pointer"), background: sel ? (i >= 2 ? "rgba(255,122,26,.14)" : "rgba(56,224,123,.12)") : "#0A0F11", border: `1px solid ${sel ? c : "rgba(255,255,255,.08)"}`, color: sel ? c : "#7C8783" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={save} style={{ ...css("width:100%;height:46px;margin-top:14px;border:none;border-radius:13px;font:700 14px 'IBM Plex Sans';cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px"), background: saved ? "#171E21" : DATA, color: saved ? "#8A938F" : "#06140C" }}>
          <i className={saved ? "ph-fill ph-check-circle" : "ph-fill ph-paper-plane-right"} />
          {saved ? "Check-in enviado" : "Enviar check-in"}
        </button>
      </div>

      <AccountActions name={user.name} email={user.email} />
    </div>
  );
}

function Stepper({ icon, label, value, onDec, onInc, border }: { icon: string; label: string; value: string; onDec: () => void; onInc: () => void; border?: boolean }) {
  return (
    <div style={{ ...css("display:flex;align-items:center;justify-content:space-between;padding:10px 0"), ...(border ? css("border-bottom:1px solid rgba(255,255,255,.05)") : {}) }}>
      <span style={css("font:500 13.5px 'IBM Plex Sans';color:#C6CFCB;display:flex;align-items:center;gap:8px")}>
        <i className={icon} style={css("color:#6E7A76;font-size:17px")} />{label}
      </span>
      <div style={css("display:flex;align-items:center;gap:12px")}>
        <button onClick={onDec} aria-label={`Disminuir ${label}`} style={css("width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:#0A0F11;color:#C6CFCB;font-size:15px;cursor:pointer")}><i className="ph-bold ph-minus" aria-hidden="true" /></button>
        <span style={css("font:700 16px 'Space Grotesk';color:#fff;min-width:64px;text-align:center")}>{value}</span>
        <button onClick={onInc} aria-label={`Aumentar ${label}`} style={css("width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:#0A0F11;color:#C6CFCB;font-size:15px;cursor:pointer")}><i className="ph-bold ph-plus" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

/* ============================ WORKOUT LOG ============================ */
function Log({
  ex, sets, rpe, restActive, rest, setSet, setRpe, toggleRest, prevEx, nextEx,
}: {
  ex: number; sets: Record<string, SetEntry>; rpe: Record<number, number>;
  restActive: boolean; rest: number;
  setSet: (key: string, field: keyof SetEntry, val: number | boolean) => void;
  setRpe: (fn: (r: Record<number, number>) => Record<number, number>) => void;
  toggleRest: () => void; prevEx: () => void; nextEx: () => void;
}) {
  const exIdx = Math.min(ex, exercises.length - 1);
  const e = exercises[exIdx];
  const getSet = (i: number) => {
    const k = exIdx + "-" + i;
    const st = sets[k] || {};
    return { w: st.w != null ? st.w : e.w, r: st.r != null ? st.r : e.r, done: !!st.done, k };
  };

  let doneCount = 0, totalSets = 0;
  exercises.forEach((ee, ei) => {
    for (let i = 1; i <= ee.count; i++) {
      totalSets++;
      const k = ei + "-" + i;
      if (sets[k] && sets[k].done) doneCount++;
    }
  });
  const donePct = Math.round((doneCount / totalSets) * 100);

  const rpeSel = rpe[exIdx];
  const rpeMap: Record<number, string> = { 6: "Fácil, quedaban 4+ reps", 7: "Quedaban 3 reps", 8: "Quedaban 2 reps", 9: "Quedaba 1 rep", 10: "Al fallo, máximo esfuerzo" };
  const rpeHint = rpeSel ? rpeMap[rpeSel] : "Toca tu nivel de esfuerzo";

  return (
    <div style={css("padding:6px 18px 110px;animation:ccPop .3s ease")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:10px")}>
        <div>
          <div style={css("font:600 11px 'JetBrains Mono';color:var(--data);letter-spacing:.5px")}>FUERZA · DÍA A</div>
          <div style={css("font:700 19px 'Space Grotesk';color:#fff;margin-top:2px")}>En progreso</div>
        </div>
        <div style={css("text-align:right")}>
          <div style={css("font:700 20px 'Space Grotesk';color:#fff")}>{donePct}%</div>
          <div style={css("font:500 10.5px 'IBM Plex Sans';color:#6E7A76")}>{doneCount}/{totalSets} series</div>
        </div>
      </div>
      <div style={css("height:8px;border-radius:5px;background:#1A2226;overflow:hidden;margin-bottom:18px")}>
        <div style={{ ...css("height:100%;border-radius:5px;background:linear-gradient(90deg,var(--data),var(--action));transition:width .4s ease"), width: `${donePct}%` }} />
      </div>

      <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:6px")}>
        <span style={css("font:600 11px 'JetBrains Mono';color:#8A938F")}>EJERCICIO {exIdx + 1} DE 7</span>
        <div style={css("display:flex;gap:7px")}>
          <button onClick={prevEx} style={css("width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12181A;color:#C6CFCB;cursor:pointer;font-size:14px")}><i className="ph-bold ph-caret-left" /></button>
          <button onClick={nextEx} style={css("width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12181A;color:#C6CFCB;cursor:pointer;font-size:14px")}><i className="ph-bold ph-caret-right" /></button>
        </div>
      </div>
      <div style={css("font:700 24px 'Space Grotesk';color:#fff;letter-spacing:-.4px")}>{e.name}</div>
      <div style={css("font:600 12.5px 'JetBrains Mono';color:#8A938F;margin-top:5px")}>{e.meta}</div>

      <div style={css("margin-top:16px;display:flex;flex-direction:column;gap:9px")}>
        <div style={css("display:grid;grid-template-columns:30px 1fr 1fr 40px;gap:8px;padding:0 4px;font:600 10px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase")}>
          <span>Set</span><span style={css("text-align:center")}>Peso</span><span style={css("text-align:center")}>Reps</span><span />
        </div>
        {Array.from({ length: e.count }, (_, idx) => {
          const i = idx + 1;
          const s = getSet(i);
          return (
            <div key={i} style={{ ...css("border-radius:14px;padding:9px 8px"), background: s.done ? "rgba(56,224,123,.06)" : "#10171A", border: `1px solid ${s.done ? "rgba(56,224,123,.28)" : "rgba(255,255,255,.06)"}` }}>
              <div style={css("display:grid;grid-template-columns:30px 1fr 1fr 40px;gap:8px;align-items:center")}>
                <span style={css("font:700 15px 'Space Grotesk';color:#fff;text-align:center")}>{i}</span>
                <div style={css("display:flex;align-items:center;justify-content:center;gap:7px")}>
                  <button onClick={() => setSet(s.k, "w", Math.max(0, Math.round((s.w - 2.5) * 10) / 10))} aria-label={`Serie ${i}: bajar peso`} style={miniBtn}><i className="ph-bold ph-minus" aria-hidden="true" /></button>
                  <span style={css("font:700 14px 'Space Grotesk';color:#fff;min-width:48px;text-align:center")}>{e.w === 0 ? s.r + "s" : s.w + U}</span>
                  <button onClick={() => setSet(s.k, "w", Math.round((s.w + 2.5) * 10) / 10)} aria-label={`Serie ${i}: subir peso`} style={miniBtn}><i className="ph-bold ph-plus" aria-hidden="true" /></button>
                </div>
                <div style={css("display:flex;align-items:center;justify-content:center;gap:7px")}>
                  <button onClick={() => setSet(s.k, "r", Math.max(0, s.r - 1))} aria-label={`Serie ${i}: bajar repeticiones`} style={miniBtn}><i className="ph-bold ph-minus" aria-hidden="true" /></button>
                  <span style={css("font:700 14px 'Space Grotesk';color:#fff;min-width:24px;text-align:center")}>{e.w === 0 ? "—" : s.r}</span>
                  <button onClick={() => setSet(s.k, "r", s.r + 1)} aria-label={`Serie ${i}: subir repeticiones`} style={miniBtn}><i className="ph-bold ph-plus" aria-hidden="true" /></button>
                </div>
                <button onClick={() => setSet(s.k, "done", !s.done)} aria-label={`Serie ${i}: ${s.done ? "marcada como hecha" : "marcar como hecha"}`} aria-pressed={s.done} style={{ ...css("justify-self:center;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer"), background: s.done ? DATA : "#0A0F11", border: `1px solid ${s.done ? DATA : "rgba(255,255,255,.1)"}` }}>
                  <i className={s.done ? "ph-bold ph-check" : "ph ph-circle"} style={{ fontSize: 16, color: s.done ? "#06140C" : "#3A443F" }} aria-hidden="true" />
                </button>
              </div>
              <div style={css("font:500 11px 'JetBrains Mono';color:#5E6A66;margin-top:6px;padding-left:38px")}>Anterior: {e.prev}</div>
            </div>
          );
        })}
      </div>

      <div style={css("margin-top:16px;background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px")}>
        <div style={css("font:600 13px 'IBM Plex Sans';color:#E6ECEA;margin-bottom:4px")}>¿Cuánto te costó? <span style={css("color:#6E7A76;font-weight:500")}>(RPE)</span></div>
        <div style={css("font:500 11.5px 'IBM Plex Sans';color:#6E7A76;margin-bottom:11px")}>{rpeHint}</div>
        <div style={css("display:flex;gap:7px")}>
          {[6, 7, 8, 9, 10].map((v) => {
            const sel = rpeSel === v;
            return (
              <button key={v} onClick={() => setRpe((r) => ({ ...r, [exIdx]: v }))} style={{ ...css("flex:1;height:42px;border-radius:11px;font:700 15px 'Space Grotesk';cursor:pointer"), background: sel ? "rgba(255,122,26,.16)" : "#0A0F11", border: `1px solid ${sel ? ACTION : "rgba(255,255,255,.08)"}`, color: sel ? ACTION : "#9FA8A3" }}>
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div style={css("display:flex;gap:11px;margin-top:16px")}>
        <button onClick={toggleRest} style={{ ...css("flex:1;height:54px;border:none;border-radius:15px;font:700 15px 'Space Grotesk';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer"), background: restActive ? ACTION : "#171E21", color: restActive ? "#1a0c00" : "#E6ECEA" }}>
          <i className={restActive ? "ph-fill ph-pause" : "ph-fill ph-timer"} style={css("font-size:19px")} />
          {restActive ? "Descanso · " + fmt(rest) : "Descanso"}
        </button>
        <button onClick={nextEx} style={css("flex:none;width:54px;height:54px;border-radius:15px;border:none;background:var(--data);color:#06140C;font-size:21px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
          <i className="ph-bold ph-arrow-right" />
        </button>
      </div>
    </div>
  );
}

const miniBtn = css("width:26px;height:26px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#0A0F11;color:#9FA8A3;cursor:pointer;font-size:12px");

/* ============================ PROGRESS ============================ */
function Progress() {
  const badges = [
    { icon: "ph-fill ph-trophy", value: "140 kg", label: "PR Sentadilla", bg: "rgba(255,122,26,.1)", border: "rgba(255,122,26,.25)", col: ACTION },
    { icon: "ph-fill ph-fire", value: "12 días", label: "Racha actual", bg: "rgba(56,224,123,.1)", border: "rgba(56,224,123,.25)", col: DATA },
    { icon: "ph-fill ph-trend-up", value: "+9.4%", label: "Tonelaje (mes)", bg: "#12181A", border: "rgba(255,255,255,.06)", col: DATA },
    { icon: "ph-fill ph-barbell", value: "142", label: "Entrenos", bg: "#12181A", border: "rgba(255,255,255,.06)", col: "#5AA9FF" },
  ];

  const rmVals = [120, 125, 127.5, 130, 135, 140];
  const rmMin = 115, rmMax = 145, W = 300, H = 110, PAD = 6;
  const pts = rmVals.map((v, i) => ({
    x: Math.round((i / (rmVals.length - 1)) * (W - PAD * 2) + PAD),
    y: Math.round(H - ((v - rmMin) / (rmMax - rmMin)) * (H - PAD * 2) - PAD),
  }));
  const linePoints = pts.map((p) => p.x + "," + p.y).join(" ");
  const areaPoints = pts[0].x + "," + H + " " + linePoints + " " + pts[pts.length - 1].x + "," + H;

  const wVals = [82, 81.3, 80.6, 80.1, 79.5, 79.0, 78.7, 78.4];
  const wMin = 77, wMax = 82.5;
  const weightBars = wVals.map((v, i) => ({ h: Math.round(((v - wMin) / (wMax - wMin)) * 70) + 8, label: "S" + (i + 1), fill: i === wVals.length - 1 ? DATA : "rgba(56,224,123,.26)" }));

  const measures = [
    { label: "Cintura", value: "82 cm", delta: "1.5", arrow: "ph-bold ph-arrow-down" },
    { label: "Brazo", value: "38 cm", delta: "1.2", arrow: "ph-bold ph-arrow-up" },
    { label: "% Grasa", value: "14.2 %", delta: "0.8", arrow: "ph-bold ph-arrow-down" },
    { label: "Pecho", value: "104 cm", delta: "2.0", arrow: "ph-bold ph-arrow-up" },
  ];

  return (
    <div style={css("padding:6px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("font:700 28px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin-bottom:4px")}>Tu progreso</div>
      <div style={css("font:500 13px 'IBM Plex Sans';color:#8A938F;margin-bottom:16px")}>Vas mejor que el 80% de tus semanas. ¡Sigue así!</div>

      <div className="cc-scroll" style={css("display:flex;gap:10px;overflow-x:auto;margin:0 -18px 18px;padding:2px 18px")}>
        {badges.map((b, i) => (
          <div key={i} style={{ ...css("flex:none;width:130px;border-radius:16px;padding:13px"), background: b.bg, border: `1px solid ${b.border}` }}>
            <i className={b.icon} style={{ fontSize: 22, color: b.col }} />
            <div style={css("font:700 16px 'Space Grotesk';color:#fff;margin-top:9px")}>{b.value}</div>
            <div style={css("font:500 11px 'IBM Plex Sans';color:#8A938F;margin-top:1px")}>{b.label}</div>
          </div>
        ))}
      </div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:16px;margin-bottom:14px")}>
        <div style={css("display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px")}>
          <div>
            <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76")}>Sentadilla · 1RM estimado</div>
            <div style={css("font:700 24px 'Space Grotesk';color:#fff;margin-top:3px")}>140 <span style={css("font-size:14px;color:#6E7A76")}>kg</span></div>
          </div>
          <span style={css("font:600 12px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:3px")}><i className="ph-bold ph-trend-up" />+20 kg</span>
        </div>
        <svg viewBox="0 0 300 120" style={css("width:100%;height:120px;overflow:visible")}>
          <defs>
            <linearGradient id="ccG2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--data)" stopOpacity=".3" />
              <stop offset="1" stopColor="var(--data)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={areaPoints} fill="url(#ccG2)" stroke="none" />
          <polyline points={linePoints} fill="none" stroke="var(--data)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((dt, i) => (
            <circle key={i} cx={dt.x} cy={dt.y} r="3.5" fill="#0A0E0F" stroke="var(--data)" strokeWidth="2" />
          ))}
        </svg>
        <div style={css("display:flex;justify-content:space-between;margin-top:8px;font:500 9.5px 'JetBrains Mono';color:#5E6A66")}>
          <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
        </div>
      </div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:16px;margin-bottom:14px")}>
        <div style={css("display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px")}>
          <div>
            <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76")}>Peso corporal</div>
            <div style={css("font:700 24px 'Space Grotesk';color:#fff;margin-top:3px")}>78.4 <span style={css("font-size:14px;color:#6E7A76")}>kg</span></div>
          </div>
          <span style={css("font:600 12px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:3px")}><i className="ph-bold ph-trend-down" />-3.6 kg</span>
        </div>
        <div style={css("display:flex;align-items:flex-end;gap:8px;height:84px")}>
          {weightBars.map((w, i) => (
            <div key={i} style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end")}>
              <div style={{ ...css("width:100%;border-radius:5px 5px 3px 3px"), background: w.fill, height: `${w.h}px` }} />
              <span style={css("font:500 9px 'JetBrains Mono';color:#5E6A66")}>{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={css("font:600 14px 'Space Grotesk';color:#E6ECEA;margin:4px 0 11px")}>Medidas</div>
      <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:10px")}>
        {measures.map((m, i) => (
          <div key={i} style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:13px")}>
            <div style={css("font:500 11.5px 'IBM Plex Sans';color:#6E7A76")}>{m.label}</div>
            <div style={css("display:flex;align-items:baseline;gap:7px;margin-top:6px")}>
              <span style={css("font:700 21px 'Space Grotesk';color:#fff")}>{m.value}</span>
              <span style={css("font:600 11px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:2px")}><i className={m.arrow} style={css("font-size:11px")} />{m.delta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ COACH CHAT ============================ */
function Coach({ messages, draft, setDraft, send }: { messages: Msg[]; draft: string; setDraft: (v: string) => void; send: () => void }) {
  return (
    <div style={css("display:flex;flex-direction:column;height:100%;animation:ccUp .4s ease")}>
      <div style={css("padding:6px 18px 14px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:12px;flex:none")}>
        <div style={css("width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#23303d,#19232d);display:flex;align-items:center;justify-content:center;font:700 15px 'Space Grotesk';color:#5AA9FF")}>CL</div>
        <div style={css("flex:1")}>
          <div style={css("font:700 16px 'Space Grotesk';color:#fff")}>Camilo Llano</div>
          <div style={css("font:500 11.5px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:5px")}>
            <span style={css("width:6px;height:6px;border-radius:50%;background:var(--data)")} />Tu entrenador · en línea
          </div>
        </div>
        <i className="ph ph-phone" style={css("color:#8A938F;font-size:20px")} />
      </div>

      <div className="cc-scroll" style={css("flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px")}>
        <div style={css("text-align:center;font:500 11px 'IBM Plex Sans';color:#5E6A66;margin-bottom:4px")}>Hoy</div>
        {messages.map((m, i) => {
          const me = m.from === "me";
          return (
            <div key={i} style={{ ...css("max-width:78%;padding:10px 13px"), alignSelf: me ? "flex-end" : "flex-start", background: me ? DATA : "#161D20", border: `1px solid ${me ? DATA : "rgba(255,255,255,.07)"}`, borderRadius: me ? "16px 16px 5px 16px" : "16px 16px 16px 5px" }}>
              <div style={{ ...css("font:500 13.5px 'IBM Plex Sans';line-height:1.45"), color: me ? "#06140C" : "#E6ECEA" }}>{m.text}</div>
              <div style={{ ...css("font:500 9.5px 'JetBrains Mono';margin-top:5px;text-align:right"), color: me ? "rgba(6,20,12,.55)" : "#6E7A76" }}>{m.time}</div>
            </div>
          );
        })}
      </div>

      <div style={css("flex:none;padding:12px 18px 16px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:9px")}>
        <div style={css("flex:1;display:flex;align-items:center;gap:9px;background:#12181A;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:0 13px;height:46px")}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Escribe a Camilo…"
            style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 13.5px 'IBM Plex Sans'")}
          />
        </div>
        <button onClick={send} aria-label="Enviar mensaje" style={css("width:46px;height:46px;border-radius:13px;border:none;background:var(--data);color:#06140C;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
          <i className="ph-fill ph-paper-plane-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ============================ CELEBRATE ============================ */
function Celebrate({ onShare, onHome }: { onShare: () => void; onHome: () => void }) {
  const prs = [
    { name: "Sentadilla trasera", detail: "102.5 kg × 5 · antes 100 kg", gain: "+2.5 kg" },
    { name: "Press de banca", detail: "92.5 kg × 5 · antes 90 kg", gain: "+2.5 kg" },
  ];
  return (
    <div style={css("min-height:100%;padding:30px 22px 28px;display:flex;flex-direction:column;text-align:center;animation:ccPop .4s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("flex:none;display:flex;flex-direction:column;align-items:center;margin-top:14px")}>
        <div style={css("width:96px;height:96px;border-radius:30px;background:radial-gradient(circle at 50% 35%,rgba(56,224,123,.22),#12181A);border:1px solid rgba(56,224,123,.35);display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 0 40px rgba(56,224,123,.18)")}>
          <i className="ph-fill ph-trophy" style={css("font-size:46px;color:var(--data)")} />
        </div>
        <div style={css("font:600 12px 'JetBrains Mono';color:var(--data);letter-spacing:1px")}>ENTRENO COMPLETADO</div>
        <div style={css("font:700 28px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin-top:6px")}>¡Bien hecho, Andrés!</div>
        <div style={css("font:500 13.5px 'IBM Plex Sans';color:#9FB0A8;margin-top:7px;line-height:1.5;max-width:280px")}>
          Fuerza · Día A · 62 min. Tu racha sube a <b style={css("color:#fff")}>13 días</b> 🔥
        </div>
      </div>

      <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:24px")}>
        <StatBox icon="ph-fill ph-barbell" col="var(--data)" value={<>8.4 <span style={css("font-size:14px;color:#6E7A76")}>t</span></>} label="Tonelaje de hoy" />
        <StatBox icon="ph-fill ph-list-checks" col="var(--data)" value={<>26<span style={css("font-size:14px;color:#6E7A76")}>/26</span></>} label="Series completadas" />
        <StatBox icon="ph-fill ph-gauge" col="var(--action)" value="8.1" label="RPE medio" />
        <StatBox icon="ph-fill ph-medal" col="var(--action)" value="2" label="Récords personales" highlight />
      </div>

      <div style={css("margin-top:16px;text-align:left")}>
        <div style={css("font:600 11px 'JetBrains Mono';color:#6E7A76;letter-spacing:.5px;margin-bottom:9px")}>NUEVOS RÉCORDS 🎉</div>
        {prs.map((pr, i) => (
          <div key={i} style={css("display:flex;align-items:center;gap:11px;background:#12181A;border:1px solid rgba(255,122,26,.18);border-radius:14px;padding:12px 13px;margin-bottom:8px")}>
            <div style={css("width:38px;height:38px;border-radius:11px;background:rgba(255,122,26,.14);display:flex;align-items:center;justify-content:center;flex:none")}>
              <i className="ph-fill ph-arrow-fat-up" style={css("color:var(--action);font-size:18px")} />
            </div>
            <div style={css("flex:1")}>
              <div style={css("font:600 14px 'IBM Plex Sans';color:#fff")}>{pr.name}</div>
              <div style={css("font:500 11.5px 'JetBrains Mono';color:#8A938F;margin-top:1px")}>{pr.detail}</div>
            </div>
            <div style={css("font:700 14px 'Space Grotesk';color:var(--action)")}>{pr.gain}</div>
          </div>
        ))}
      </div>

      <div style={css("flex:1")} />
      <div style={css("display:flex;flex-direction:column;gap:10px;margin-top:20px")}>
        <button onClick={onShare} style={css("width:100%;height:52px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer")}>
          <i className="ph-fill ph-paper-plane-tilt" />Enviar resumen a Camilo
        </button>
        <button onClick={onHome} style={css("width:100%;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:none;color:#C6CFCB;font:600 14px 'IBM Plex Sans';cursor:pointer")}>Volver al inicio</button>
      </div>
    </div>
  );
}

function StatBox({ icon, col, value, label, highlight }: { icon: string; col: string; value: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div style={{ ...css("border-radius:18px;padding:16px;text-align:left"), background: highlight ? "linear-gradient(135deg,#1b130a,#12181A)" : "#12181A", border: `1px solid ${highlight ? "rgba(255,122,26,.3)" : "rgba(255,255,255,.06)"}` }}>
      <i className={icon} style={{ fontSize: 20, color: col }} />
      <div style={css("font:700 24px 'Space Grotesk';color:#fff;margin-top:9px;letter-spacing:-.5px")}>{value}</div>
      <div style={{ ...css("font:500 11.5px 'IBM Plex Sans';margin-top:1px"), color: highlight ? "#C9B3A4" : "#6E7A76" }}>{label}</div>
    </div>
  );
}

/* ============================ BOTTOM NAV ============================ */
function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const col = (s: Screen) => (screen === s ? DATA : "#54605A");
  return (
    <div style={css("flex:none;height:78px;background:rgba(10,14,15,.92);border-top:1px solid rgba(255,255,255,.06);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:space-around;padding:0 8px 14px")}>
      <button onClick={() => go("home")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-house" style={{ fontSize: 22, color: col("home") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("home") }}>Hoy</span>
      </button>
      <button onClick={() => go("machines")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-squares-four" style={{ fontSize: 22, color: col("machines") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("machines") }}>Máquinas</span>
      </button>
      <button onClick={() => go("log")} aria-label="Entrenar" style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex:1")}>
        <span style={css("width:44px;height:34px;border-radius:12px;background:var(--data);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(56,224,123,.32)")}>
          <i className="ph-bold ph-barbell" style={css("font-size:19px;color:#06140C")} aria-hidden="true" />
        </span>
      </button>
      <button onClick={() => go("progress")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-chart-line-up" style={{ fontSize: 22, color: col("progress") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("progress") }}>Progreso</span>
      </button>
      <button onClick={() => go("coach")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-chat-circle" style={{ fontSize: 22, color: col("coach") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("coach") }}>Coach</span>
      </button>
    </div>
  );
}
