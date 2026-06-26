"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { css } from "@/lib/css";
import { PhoneFrame, DesktopFrame, StatusBar, Toast, useIsDesktop, type NavItem, type QuickAction } from "@/components/Frame";
import { AccountActions } from "@/components/AccountActions";
import { MachineInventory } from "@/components/Machines";
import { machines, MachineIllo } from "@/lib/machines";
import { EXERCISE_NAMES } from "@/lib/exercises";
import { DATA, ACTION, MUTED, clients, byId, rawSessions, fmt, presentClient, type RawClient, type PresentedClient } from "./data";
import {
  createClient, deleteClient, seedDemoClients,
  createRoutine, saveRoutineExercises, deleteRoutine,
  getRoutineWithExercises, startSession as startSessionDB, completeSession, saveSessionSets,
  type RoutineSummary, type RoutineWithExercises,
} from "@/app/actions/data";

type Screen = "dashboard" | "roster" | "builder" | "live" | "analytics" | "settings" | "machines";

const COACH_NAV: NavItem[] = [
  { key: "dashboard", icon: "ph-fill ph-house", label: "Hoy" },
  { key: "roster", icon: "ph-fill ph-users-three", label: "Clientes" },
  { key: "builder", icon: "ph-fill ph-plus-circle", label: "Crear", accent: true },
  { key: "analytics", icon: "ph-fill ph-chart-line-up", label: "Progreso" },
  { key: "settings", icon: "ph-fill ph-gear-six", label: "Ajustes" },
];

type BExercise = {
  name: string;
  sets: number;
  value: number; // reps or seconds depending on isDuration
  isDuration: boolean;
  weight: number;
  restSec: number;
};

const emptyEx = (): BExercise => ({ name: "", sets: 3, value: 10, isDuration: false, weight: 0, restSec: 120 });

export default function CoachApp({
  user,
  initialClients,
  initialRoutines,
}: {
  user: { name: string; email: string };
  initialClients: RawClient[];
  initialRoutines: RoutineSummary[];
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [, startTransition] = useTransition();
  const roster: PresentedClient[] = initialClients.map(presentClient);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState<number | null>(null);
  // Demo live session state
  const [liveId, setLiveId] = useState<number>(1);
  const [rest, setRest] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [doneSets, setDoneSets] = useState<Record<number, boolean>>({ 1: true, 2: true });
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Routines state
  const [routinesList, setRoutinesList] = useState<RoutineSummary[]>(initialRoutines);

  // Builder state
  const [bName, setBName] = useState("");
  const [bClientId, setBClientId] = useState<string>("");
  const [bExercises, setBExercises] = useState<BExercise[]>([emptyEx()]);
  const [bSaving, setBSaving] = useState(false);
  const [bPresetClientId, setBPresetClientId] = useState<string>(""); // pre-selects client from roster

  // Real live session state (coach starts session from roster)
  const [liveRealClient, setLiveRealClient] = useState<{ id: string; name: string } | null>(null);
  const [liveRealRoutine, setLiveRealRoutine] = useState<RoutineWithExercises | null>(null);
  const [liveRealSessionId, setLiveRealSessionId] = useState<string | null>(null);

  // Routine picker modal
  const [pickerClient, setPickerClient] = useState<{ id: string; name: string } | null>(null);
  const [pickerRoutines, setPickerRoutines] = useState<RoutineSummary[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const go = (s: Screen) => { setScreen(s); setProfileId(null); };
  const demoStartSession = (id: number) => { setLiveId(id); setProfileId(null); setScreen("live"); };
  const seedRoster = () => startTransition(async () => { await seedDemoClients(); router.refresh(); });
  const removeClient = (realId: string) =>
    startTransition(async () => { await deleteClient(realId); setProfileId(null); router.refresh(); });
  const addClient = (fd: FormData) =>
    startTransition(async () => { await createClient({}, fd); router.refresh(); });
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  const toggleRest = () => {
    if (restActive) {
      if (timer.current) clearInterval(timer.current);
      setRestActive(false); setRest(0);
      return;
    }
    const total = 120;
    setRestActive(true); setRest(total);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setRest((r) => {
        if (r <= 1) { if (timer.current) clearInterval(timer.current); setRestActive(false); return 0; }
        return r - 1;
      });
    }, 1000);
  };
  const toggleSet = (n: number) => setDoneSets((d) => ({ ...d, [n]: !d[n] }));
  const nextSet = () => {
    setDoneSets((d) => {
      const next = [1, 2, 3, 4, 5].find((n) => !d[n]);
      if (next == null) return d;
      return { ...d, [next]: true };
    });
    toggleRest();
  };

  /* ── Real session start from roster ── */
  const startRealSession = (client: { id: string; name: string }) => {
    const clientRoutines = routinesList.filter((r) => r.clientId === client.id);
    if (clientRoutines.length === 0) {
      // Free session without a routine
      void (async () => {
        try {
          const sessionId = await startSessionDB({ clientId: client.id });
          setLiveRealSessionId(sessionId);
        } catch { /* session ID will be null */ }
        setLiveRealClient(client);
        setLiveRealRoutine(null);
        setProfileId(null);
        setScreen("live");
      })();
      return;
    }
    setPickerClient(client);
    setPickerRoutines(clientRoutines);
  };

  const confirmPicker = async (routineId: string | null) => {
    if (!pickerClient) return;
    setPickerLoading(true);
    try {
      let routineData: RoutineWithExercises | null = null;
      let routineName: string | undefined;
      if (routineId) {
        const summary = pickerRoutines.find((r) => r.id === routineId);
        routineName = summary?.name;
        routineData = await getRoutineWithExercises(routineId);
      }
      let sessionId: string | null = null;
      try {
        sessionId = await startSessionDB({ clientId: pickerClient.id, routineId: routineId ?? undefined, routineName });
      } catch { /* ignore if DB unavailable */ }
      setLiveRealClient(pickerClient);
      setLiveRealRoutine(routineData);
      setLiveRealSessionId(sessionId);
      setPickerClient(null);
      setPickerRoutines([]);
      setProfileId(null);
      setScreen("live");
    } finally {
      setPickerLoading(false);
    }
  };

  /* ── Builder save ── */
  const saveBuilder = async () => {
    const name = bName.trim();
    if (!name) { showToast("Escribe un nombre para la rutina"); return; }
    const valid = bExercises.filter((e) => e.name.trim());
    if (valid.length === 0) { showToast("Añade al menos un ejercicio"); return; }
    setBSaving(true);
    try {
      const routineId = await createRoutine({ name, clientId: bClientId || undefined });
      await saveRoutineExercises(
        routineId,
        valid.map((e, i) => ({
          exerciseName: e.name.trim(),
          setCount: e.sets,
          repsTarget: e.isDuration ? undefined : e.value,
          durationSec: e.isDuration ? e.value : undefined,
          weightKg: e.weight > 0 ? e.weight : undefined,
          restSec: e.restSec,
          orderIndex: i,
        })),
      );
      showToast("Rutina guardada ✓");
      setBName(""); setBClientId(bPresetClientId); setBExercises([emptyEx()]);
      router.refresh();
    } catch {
      showToast("Error al guardar la rutina");
    } finally {
      setBSaving(false);
    }
  };

  const openBuilderForClient = (clientId: string) => {
    setBPresetClientId(clientId);
    setBClientId(clientId);
    setBName(""); setBExercises([emptyEx()]);
    go("builder");
  };

  const U = "kg";

  const screens = (
    <>
      {screen === "dashboard" && <Dashboard onStart={demoStartSession} onMachines={() => setScreen("machines")} />}
      {screen === "machines" && <MachineInventory onBack={() => go("dashboard")} historyFor={coachHistoryFor} />}
      {screen === "roster" && (
        <Roster
          clients={roster}
          query={query}
          onSearch={setQuery}
          onOpen={setProfileId}
          profileId={profileId}
          onClose={() => setProfileId(null)}
          onStats={() => { setProfileId(null); setScreen("analytics"); }}
          onStartSession={startRealSession}
          onSeed={seedRoster}
          onAdd={addClient}
          onDelete={removeClient}
          routines={routinesList}
          onNewRoutine={openBuilderForClient}
          onDeleteRoutine={async (id) => {
            await deleteRoutine(id);
            setRoutinesList((prev) => prev.filter((r) => r.id !== id));
          }}
        />
      )}
      {screen === "builder" && (
        <Builder
          clients={roster}
          bName={bName} setBName={setBName}
          bClientId={bClientId} setBClientId={setBClientId}
          bExercises={bExercises} setBExercises={setBExercises}
          saving={bSaving}
          onSave={saveBuilder}
        />
      )}
      {screen === "live" && liveRealClient ? (
        <LiveRoutine
          clientName={liveRealClient.name}
          routine={liveRealRoutine}
          sessionId={liveRealSessionId}
          back={() => { setLiveRealClient(null); setLiveRealRoutine(null); setLiveRealSessionId(null); go("dashboard"); }}
        />
      ) : screen === "live" && (
        <Live
          client={byId(liveId)!}
          doneSets={doneSets}
          toggleSet={toggleSet}
          restActive={restActive}
          rest={rest}
          toggleRest={toggleRest}
          nextSet={nextSet}
          back={() => go("dashboard")}
          U={U}
        />
      )}
      {screen === "analytics" && <Analytics />}
      {screen === "settings" && <Settings onToast={showToast} user={user} />}
    </>
  );

  const runQuickAction = (action: typeof QUICK_ACTIONS[number]["action"]) => {
    if (action === "builder" || action === "roster") go(action);
    else showToast("Próximamente");
  };

  return (
    <>
      {/* Routine picker modal */}
      {pickerClient && (
        <>
          <div onClick={() => setPickerClient(null)} style={css("position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6)")} />
          <div style={css("position:fixed;left:0;right:0;bottom:0;z-index:201;background:#0E1416;border-radius:28px 28px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:18px 18px 34px;animation:ccSlide .35s cubic-bezier(.2,.8,.2,1)")}>
            <div style={css("width:38px;height:4px;border-radius:3px;background:#2A3338;margin:0 auto 18px")} />
            <div style={css("font:700 18px 'Space Grotesk';color:#fff;margin-bottom:4px")}>¿Qué rutina hoy?</div>
            <div style={css("font:500 13px 'IBM Plex Sans';color:#6E7A76;margin-bottom:18px")}>{pickerClient.name}</div>
            {pickerRoutines.map((r) => (
              <button key={r.id} onClick={() => confirmPicker(r.id)} disabled={pickerLoading}
                style={css("width:100%;display:flex;align-items:center;gap:12px;background:#12181A;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:13px;margin-bottom:9px;cursor:pointer;text-align:left")}>
                <div style={css("width:40px;height:40px;border-radius:11px;background:rgba(56,224,123,.12);display:flex;align-items:center;justify-content:center;flex:none")}>
                  <i className="ph-fill ph-barbell" style={css("color:var(--data);font-size:18px")} />
                </div>
                <div style={css("flex:1")}>
                  <div style={css("font:600 14px 'IBM Plex Sans';color:#fff")}>{r.name}</div>
                  <div style={css("font:500 11.5px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>{r.exerciseCount} ejercicios</div>
                </div>
                <i className="ph ph-caret-right" style={css("color:#4A554F;font-size:16px")} />
              </button>
            ))}
            <button onClick={() => confirmPicker(null)} disabled={pickerLoading}
              style={css("width:100%;height:46px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:none;color:#8A938F;font:600 13px 'IBM Plex Sans';cursor:pointer;margin-top:4px")}>
              Sesión libre sin rutina
            </button>
          </div>
        </>
      )}

      {isDesktop ? (
        <DesktopFrame nav={COACH_NAV} current={screen} onNavigate={(k) => go(k as Screen)}
          quickActions={(QUICK_ACTIONS.map(({ label, icon, action }) => ({ label, icon, onSelect: () => runQuickAction(action) })) as QuickAction[])}>
          <Toast msg={toast} />
          <div style={css("padding:24px 0 80px")}>{screens}</div>
        </DesktopFrame>
      ) : (
        <PhoneFrame>
          <StatusBar />
          <Toast msg={toast} />
          <div className="cc-scroll" style={css("flex:1;overflow-y:auto;position:relative;background:#0A0E0F")}>
            {screens}
          </div>
          {screen !== "live" && <BottomNav screen={screen} go={go} onToast={showToast} />}
        </PhoneFrame>
      )}
    </>
  );
}

/* ============================ DASHBOARD ============================ */
const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const TODAY_IDX = 1;

function Dashboard({ onStart, onMachines }: { onStart: (id: number) => void; onMachines: () => void }) {
  const [selectedDay, setSelectedDay] = useState(TODAY_IDX);
  const maintenance = machines.filter((m) => m.status === "mantenimiento").length;
  const previewIllos = ["leg-press", "lat-pulldown", "smith", "rower"];
  const DAY_DATA = [
    ["lun", "23"], ["mar", "24"], ["mié", "25"], ["jue", "26"], ["vie", "27"], ["sáb", "28"], ["dom", "29"],
  ];
  const days = DAY_DATA.map((d, i) => {
    const active = i === selectedDay;
    return {
      dow: d[0], num: d[1],
      bg: active ? DATA : "#12181A",
      border: active ? DATA : "rgba(255,255,255,.05)",
      fg: active ? "#06140C" : "#E6ECEA",
      sub: active ? "rgba(6,20,12,.7)" : "#6E7A76",
      dot: i === TODAY_IDX ? (active ? "#06140C" : MUTED) : "transparent",
    };
  });
  const isToday = selectedDay === TODAY_IDX;
  const selectedNum = DAY_DATA[selectedDay][1];
  const headerTitle = isToday ? "Hoy" : DAY_FULL[selectedDay];
  const headerSub = `${DAY_FULL[selectedDay]} · ${selectedNum} Jun`;

  const summary = [
    { icon: "ph-fill ph-users-three", value: "24", label: "Clientes activos", col: DATA },
    { icon: "ph-fill ph-check-circle", value: "18", label: "Completadas (sem.)", col: DATA },
    { icon: "ph-fill ph-calendar-check", value: "5", label: "Sesiones hoy", col: ACTION },
    { icon: "ph-fill ph-trend-up", value: "92%", label: "Adherencia media", col: ACTION },
  ];

  const sessionList = rawSessions.map((s) => {
    const c = byId(s.id)!;
    const now = s.state === "now";
    const done = s.state === "done";
    return {
      time: s.time, name: c.name, initials: c.initials, bg: c.bg, type: s.type,
      timeCol: now ? ACTION : done ? MUTED : "#C6CFCB",
      statusCol: now ? ACTION : done ? DATA : "#3A443F",
      cardBg: now ? "#16201C" : "#12181A",
      cardBorder: now ? "rgba(255,122,26,.3)" : "rgba(255,255,255,.05)",
      completed: done, pending: !done,
      btnLabel: now ? "Iniciar" : "Ver",
      btnBg: now ? ACTION : "#1A2226",
      btnFg: now ? "#1a0c00" : "#C6CFCB",
      onStart: () => onStart(s.id),
    };
  });

  return (
    <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px")}>
        <div>
          <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;letter-spacing:.3px;text-transform:uppercase")}>{headerSub}</div>
          <div style={css("font:700 30px 'Space Grotesk';color:#fff;letter-spacing:-.6px;margin-top:2px")}>{headerTitle}</div>
        </div>
        <div style={css("width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#1d2528,#11171a);display:flex;align-items:center;justify-content:center;font:700 14px 'Space Grotesk';color:var(--data);border:1px solid rgba(255,255,255,.07)")}>CC</div>
      </div>

      <div className="cc-scroll" style={css("display:flex;gap:8px;overflow-x:auto;margin:0 -18px 20px;padding:2px 18px")}>
        {days.map((d, i) => (
          <div key={i} onClick={() => setSelectedDay(i)} style={{ ...css("flex:none;width:48px;height:62px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer"), background: d.bg, border: `1px solid ${d.border}` }}>
            <span style={{ ...css("font:600 11px 'IBM Plex Sans'"), color: d.sub }}>{d.dow}</span>
            <span style={{ ...css("font:700 17px 'Space Grotesk'"), color: d.fg }}>{d.num}</span>
            <span style={{ ...css("width:5px;height:5px;border-radius:50%"), background: d.dot }} />
          </div>
        ))}
      </div>

      <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px")}>
        {summary.map((s, i) => (
          <div key={i} style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:14px")}>
            <i className={s.icon} style={{ fontSize: 19, color: s.col }} />
            <div style={css("font:700 24px 'Space Grotesk';color:#fff;margin-top:8px;letter-spacing:-.5px")}>{s.value}</div>
            <div style={css("font:500 11.5px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>{s.label}</div>
          </div>
        ))}
      </div>

      <div onClick={onMachines} style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:14px;margin-bottom:24px;cursor:pointer")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:12px")}>
          <div style={css("display:flex;align-items:center;gap:8px")}>
            <i className="ph-fill ph-squares-four" style={css("color:var(--data);font-size:18px")} />
            <span style={css("font:600 15px 'Space Grotesk';color:#E6ECEA")}>Equipamiento del gym</span>
          </div>
          <i className="ph ph-caret-right" style={css("color:#4A554F;font-size:16px")} />
        </div>
        <div style={css("display:flex;align-items:center;gap:8px")}>
          {previewIllos.map((id) => (
            <div key={id} style={css("width:52px;height:52px;border-radius:12px;background:#0A0F11;border:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center")}>
              <MachineIllo id={id} size={46} />
            </div>
          ))}
          <div style={css("flex:1;text-align:right")}>
            <div style={css("font:700 20px 'Space Grotesk';color:#fff")}>{machines.length}</div>
            <div style={css("font:500 10.5px 'IBM Plex Sans';color:#6E7A76")}>{maintenance > 0 ? maintenance + " en mantenim." : "todas operativas"}</div>
          </div>
        </div>
      </div>

      <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:12px")}>
        <div style={css("font:600 16px 'Space Grotesk';color:#E6ECEA")}>{isToday ? "Sesiones de hoy" : `Sesiones del ${DAY_FULL[selectedDay].toLowerCase()}`}</div>
        {isToday && <div style={css("font:600 12px 'IBM Plex Sans';color:#6E7A76;background:#12181A;padding:3px 9px;border-radius:20px")}>5 agendadas</div>}
      </div>

      {!isToday && (
        <div style={css("display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;gap:10px")}>
          <i className="ph ph-calendar-blank" style={css("font-size:40px;color:#2A3338")} />
          <div style={css("font:500 14px 'IBM Plex Sans';color:#4A554F;text-align:center")}>No hay sesiones agendadas para este día</div>
        </div>
      )}

      {isToday && sessionList.map((se, i) => (
        <div key={i} style={{ ...css("border-radius:18px;padding:13px;display:flex;align-items:center;gap:12px;margin-bottom:10px"), background: se.cardBg, border: `1px solid ${se.cardBorder}` }}>
          <div style={css("width:46px;text-align:center;flex:none")}>
            <div style={{ ...css("font:700 15px 'Space Grotesk';line-height:1"), color: se.timeCol }}>{se.time}</div>
            <div style={{ ...css("width:6px;height:6px;border-radius:50%;margin:7px auto 0"), background: se.statusCol }} />
          </div>
          <div style={{ ...css("width:42px;height:42px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;font:700 13px 'Space Grotesk';color:#E6ECEA"), background: se.bg }}>{se.initials}</div>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("font:600 15px 'IBM Plex Sans';color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{se.name}</div>
            <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>{se.type}</div>
          </div>
          {se.completed && (
            <div style={css("flex:none;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(56,224,123,.1)")}>
              <i className="ph-fill ph-check" style={css("color:var(--data);font-size:17px")} />
            </div>
          )}
          {se.pending && (
            <button onClick={se.onStart} style={{ ...css("flex:none;height:38px;padding:0 14px;border:none;border-radius:12px;font:600 13px 'IBM Plex Sans';display:flex;align-items:center;gap:5px;cursor:pointer"), background: se.btnBg, color: se.btnFg }}>
              {se.btnLabel}<i className="ph-bold ph-caret-right" style={css("font-size:12px")} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================ ROSTER ============================ */
function Roster({
  clients: roster, query, onSearch, onOpen, profileId, onClose, onStats, onStartSession, onSeed, onAdd, onDelete,
  routines: allRoutines, onNewRoutine, onDeleteRoutine,
}: {
  clients: PresentedClient[];
  query: string;
  onSearch: (v: string) => void;
  onOpen: (id: number) => void;
  profileId: number | null;
  onClose: () => void;
  onStats: () => void;
  onStartSession: (client: { id: string; name: string }) => void;
  onSeed: () => void;
  onAdd: (fd: FormData) => void;
  onDelete: (realId: string) => void;
  routines: RoutineSummary[];
  onNewRoutine: (clientId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const list = roster.filter((c) => !q || c.name.toLowerCase().includes(q) || c.goal.toLowerCase().includes(q));
  const p = roster.find((c) => c.id === profileId);
  const clientRoutines = p ? allRoutines.filter((r) => r.clientId === p.realId) : [];

  return (
    <>
      <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:4px")}>
          <div style={css("font:700 30px 'Space Grotesk';color:#fff;letter-spacing:-.6px")}>Clientes</div>
          <button onClick={() => setAdding((v) => !v)} aria-label={adding ? "Cerrar formulario" : "Añadir cliente"} aria-expanded={adding} style={css("width:40px;height:40px;border-radius:12px;border:none;background:var(--action);color:#1a0c00;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
            <i className={adding ? "ph-bold ph-x" : "ph-bold ph-plus"} aria-hidden="true" />
          </button>
        </div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#6E7A76;margin-bottom:16px")}>{roster.length} en tu cartera · BD</div>

        {adding && (
          <form
            action={(fd) => { onAdd(fd); setAdding(false); }}
            style={css("background:#12181A;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px;margin-bottom:16px;display:flex;flex-direction:column;gap:10px")}
          >
            <input name="name" required placeholder="Nombre del cliente" style={css("background:#0A0F11;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:0 12px;height:44px;color:#fff;outline:none;font:500 14px 'IBM Plex Sans'")} />
            <div style={css("display:flex;gap:10px")}>
              <select name="goal" defaultValue="Hipertrofia" style={css("flex:1;background:#0A0F11;border:1px solid rgba(255,255,255,.08);border-radius:11px;height:44px;color:#fff;outline:none;font:500 13px 'IBM Plex Sans';padding:0 10px")}>
                <option>Hipertrofia</option><option>Pérdida de grasa</option><option>Fuerza</option><option>Rehabilitación</option>
              </select>
              <input name="age" type="number" min={0} max={120} placeholder="Edad" style={css("width:80px;background:#0A0F11;border:1px solid rgba(255,255,255,.08);border-radius:11px;height:44px;color:#fff;outline:none;font:500 14px 'IBM Plex Sans';padding:0 12px")} />
            </div>
            <input name="level" defaultValue="Principiante" placeholder="Nivel" style={css("background:#0A0F11;border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:0 12px;height:44px;color:#fff;outline:none;font:500 14px 'IBM Plex Sans'")} />
            <button type="submit" style={css("height:46px;border:none;border-radius:12px;background:var(--data);color:#06140C;font:700 14px 'IBM Plex Sans';cursor:pointer")}>Guardar cliente</button>
          </form>
        )}

        <div style={css("display:flex;align-items:center;gap:9px;background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:0 13px;height:46px;margin-bottom:18px")}>
          <i className="ph ph-magnifying-glass" style={css("color:#6E7A76;font-size:18px")} />
          <input value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar cliente…" style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 14px 'IBM Plex Sans'")} />
          <i className="ph ph-sliders-horizontal" style={css("color:#6E7A76;font-size:18px")} />
        </div>

        {roster.length === 0 && !adding && (
          <div style={css("text-align:center;padding:30px 24px")}>
            <div style={css("width:84px;height:84px;border-radius:26px;background:#12181A;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;margin:0 auto 18px")}>
              <i className="ph ph-users-three" style={css("font-size:38px;color:#38E07B")} />
            </div>
            <div style={css("font:700 18px 'Space Grotesk';color:#fff")}>Aún no tienes clientes</div>
            <div style={css("font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:8px;line-height:1.5")}>Añade tu primer cliente o carga el roster de ejemplo para probar.</div>
            <button onClick={onSeed} style={css("margin-top:18px;height:46px;padding:0 18px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#12181A;color:#C6CFCB;font:600 13px 'IBM Plex Sans';cursor:pointer")}>Cargar roster de ejemplo</button>
          </div>
        )}

        {list.map((c) => (
          <div key={c.id} onClick={() => onOpen(c.id)} style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:13px;display:flex;align-items:center;gap:12px;margin-bottom:9px;cursor:pointer")}>
            <div style={{ ...css("width:46px;height:46px;border-radius:14px;flex:none;display:flex;align-items:center;justify-content:center;font:700 14px 'Space Grotesk';color:#E6ECEA"), background: c.bg }}>{c.initials}</div>
            <div style={css("flex:1;min-width:0")}>
              <div style={css("display:flex;align-items:center;gap:7px")}>
                <span style={css("font:600 15px 'IBM Plex Sans';color:#fff")}>{c.name}</span>
                <span style={css("font:600 10.5px 'Space Grotesk';letter-spacing:.5px;color:#8A938F;background:#0A0F11;border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:1px 6px")}>{c.code}</span>
              </div>
              <div style={css("display:flex;align-items:center;gap:6px;margin-top:4px")}>
                <span style={{ ...css("display:inline-flex;align-items:center;gap:4px;font:600 11px 'IBM Plex Sans';padding:2px 7px;border-radius:6px"), color: c.goalCol, background: c.goalBg }}>
                  <i className={c.goalIcon} style={css("font-size:12px")} />{c.goal}
                </span>
                <span style={css("font:500 11px 'IBM Plex Sans';color:#5E6A66")}>{c.level}</span>
              </div>
            </div>
            <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:none")}>
              <span style={{ ...css("display:flex;align-items:center;gap:4px;font:600 11px 'IBM Plex Sans'"), color: c.statusCol }}>
                <span style={{ ...css("width:6px;height:6px;border-radius:50%"), background: c.statusCol }} />{c.status}
              </span>
              <i className="ph ph-caret-right" style={css("color:#4A554F;font-size:16px")} />
            </div>
          </div>
        ))}
      </div>

      {p && (
        <>
          <div onClick={onClose} style={css("position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:50")} />
          <div className="cc-scroll" style={css("position:absolute;left:0;right:0;bottom:0;z-index:51;background:#0E1416;border-radius:28px 28px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:14px 18px 26px;max-height:92%;overflow-y:auto;animation:ccSlide .4s cubic-bezier(.2,.8,.2,1)")}>
            <div style={css("width:38px;height:4px;border-radius:3px;background:#2A3338;margin:0 auto 18px")} />
            <div style={css("display:flex;align-items:center;gap:14px;margin-bottom:18px")}>
              <div style={{ ...css("width:62px;height:62px;border-radius:18px;flex:none;display:flex;align-items:center;justify-content:center;font:700 20px 'Space Grotesk';color:#E6ECEA"), background: p.bg }}>{p.initials}</div>
              <div style={css("flex:1")}>
                <div style={css("font:700 21px 'Space Grotesk';color:#fff;letter-spacing:-.3px")}>{p.name}</div>
                <div style={css("display:flex;align-items:center;gap:8px;margin-top:4px")}>
                  <span style={css("font:600 11px 'Space Grotesk';letter-spacing:.5px;color:var(--data);background:rgba(56,224,123,.1);border-radius:6px;padding:2px 7px")}>{p.code}</span>
                  <span style={css("font:500 13px 'IBM Plex Sans';color:#6E7A76")}>{p.level} · {p.age}</span>
                </div>
              </div>
              <div style={css("width:40px;height:40px;border-radius:12px;background:#171E21;display:flex;align-items:center;justify-content:center")}>
                <i className="ph ph-chat-circle" style={css("color:#8A938F;font-size:18px")} />
              </div>
            </div>
            <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px")}>
              <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:13px")}>
                <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;display:flex;align-items:center;gap:5px")}><i className={p.goalIcon} />Objetivo</div>
                <div style={{ ...css("font:600 15px 'IBM Plex Sans';margin-top:6px"), color: p.goalCol }}>{p.goal}</div>
              </div>
              <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:13px")}>
                <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;display:flex;align-items:center;gap:5px")}><i className="ph ph-pulse" />Estado</div>
                <div style={{ ...css("font:600 15px 'IBM Plex Sans';margin-top:6px"), color: p.statusCol }}>{p.status}</div>
              </div>
            </div>
            <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:14px;margin-bottom:14px")}>
              <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;display:flex;align-items:center;gap:6px;margin-bottom:10px")}>
                <i className="ph ph-bandaids" style={css("color:#FF6B8A")} />HISTORIAL DE LESIONES
              </div>
              <div style={css("font:500 14px 'IBM Plex Sans';color:#D6DEDA;line-height:1.5")}>{p.injuries}</div>
            </div>

            {/* ── Rutinas asignadas ── */}
            <div style={css("margin-bottom:14px")}>
              <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:10px")}>
                <div style={css("font:600 13px 'Space Grotesk';color:#E6ECEA;display:flex;align-items:center;gap:6px")}>
                  <i className="ph-fill ph-barbell" style={css("color:var(--data);font-size:15px")} />Rutinas asignadas
                </div>
                <button onClick={() => onNewRoutine(p.realId)} style={css("display:flex;align-items:center;gap:5px;height:32px;padding:0 11px;border:none;border-radius:9px;background:rgba(56,224,123,.12);color:var(--data);font:600 12px 'IBM Plex Sans';cursor:pointer")}>
                  <i className="ph-bold ph-plus" style={css("font-size:12px")} />Nueva
                </button>
              </div>
              {clientRoutines.length === 0 ? (
                <div style={css("background:#12181A;border:1px dashed rgba(255,255,255,.08);border-radius:12px;padding:16px;text-align:center")}>
                  <div style={css("font:500 13px 'IBM Plex Sans';color:#5E6A66")}>Sin rutinas asignadas</div>
                  <div style={css("font:500 11.5px 'IBM Plex Sans';color:#3E4A45;margin-top:3px")}>Pulsa "Nueva" para crear y asignar una rutina</div>
                </div>
              ) : (
                <div style={css("display:flex;flex-direction:column;gap:8px")}>
                  {clientRoutines.map((r) => (
                    <div key={r.id} style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px")}>
                      <i className="ph-fill ph-barbell" style={css("color:var(--data);font-size:16px;flex:none")} />
                      <div style={css("flex:1;min-width:0")}>
                        <div style={css("font:600 13.5px 'IBM Plex Sans';color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.name}</div>
                        <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>{r.exerciseCount} ejercicios</div>
                      </div>
                      <button onClick={() => onDeleteRoutine(r.id)} style={css("flex:none;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,107,138,.2);background:rgba(255,107,138,.06);color:#FF6B8A;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
                        <i className="ph ph-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={css("display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px")}>
              <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:12px;text-align:center")}>
                <div style={css("font:700 19px 'Space Grotesk';color:#fff")}>{p.s1}</div>
                <div style={css("font:500 10.5px 'IBM Plex Sans';color:#6E7A76;margin-top:3px")}>Sesiones</div>
              </div>
              <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:12px;text-align:center")}>
                <div style={css("font:700 19px 'Space Grotesk';color:var(--data)")}>{p.s2}</div>
                <div style={css("font:500 10.5px 'IBM Plex Sans';color:#6E7A76;margin-top:3px")}>Adherencia</div>
              </div>
              <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:12px;text-align:center")}>
                <div style={css("font:700 19px 'Space Grotesk';color:#fff")}>{p.s3}</div>
                <div style={css("font:500 10.5px 'IBM Plex Sans';color:#6E7A76;margin-top:3px")}>PRs (mes)</div>
              </div>
            </div>
            <div style={css("display:flex;gap:10px")}>
              <button onClick={onStats} style={css("flex:1;height:50px;border:none;border-radius:14px;background:var(--data);color:#06140C;font:700 14px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer")}>
                <i className="ph-bold ph-chart-line-up" />Ver estadísticas
              </button>
              <button onClick={() => onStartSession({ id: p.realId, name: p.name })} aria-label={`Iniciar sesión con ${p.name}`} style={css("flex:none;width:50px;height:50px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#171E21;color:var(--action);font-size:20px;cursor:pointer")}>
                <i className="ph-fill ph-play" aria-hidden="true" />
              </button>
              <button onClick={() => onDelete(p.realId)} style={css("flex:none;width:50px;height:50px;border:1px solid rgba(255,107,138,.25);border-radius:14px;background:rgba(255,107,138,.06);color:#FF6B8A;font-size:19px;cursor:pointer")}>
                <i className="ph ph-trash" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ============================ BUILDER ============================ */
function Builder({
  clients: roster,
  bName, setBName,
  bClientId, setBClientId,
  bExercises, setBExercises,
  saving, onSave,
}: {
  clients: PresentedClient[];
  bName: string; setBName: (v: string) => void;
  bClientId: string; setBClientId: (v: string) => void;
  bExercises: BExercise[]; setBExercises: (exs: BExercise[]) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const updateEx = (idx: number, patch: Partial<BExercise>) =>
    setBExercises(bExercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const addEx = () => setBExercises([...bExercises, emptyEx()]);
  const removeEx = (idx: number) => setBExercises(bExercises.filter((_, i) => i !== idx));

  const inputStyle = css("background:#0A0F11;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;outline:none;font:500 13px 'IBM Plex Sans';height:38px;padding:0 10px");
  const numInput = (width: string) => ({ ...inputStyle, width, textAlign: "center" as const });

  return (
    <div style={css("padding:8px 18px 120px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;text-transform:uppercase;letter-spacing:.3px")}>Nueva rutina</div>
      <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin-top:2px;margin-bottom:18px")}>Crear rutina</div>

      {/* Nombre */}
      <input
        value={bName}
        onChange={(e) => setBName(e.target.value)}
        placeholder="Nombre de la rutina (ej. Fuerza · Día A)"
        style={{ ...css("width:100%;background:#12181A;border:1px solid rgba(255,255,255,.08);border-radius:13px;color:#fff;outline:none;font:600 15px 'IBM Plex Sans';height:50px;padding:0 14px;box-sizing:border-box;margin-bottom:10px") }}
      />

      {/* Cliente */}
      <select
        value={bClientId}
        onChange={(e) => setBClientId(e.target.value)}
        style={{ ...css("width:100%;background:#12181A;border:1px solid rgba(255,255,255,.08);border-radius:13px;color:#fff;outline:none;font:500 14px 'IBM Plex Sans';height:46px;padding:0 14px;box-sizing:border-box;margin-bottom:20px"), color: bClientId ? "#fff" : "#6E7A76" }}
      >
        <option value="">Asignar a un cliente (opcional)</option>
        {roster.map((c) => (
          <option key={c.realId} value={c.realId}>{c.name}</option>
        ))}
      </select>

      {/* Datalist de ejercicios */}
      <datalist id="ex-list">
        {EXERCISE_NAMES.map((n) => <option key={n} value={n} />)}
      </datalist>

      {/* Lista de ejercicios */}
      <div style={css("font:600 12px 'IBM Plex Sans';color:#8A938F;letter-spacing:.3px;text-transform:uppercase;margin-bottom:10px")}>Ejercicios</div>
      <div style={css("display:flex;flex-direction:column;gap:10px;margin-bottom:14px")}>
        {bExercises.map((e, idx) => (
          <div key={idx} style={css("background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px")}>
            <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:10px")}>
              <span style={css("font:600 11px 'JetBrains Mono';color:#6E7A76;min-width:20px")}>{idx + 1}</span>
              <input
                list="ex-list"
                value={e.name}
                onChange={(ev) => updateEx(idx, { name: ev.target.value })}
                placeholder="Nombre del ejercicio"
                style={{ ...css("flex:1;background:#0A0F11;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;outline:none;font:500 14px 'IBM Plex Sans';height:40px;padding:0 12px") }}
              />
              {bExercises.length > 1 && (
                <button onClick={() => removeEx(idx)} style={css("flex:none;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,107,138,.2);background:rgba(255,107,138,.06);color:#FF6B8A;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
                  <i className="ph ph-x" />
                </button>
              )}
            </div>
            <div style={css("display:flex;gap:8px;flex-wrap:wrap")}>
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <label style={css("font:500 10px 'IBM Plex Sans';color:#5E6A66")}>Series</label>
                <input type="number" min={1} max={20} value={e.sets}
                  onChange={(ev) => updateEx(idx, { sets: Math.max(1, parseInt(ev.target.value) || 1) })}
                  style={numInput("56px")} />
              </div>
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <label style={css("font:500 10px 'IBM Plex Sans';color:#5E6A66")}>{e.isDuration ? "Seg." : "Reps"}</label>
                <input type="number" min={1} value={e.value}
                  onChange={(ev) => updateEx(idx, { value: Math.max(1, parseInt(ev.target.value) || 1) })}
                  style={numInput("60px")} />
              </div>
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <label style={css("font:500 10px 'IBM Plex Sans';color:#5E6A66")}>Peso kg</label>
                <input type="number" min={0} step={0.5} value={e.weight || ""}
                  onChange={(ev) => updateEx(idx, { weight: parseFloat(ev.target.value) || 0 })}
                  placeholder="—"
                  style={numInput("64px")} />
              </div>
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <label style={css("font:500 10px 'IBM Plex Sans';color:#5E6A66")}>Descanso</label>
                <select value={e.restSec} onChange={(ev) => updateEx(idx, { restSec: parseInt(ev.target.value) })}
                  style={{ ...inputStyle, width: "80px" }}>
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                  <option value={180}>180s</option>
                </select>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:3px;justify-content:flex-end")}>
                <button onClick={() => updateEx(idx, { isDuration: !e.isDuration })}
                  style={{ ...css("height:38px;padding:0 10px;border-radius:10px;font:600 11px 'IBM Plex Sans';cursor:pointer"), background: e.isDuration ? "rgba(90,169,255,.14)" : "#0A0F11", border: `1px solid ${e.isDuration ? "rgba(90,169,255,.4)" : "rgba(255,255,255,.1)"}`, color: e.isDuration ? "#5AA9FF" : "#6E7A76" }}>
                  {e.isDuration ? "⏱ Duración" : "🔁 Reps"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addEx} style={css("width:100%;height:44px;border:1px dashed rgba(255,255,255,.12);border-radius:13px;background:none;color:#8A938F;font:600 13px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;margin-bottom:20px")}>
        <i className="ph ph-plus" />Añadir ejercicio
      </button>

      <button onClick={onSave} disabled={saving}
        style={{ ...css("width:100%;height:52px;border:none;border-radius:15px;font:700 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer"), background: saving ? "#1A2226" : DATA, color: saving ? "#6E7A76" : "#06140C" }}>
        <i className={saving ? "ph ph-circle-notch" : "ph-fill ph-floppy-disk"} />
        {saving ? "Guardando…" : `Guardar rutina · ${bExercises.filter((e) => e.name.trim()).length} ejercicios`}
      </button>
    </div>
  );
}

/* ============================ LIVE SESSION (demo) ============================ */
const coachHistoryFor = (machineId: string) => {
  const exercises = [
    { name: "Movilidad de cadera", machineId: undefined, scheme: "2 × 10" },
    { name: "Face pull", machineId: "cable-station", scheme: "3 × 15" },
    { name: "Sentadilla trasera", machineId: "power-rack", scheme: "5 × 5 · 82.5% RM" },
    { name: "Press de banca", machineId: "bench-flat", scheme: "5 × 5 · 80% RM" },
    { name: "Zancadas con mancuerna", machineId: undefined, scheme: "3 × 12" },
    { name: "Curl femoral tumbado", machineId: "leg-curl", scheme: "3 × 12" },
    { name: "Plancha", machineId: undefined, scheme: "3 × 45s" },
  ];
  return exercises
    .filter((e) => e.machineId === machineId)
    .map((e) => ({ when: e.name, val: e.scheme }));
};

function Live({
  client, doneSets, toggleSet, restActive, rest, toggleRest, nextSet, back, U,
}: {
  client: { name: string };
  doneSets: Record<number, boolean>;
  toggleSet: (n: number) => void;
  restActive: boolean;
  rest: number;
  toggleRest: () => void;
  nextSet: () => void;
  back: () => void;
  U: string;
}) {
  const setData = [
    { n: 1, prevW: "100", prevR: "5", rpe: "8", today: "102.5", up: true },
    { n: 2, prevW: "100", prevR: "5", rpe: "8", today: "102.5", up: true },
    { n: 3, prevW: "100", prevR: "4", rpe: "9", today: "102.5", up: true },
    { n: 4, prevW: "95", prevR: "5", rpe: "8", today: "102.5", up: true },
    { n: 5, prevW: "95", prevR: "5", rpe: "8", today: "102.5", up: true },
  ];
  const notes = ["Corregir postura lumbar", "Buena profundidad", "Subir 2.5kg sgte. sesión"];
  const restLabel = restActive ? "Descanso · " + fmt(rest) : "Descanso " + fmt(120);

  return (
    <div style={css("min-height:100%;background:#070B0C;animation:ccPop .3s ease;display:flex;flex-direction:column")}>
      <div style={css("padding:6px 18px 0;display:flex;align-items:center;justify-content:space-between")}>
        <button onClick={back} style={css("width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#10161800;color:#C6CFCB;font-size:18px;cursor:pointer")}>
          <i className="ph-bold ph-x" />
        </button>
        <div style={css("text-align:center")}>
          <div style={css("font:600 13px 'IBM Plex Sans';color:#fff")}>{client.name}</div>
          <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76")}>Fuerza · Día A</div>
        </div>
        <div style={css("display:flex;align-items:center;gap:5px;font:700 13px 'Space Grotesk';color:var(--action);background:rgba(255,122,26,.12);padding:6px 10px;border-radius:10px")}>
          <span style={css("width:6px;height:6px;border-radius:50%;background:var(--action);animation:ccPulse 1.6s infinite")} />EN VIVO
        </div>
      </div>
      <div style={css("padding:18px;flex:1")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:4px")}>
          <span style={css("font:600 11px 'JetBrains Mono';color:var(--data);letter-spacing:.5px")}>EJERCICIO 1 DE 5</span>
          <span style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76")}>Sgte: Press de banca</span>
        </div>
        <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.5px;line-height:1.1")}>Sentadilla trasera</div>
        <div style={css("font:600 13px 'JetBrains Mono';color:#8A938F;margin-top:7px")}>5 × 5  ·  82.5% RM  ·  RPE 8  ·  desc. 180s</div>
        <div style={css("margin-top:18px;display:flex;flex-direction:column;gap:9px")}>
          <div style={css("display:grid;grid-template-columns:34px 1fr 1fr 44px;gap:8px;padding:0 4px;font:600 10px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase")}>
            <span>Set</span><span>Anterior</span><span style={css("text-align:center")}>Hoy</span><span />
          </div>
          {setData.map((s) => {
            const done = !!doneSets[s.n];
            return (
              <div key={s.n} onClick={() => toggleSet(s.n)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSet(s.n); } }}
                style={{ ...css("display:grid;grid-template-columns:34px 1fr 1fr 44px;gap:8px;align-items:center;border-radius:14px;padding:11px 10px;cursor:pointer"), background: done ? "rgba(56,224,123,.07)" : "#10171A", border: `1px solid ${done ? "rgba(56,224,123,.3)" : "rgba(255,255,255,.06)"}` }}>
                <span style={css("font:700 15px 'Space Grotesk';color:#fff;text-align:center")}>{s.n}</span>
                <span style={css("font:500 12px 'JetBrains Mono';color:#6E7A76")}>{s.prevW + U + " × " + s.prevR + " · RPE" + s.rpe}</span>
                <span style={css("text-align:center")}>
                  <span style={{ ...css("font:700 16px 'Space Grotesk'"), color: done ? DATA : "#fff" }}>{s.today + U}</span>
                  {s.up && <i className="ph-bold ph-arrow-up" style={css("font-size:11px;color:var(--data);margin-left:3px")} />}
                </span>
                <span style={{ ...css("justify-self:center;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center"), background: done ? DATA : "#0A0F11", border: `1px solid ${done ? DATA : "rgba(255,255,255,.1)"}` }}>
                  <i className={done ? "ph-bold ph-check" : "ph ph-circle"} style={{ fontSize: 16, color: done ? "#06140C" : "#3A443F" }} />
                </span>
              </div>
            );
          })}
        </div>
        <div style={css("margin-top:18px;background:#10171A;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px")}>
          <div style={css("display:flex;align-items:center;gap:7px;margin-bottom:10px")}>
            <i className="ph-fill ph-note-pencil" style={css("color:var(--action);font-size:16px")} />
            <span style={css("font:600 13px 'IBM Plex Sans';color:#E6ECEA")}>Notas del entrenador</span>
          </div>
          <div style={css("display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px")}>
            {notes.map((n, i) => (
              <span key={i} style={css("font:500 12px 'IBM Plex Sans';color:#D6DEDA;background:#1A2226;border:1px solid rgba(255,255,255,.06);padding:6px 10px;border-radius:9px;display:flex;align-items:center;gap:6px")}>
                <i className="ph ph-quotes" style={css("color:#5E6A66;font-size:12px")} />{n}
              </span>
            ))}
          </div>
          <div style={css("display:flex;align-items:center;gap:9px;background:#0A0F11;border:1px solid rgba(255,255,255,.06);border-radius:11px;padding:0 12px;height:42px")}>
            <input placeholder="Añadir nota rápida…" style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 13px 'IBM Plex Sans'")} />
            <i className="ph-fill ph-paper-plane-right" style={css("color:var(--data);font-size:17px")} />
          </div>
        </div>
      </div>
      <div style={css("position:sticky;bottom:0;padding:14px 18px 18px;background:linear-gradient(to top,#070B0C 70%,transparent);display:flex;gap:11px;align-items:center")}>
        <button onClick={toggleRest} style={{ ...css("flex:1;height:56px;border:none;border-radius:16px;font:700 16px 'Space Grotesk';display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;transition:all .2s"), background: restActive ? ACTION : "#171E21", color: restActive ? "#1a0c00" : "#E6ECEA" }}>
          <i className={restActive ? "ph-fill ph-pause" : "ph-fill ph-timer"} style={css("font-size:20px")} />{restLabel}
        </button>
        <button onClick={nextSet} style={css("flex:none;width:56px;height:56px;border-radius:16px;border:none;background:var(--data);color:#06140C;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
          <i className="ph-bold ph-check" />
        </button>
      </div>
    </div>
  );
}

/* ============================ LIVE ROUTINE (real session) ============================ */
function LiveRoutine({
  clientName, routine, sessionId, back,
}: {
  clientName: string;
  routine: RoutineWithExercises | null;
  sessionId: string | null;
  back: () => void;
}) {
  const exList = routine?.exercises ?? [];
  const [exIdx, setExIdx] = useState(0);
  const [doneSets, setDoneSets] = useState<Record<string, boolean>>({});
  const [rest, setRest] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [note, setNote] = useState("");
  const [notesList, setNotesList] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const totalSets = exList.reduce((s, e) => s + e.setCount, 0);
  const doneSetsCount = Object.values(doneSets).filter(Boolean).length;
  const donePct = totalSets > 0 ? Math.round((doneSetsCount / totalSets) * 100) : 0;

  const cur = exList[exIdx];

  const toggleDoneSet = (key: string) => setDoneSets((d) => ({ ...d, [key]: !d[key] }));

  const toggleRest = () => {
    if (restActive) {
      if (timer.current) clearInterval(timer.current);
      setRestActive(false); setRest(0); return;
    }
    const restSec = cur?.restSec ?? 120;
    setRestActive(true); setRest(restSec);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setRest((r) => {
        if (r <= 1) { if (timer.current) clearInterval(timer.current); setRestActive(false); return 0; }
        return r - 1;
      });
    }, 1000);
  };

  const addNote = () => {
    const t = note.trim();
    if (!t) return;
    setNotesList((n) => [...n, t]);
    setNote("");
  };

  const finish = async () => {
    const durationMin = Math.round((Date.now() - startTime) / 60000);
    if (sessionId) {
      try { await completeSession(sessionId, durationMin); } catch { /* ignore */ }
    }
    setFinished(true);
  };

  if (finished) {
    return (
      <div style={css("min-height:100%;padding:30px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;background:#070B0C;animation:ccPop .4s ease")}>
        <div style={css("width:88px;height:88px;border-radius:28px;background:radial-gradient(circle,rgba(56,224,123,.2),#12181A);border:1px solid rgba(56,224,123,.3);display:flex;align-items:center;justify-content:center;margin-bottom:18px")}>
          <i className="ph-fill ph-trophy" style={css("font-size:44px;color:var(--data)")} />
        </div>
        <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.5px")}>Sesión completada</div>
        <div style={css("font:500 13.5px 'IBM Plex Sans';color:#9FB0A8;margin-top:6px")}>{clientName} · {routine?.name ?? "Sesión libre"}</div>
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;margin-top:24px")}>
          <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;text-align:left")}>
            <i className="ph-fill ph-list-checks" style={css("color:var(--data);font-size:20px")} />
            <div style={css("font:700 22px 'Space Grotesk';color:#fff;margin-top:8px")}>{doneSetsCount}<span style={css("font-size:14px;color:#6E7A76")}>/{totalSets}</span></div>
            <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>Series completadas</div>
          </div>
          <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;text-align:left")}>
            <i className="ph-fill ph-barbell" style={css("color:var(--action);font-size:20px")} />
            <div style={css("font:700 22px 'Space Grotesk';color:#fff;margin-top:8px")}>{exList.length}</div>
            <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>Ejercicios</div>
          </div>
        </div>
        <button onClick={back} style={css("width:100%;height:52px;margin-top:28px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';cursor:pointer")}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (exList.length === 0) {
    return (
      <div style={css("min-height:100%;background:#070B0C;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center")}>
        <i className="ph ph-barbell" style={css("font-size:48px;color:#2A3338;margin-bottom:16px")} />
        <div style={css("font:700 20px 'Space Grotesk';color:#fff")}>Sesión libre</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#6E7A76;margin-top:6px")}>{clientName}</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#5E6A66;margin-top:12px;line-height:1.5")}>Esta sesión no tiene una rutina asignada</div>
        <button onClick={finish} style={css("margin-top:28px;height:50px;padding:0 24px;border:none;border-radius:14px;background:var(--data);color:#06140C;font:700 14px 'IBM Plex Sans';cursor:pointer")}>
          Finalizar sesión
        </button>
      </div>
    );
  }

  const setsForEx = Array.from({ length: cur.setCount }, (_, i) => {
    const key = `${exIdx}-${i + 1}`;
    return { key, n: i + 1, done: !!doneSets[key] };
  });
  const metaParts = [
    `${cur.setCount} × ${cur.repsTarget ? cur.repsTarget + " reps" : (cur.durationSec ? cur.durationSec + "s" : "—")}`,
    cur.weightKg ? cur.weightKg + " kg" : null,
    cur.rpeTarget ? "RPE " + cur.rpeTarget : null,
    "desc. " + (cur.restSec ?? 120) + "s",
  ].filter(Boolean).join("  ·  ");

  return (
    <div style={css("min-height:100%;background:#070B0C;animation:ccPop .3s ease;display:flex;flex-direction:column")}>
      <div style={css("padding:6px 18px 0;display:flex;align-items:center;justify-content:space-between")}>
        <button onClick={back} style={css("width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#10161800;color:#C6CFCB;font-size:18px;cursor:pointer")}>
          <i className="ph-bold ph-x" />
        </button>
        <div style={css("text-align:center")}>
          <div style={css("font:600 13px 'IBM Plex Sans';color:#fff")}>{clientName}</div>
          <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76")}>{routine?.name ?? "Sesión libre"}</div>
        </div>
        <div style={css("display:flex;align-items:center;gap:5px;font:700 13px 'Space Grotesk';color:var(--action);background:rgba(255,122,26,.12);padding:6px 10px;border-radius:10px")}>
          <span style={css("width:6px;height:6px;border-radius:50%;background:var(--action);animation:ccPulse 1.6s infinite")} />EN VIVO
        </div>
      </div>

      {/* Progress bar */}
      <div style={css("padding:10px 18px 0")}>
        <div style={css("height:4px;border-radius:3px;background:#1A2226;overflow:hidden")}>
          <div style={{ ...css("height:100%;border-radius:3px;background:linear-gradient(90deg,var(--data),var(--action));transition:width .4s ease"), width: `${donePct}%` }} />
        </div>
        <div style={css("display:flex;justify-content:space-between;margin-top:5px;font:500 10.5px 'JetBrains Mono';color:#5E6A66")}>
          <span>EJ. {exIdx + 1}/{exList.length}</span>
          <span>{donePct}% · {doneSetsCount}/{totalSets} series</span>
        </div>
      </div>

      <div className="cc-scroll" style={css("padding:14px 18px;flex:1;overflow-y:auto")}>
        {/* Exercise navigation */}
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:6px")}>
          <button onClick={() => setExIdx((i) => Math.max(0, i - 1))} disabled={exIdx === 0}
            style={{ ...css("width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12181A;color:#C6CFCB;cursor:pointer;font-size:14px"), opacity: exIdx === 0 ? 0.3 : 1 }}>
            <i className="ph-bold ph-caret-left" />
          </button>
          <span style={css("font:600 11px 'JetBrains Mono';color:#6E7A76")}>
            {exIdx < exList.length - 1 ? `Sgte: ${exList[exIdx + 1].exerciseName}` : "Último ejercicio"}
          </span>
          <button onClick={() => setExIdx((i) => Math.min(exList.length - 1, i + 1))} disabled={exIdx === exList.length - 1}
            style={{ ...css("width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12181A;color:#C6CFCB;cursor:pointer;font-size:14px"), opacity: exIdx === exList.length - 1 ? 0.3 : 1 }}>
            <i className="ph-bold ph-caret-right" />
          </button>
        </div>

        <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.5px;line-height:1.1")}>{cur.exerciseName}</div>
        <div style={css("font:600 12.5px 'JetBrains Mono';color:#8A938F;margin-top:7px;margin-bottom:16px")}>{metaParts}</div>

        {/* Sets */}
        <div style={css("display:flex;flex-direction:column;gap:9px;margin-bottom:16px")}>
          {setsForEx.map((s) => (
            <div key={s.key} onClick={() => toggleDoneSet(s.key)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDoneSet(s.key); } }}
              style={{ ...css("display:flex;align-items:center;gap:12px;border-radius:14px;padding:13px 14px;cursor:pointer"), background: s.done ? "rgba(56,224,123,.07)" : "#10171A", border: `1px solid ${s.done ? "rgba(56,224,123,.3)" : "rgba(255,255,255,.06)"}` }}>
              <span style={css("font:700 17px 'Space Grotesk';color:#fff;min-width:22px")}>{s.n}</span>
              <div style={css("flex:1")}>
                <div style={{ ...css("font:600 14px 'IBM Plex Sans'"), color: s.done ? DATA : "#C6CFCB" }}>
                  {cur.repsTarget ? cur.repsTarget + " reps" : cur.durationSec ? cur.durationSec + " seg." : "—"}
                  {cur.weightKg ? "  ·  " + cur.weightKg + " kg" : ""}
                </div>
              </div>
              <div style={{ ...css("width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex:none"), background: s.done ? DATA : "#0A0F11", border: `1px solid ${s.done ? DATA : "rgba(255,255,255,.1)"}` }}>
                <i className={s.done ? "ph-bold ph-check" : "ph ph-circle"} style={{ fontSize: 16, color: s.done ? "#06140C" : "#3A443F" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={css("background:#10171A;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:13px")}>
          <div style={css("display:flex;align-items:center;gap:6px;margin-bottom:10px")}>
            <i className="ph-fill ph-note-pencil" style={css("color:var(--action);font-size:15px")} />
            <span style={css("font:600 12.5px 'IBM Plex Sans';color:#E6ECEA")}>Notas de sesión</span>
          </div>
          {notesList.length > 0 && (
            <div style={css("display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px")}>
              {notesList.map((n, i) => (
                <span key={i} style={css("font:500 12px 'IBM Plex Sans';color:#D6DEDA;background:#1A2226;border:1px solid rgba(255,255,255,.06);padding:5px 9px;border-radius:8px")}>
                  {n}
                </span>
              ))}
            </div>
          )}
          <div style={css("display:flex;gap:8px")}>
            <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
              placeholder="Añadir nota…"
              style={css("flex:1;background:#0A0F11;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:0 11px;height:38px;color:#fff;outline:none;font:500 13px 'IBM Plex Sans'")} />
            <button onClick={addNote} style={css("width:38px;height:38px;border-radius:10px;border:none;background:var(--data);color:#06140C;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
              <i className="ph-fill ph-paper-plane-right" />
            </button>
          </div>
        </div>
      </div>

      <div style={css("position:sticky;bottom:0;padding:12px 18px 18px;background:linear-gradient(to top,#070B0C 70%,transparent);display:flex;gap:10px")}>
        <button onClick={toggleRest} style={{ ...css("flex:1;height:54px;border:none;border-radius:15px;font:700 15px 'Space Grotesk';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer"), background: restActive ? ACTION : "#171E21", color: restActive ? "#1a0c00" : "#E6ECEA" }}>
          <i className={restActive ? "ph-fill ph-pause" : "ph-fill ph-timer"} style={css("font-size:19px")} />
          {restActive ? fmt(rest) : "Descanso"}
        </button>
        {exIdx < exList.length - 1 ? (
          <button onClick={() => { setExIdx((i) => i + 1); if (restActive) toggleRest(); }}
            style={css("flex:none;width:54px;height:54px;border-radius:15px;border:none;background:var(--data);color:#06140C;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
            <i className="ph-bold ph-arrow-right" />
          </button>
        ) : (
          <button onClick={finish}
            style={css("flex:none;height:54px;padding:0 18px;border-radius:15px;border:none;background:var(--data);color:#06140C;font:700 14px 'IBM Plex Sans';cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px")}>
            <i className="ph-bold ph-check" />Finalizar
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================ ANALYTICS ============================ */
function Analytics() {
  const tVals = [12.4, 13.1, 12.8, 14.2, 13.9, 15.1, 14.8, 16.2];
  const tMax = Math.max(...tVals);
  const tonnageBars = tVals.map((v, i) => ({
    h: Math.round((v / tMax) * 100) + 6,
    label: "S" + (i + 1),
    fill: i === tVals.length - 1 ? DATA : "rgba(56,224,123,.28)",
  }));

  const rmVals = [120, 125, 127.5, 130, 135, 140];
  const rmMin = 115, rmMax = 145, W = 300, H = 110, PAD = 6;
  const pts = rmVals.map((v, i) => ({
    x: Math.round((i / (rmVals.length - 1)) * (W - PAD * 2) + PAD),
    y: Math.round(H - ((v - rmMin) / (rmMax - rmMin)) * (H - PAD * 2) - PAD),
  }));
  const linePoints = pts.map((p) => p.x + "," + p.y).join(" ");
  const areaPoints = pts[0].x + "," + H + " " + linePoints + " " + pts[pts.length - 1].x + "," + H;

  const measures = [
    { label: "Peso corporal", value: "78.4 kg", delta: "1.2 kg", arrow: "ph-bold ph-arrow-down" },
    { label: "% Grasa", value: "14.2 %", delta: "0.8", arrow: "ph-bold ph-arrow-down" },
    { label: "Cintura", value: "82 cm", delta: "1.5 cm", arrow: "ph-bold ph-arrow-down" },
    { label: "Sentadilla 1RM", value: "140 kg", delta: "5 kg", arrow: "ph-bold ph-arrow-up" },
  ];

  return (
    <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;text-transform:uppercase;letter-spacing:.3px")}>Progreso · Andrés Martínez</div>
      <div style={css("font:700 28px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin:2px 0 18px")}>Analítica</div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:16px;margin-bottom:14px")}>
        <div style={css("display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px")}>
          <div>
            <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76")}>Tonelaje semanal</div>
            <div style={css("font:700 24px 'Space Grotesk';color:#fff;margin-top:3px")}>16.2 <span style={css("font-size:14px;color:#6E7A76")}>t</span></div>
          </div>
          <span style={css("font:600 12px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:3px")}><i className="ph-bold ph-trend-up" />+9.4%</span>
        </div>
        <div style={css("display:flex;align-items:flex-end;gap:7px;height:108px")}>
          {tonnageBars.map((t, i) => (
            <div key={i} style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end")}>
              <div style={{ ...css("width:100%;border-radius:6px 6px 3px 3px"), background: t.fill, height: `${t.h}px` }} />
              <span style={css("font:500 9px 'JetBrains Mono';color:#5E6A66")}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:16px;margin-bottom:14px")}>
        <div style={css("display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px")}>
          <div>
            <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76")}>1RM estimado · Sentadilla</div>
            <div style={css("font:700 24px 'Space Grotesk';color:#fff;margin-top:3px")}>140 <span style={css("font-size:14px;color:#6E7A76")}>kg</span></div>
          </div>
          <span style={css("font:600 12px 'IBM Plex Sans';color:var(--data);display:flex;align-items:center;gap:3px")}><i className="ph-bold ph-trend-up" />+20 kg</span>
        </div>
        <svg viewBox="0 0 300 120" style={css("width:100%;height:120px;overflow:visible")}>
          <defs>
            <linearGradient id="ccGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--action)" stopOpacity=".28" />
              <stop offset="1" stopColor="var(--action)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={areaPoints} fill="url(#ccGrad)" stroke="none" />
          <polyline points={linePoints} fill="none" stroke="var(--action)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((dt, i) => (
            <circle key={i} cx={dt.x} cy={dt.y} r="3.5" fill="#070B0C" stroke="var(--action)" strokeWidth="2" />
          ))}
        </svg>
        <div style={css("display:flex;justify-content:space-between;margin-top:8px;font:500 9.5px 'JetBrains Mono';color:#5E6A66")}>
          <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
        </div>
      </div>

      <div style={css("font:600 14px 'Space Grotesk';color:#E6ECEA;margin:4px 0 11px")}>Medidas corporales</div>
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

/* ============================ SETTINGS ============================ */
function Settings({ onToast, user }: { onToast: (m: string) => void; user: { name: string; email: string } }) {
  return (
    <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("font:700 28px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin-bottom:16px")}>Ajustes</div>

      <div style={css("background:linear-gradient(135deg,#13231A,#0F1A14);border:1px solid rgba(56,224,123,.22);border-radius:18px;padding:16px;margin-bottom:18px;display:flex;gap:13px;align-items:flex-start")}>
        <i className="ph-fill ph-shield-check" style={css("color:var(--data);font-size:26px;flex:none")} />
        <div>
          <div style={css("font:700 15px 'Space Grotesk';color:#fff")}>Tus datos, tu propiedad</div>
          <div style={css("font:500 12.5px 'IBM Plex Sans';color:#9FB0A8;line-height:1.5;margin-top:4px")}>Almacenamiento local sin terceros. Sin suscripciones ni dependencias en la nube.</div>
        </div>
      </div>

      <AccountActions name={user.name} email={user.email} />

      <div style={css("text-align:center;font:500 11px 'JetBrains Mono';color:#465049;line-height:1.7;margin-top:22px")}>
        CoachCore v1.0<br />Cifrado · Ley 1581 · Datos en tu Postgres
      </div>
    </div>
  );
}

/* ============================ BOTTOM NAV ============================ */
const QUICK_ACTIONS = [
  { label: "Crear rutina",   icon: "ph-fill ph-barbell",    action: "builder" as const },
  { label: "Crear alumno",   icon: "ph-fill ph-user-plus",  action: "roster" as const },
];

function BottomNav({ screen, go, onToast }: { screen: Screen; go: (s: Screen) => void; onToast?: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const col = (s: Screen) => (screen === s ? DATA : "#54605A");

  return (
    <>
      {open && (
        <div onClick={() => setOpen(false)} style={css("position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.45);backdrop-filter:blur(2px)")} />
      )}
      {open && (
        <div style={css("position:fixed;bottom:90px;left:16px;right:16px;z-index:100;display:flex;flex-direction:column;gap:10px")}>
          {QUICK_ACTIONS.map(({ label, icon, action }) => (
            <button key={action} onClick={() => { setOpen(false); go(action); }}
              style={css("background:rgba(24,30,31,.97);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;text-align:left;box-shadow:0 8px 32px rgba(0,0,0,.5)")}>
              <span style={css("width:38px;height:38px;border-radius:10px;background:rgba(255,122,26,.12);display:flex;align-items:center;justify-content:center;flex:none")}>
                <i className={icon} style={{ fontSize: 20, color: ACTION }} />
              </span>
              <span style={css("font:600 15px 'IBM Plex Sans';color:#E8EDEA")}>{label}</span>
              <i className="ph ph-caret-right" style={{ fontSize: 14, color: MUTED, marginLeft: "auto" }} />
            </button>
          ))}
        </div>
      )}
      <div style={css("flex:none;height:78px;background:rgba(10,14,15,.92);border-top:1px solid rgba(255,255,255,.06);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:space-around;padding:0 8px 14px;position:relative;z-index:100")}>
        <button onClick={() => { setOpen(false); go("dashboard"); }} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
          <i className="ph-fill ph-house" style={{ fontSize: 22, color: col("dashboard") }} />
          <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("dashboard") }}>Hoy</span>
        </button>
        <button onClick={() => { setOpen(false); go("roster"); }} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
          <i className="ph-fill ph-users-three" style={{ fontSize: 22, color: col("roster") }} />
          <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("roster") }}>Clientes</span>
        </button>
        <button onClick={() => setOpen((v) => !v)} aria-label="Crear" style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex:1")}>
          <span style={css("width:44px;height:34px;border-radius:12px;background:var(--action);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(255,122,26,.35)")}>
            <i className={open ? "ph-bold ph-x" : "ph-bold ph-plus"} style={css("font-size:20px;color:#1a0c00")} />
          </span>
        </button>
        <button onClick={() => { setOpen(false); go("analytics"); }} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
          <i className="ph-fill ph-chart-line-up" style={{ fontSize: 22, color: col("analytics") }} />
          <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("analytics") }}>Progreso</span>
        </button>
        <button onClick={() => { setOpen(false); go("settings"); }} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
          <i className="ph-fill ph-gear-six" style={{ fontSize: 22, color: col("settings") }} />
          <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("settings") }}>Ajustes</span>
        </button>
      </div>
    </>
  );
}
