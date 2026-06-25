"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { css } from "@/lib/css";
import { PhoneFrame, StatusBar, Toast } from "@/components/Frame";
import { AccountActions } from "@/components/AccountActions";
import { MachineInventory } from "@/components/Machines";
import { machines, MachineIllo } from "@/lib/machines";
import { DATA, ACTION, MUTED, clients, byId, rawSessions, fmt, presentClient, type RawClient, type PresentedClient } from "./data";
import { createClient, deleteClient, seedDemoClients } from "@/app/actions/data";

type Screen = "dashboard" | "roster" | "builder" | "live" | "analytics" | "settings" | "machines";

export default function CoachApp({ user, initialClients }: { user: { name: string; email: string }; initialClients: RawClient[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const roster: PresentedClient[] = initialClients.map(presentClient);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState<number | null>(null);
  const [liveId, setLiveId] = useState<number>(1);
  const [rest, setRest] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [doneSets, setDoneSets] = useState<Record<number, boolean>>({ 1: true, 2: true });
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const go = (s: Screen) => { setScreen(s); setProfileId(null); };
  const startSession = (id: number) => { setLiveId(id); setProfileId(null); setScreen("live"); };
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

  const U = "kg";

  return (
    <PhoneFrame>
      <StatusBar />
      <Toast msg={toast} />

      <div className="cc-scroll" style={css("flex:1;overflow-y:auto;position:relative;background:#0A0E0F")}>
        {screen === "dashboard" && <Dashboard onStart={startSession} onMachines={() => setScreen("machines")} />}
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
            onStartSession={() => startSession(1)}
            onSeed={seedRoster}
            onAdd={addClient}
            onDelete={removeClient}
          />
        )}
        {screen === "builder" && <Builder onToast={showToast} />}
        {screen === "live" && (
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
      </div>

      {screen !== "live" && <BottomNav screen={screen} go={go} />}
    </PhoneFrame>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ onStart, onMachines }: { onStart: (id: number) => void; onMachines: () => void }) {
  const maintenance = machines.filter((m) => m.status === "mantenimiento").length;
  const previewIllos = ["leg-press", "lat-pulldown", "smith", "rower"];
  const days = [
    ["lun", "23"], ["mar", "24"], ["mié", "25"], ["jue", "26"], ["vie", "27"], ["sáb", "28"], ["dom", "29"],
  ].map((d, i) => {
    const active = i === 1;
    return {
      dow: d[0], num: d[1],
      bg: active ? DATA : "#12181A",
      border: active ? DATA : "rgba(255,255,255,.05)",
      fg: active ? "#06140C" : "#E6ECEA",
      sub: active ? "rgba(6,20,12,.7)" : "#6E7A76",
      dot: active ? "#06140C" : i < 1 ? MUTED : "transparent",
    };
  });

  const summary = [
    { icon: "ph-fill ph-users-three", value: "24", label: "Clientes activos", col: DATA },
    { icon: "ph-fill ph-check-circle", value: "18", label: "Completadas (sem.)", col: DATA },
    { icon: "ph-fill ph-calendar-check", value: "5", label: "Sesiones hoy", col: ACTION },
    { icon: "ph-fill ph-trend-up", value: "92%", label: "Adherencia media", col: ACTION },
  ];

  const sessions = rawSessions.map((s) => {
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
          <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;letter-spacing:.3px;text-transform:uppercase")}>Martes · 24 Jun</div>
          <div style={css("font:700 30px 'Space Grotesk';color:#fff;letter-spacing:-.6px;margin-top:2px")}>Hoy</div>
        </div>
        <div style={css("width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#1d2528,#11171a);display:flex;align-items:center;justify-content:center;font:700 14px 'Space Grotesk';color:var(--data);border:1px solid rgba(255,255,255,.07)")}>CC</div>
      </div>

      <div className="cc-scroll" style={css("display:flex;gap:8px;overflow-x:auto;margin:0 -18px 20px;padding:2px 18px")}>
        {days.map((d, i) => (
          <div key={i} style={{ ...css("flex:none;width:48px;height:62px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px"), background: d.bg, border: `1px solid ${d.border}` }}>
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
        <div style={css("font:600 16px 'Space Grotesk';color:#E6ECEA")}>Sesiones de hoy</div>
        <div style={css("font:600 12px 'IBM Plex Sans';color:#6E7A76;background:#12181A;padding:3px 9px;border-radius:20px")}>5 agendadas</div>
      </div>

      {sessions.map((se, i) => (
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
              {se.btnLabel}
              <i className="ph-bold ph-caret-right" style={css("font-size:12px")} />
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
}: {
  clients: PresentedClient[];
  query: string;
  onSearch: (v: string) => void;
  onOpen: (id: number) => void;
  profileId: number | null;
  onClose: () => void;
  onStats: () => void;
  onStartSession: (id: number) => void;
  onSeed: () => void;
  onAdd: (fd: FormData) => void;
  onDelete: (realId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const list = roster.filter((c) => !q || c.name.toLowerCase().includes(q) || c.goal.toLowerCase().includes(q));
  const p = roster.find((c) => c.id === profileId);

  return (
    <>
      <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:4px")}>
          <div style={css("font:700 30px 'Space Grotesk';color:#fff;letter-spacing:-.6px")}>Clientes</div>
          <button onClick={() => setAdding((v) => !v)} style={css("width:40px;height:40px;border-radius:12px;border:none;background:var(--action);color:#1a0c00;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center")}>
            <i className={adding ? "ph-bold ph-x" : "ph-bold ph-plus"} />
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
              <div style={css("font:600 15px 'IBM Plex Sans';color:#fff")}>{c.name}</div>
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
          <div className="cc-scroll" style={css("position:absolute;left:0;right:0;bottom:0;z-index:51;background:#0E1416;border-radius:28px 28px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:14px 18px 26px;max-height:88%;overflow-y:auto;animation:ccSlide .4s cubic-bezier(.2,.8,.2,1)")}>
            <div style={css("width:38px;height:4px;border-radius:3px;background:#2A3338;margin:0 auto 18px")} />
            <div style={css("display:flex;align-items:center;gap:14px;margin-bottom:18px")}>
              <div style={{ ...css("width:62px;height:62px;border-radius:18px;flex:none;display:flex;align-items:center;justify-content:center;font:700 20px 'Space Grotesk';color:#E6ECEA"), background: p.bg }}>{p.initials}</div>
              <div style={css("flex:1")}>
                <div style={css("font:700 21px 'Space Grotesk';color:#fff;letter-spacing:-.3px")}>{p.name}</div>
                <div style={css("font:500 13px 'IBM Plex Sans';color:#6E7A76;margin-top:2px")}>{p.level} · {p.age}</div>
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
              <button onClick={() => onStartSession(p.id)} style={css("flex:none;width:50px;height:50px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#171E21;color:var(--action);font-size:20px;cursor:pointer")}>
                <i className="ph-fill ph-play" />
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
type BuilderExercise = { name: string; scheme: string; rpe: string; rm: string; rest: string; sup: string; machineId?: string };

const routineBlocks: { name: string; tag: string; color: string; tagBg: string; wrapBorder: string; supWrap: string; exercises: BuilderExercise[] }[] = [
  {
    name: "Calentamiento", tag: "WARM-UP", color: "#5AA9FF", tagBg: "rgba(90,169,255,.12)", wrapBorder: "rgba(255,255,255,.05)", supWrap: "",
    exercises: [
      { name: "Movilidad de cadera", scheme: "2 × 10", rpe: "—", rm: "—", rest: "45s", sup: "" },
      { name: "Face pull", scheme: "3 × 15", rpe: "6", rm: "—", rest: "45s", sup: "", machineId: "cable-station" },
    ],
  },
  {
    name: "Fuerza principal", tag: "FUERZA", color: ACTION, tagBg: "rgba(255,122,26,.12)", wrapBorder: "rgba(255,255,255,.05)", supWrap: "",
    exercises: [
      { name: "Sentadilla trasera", scheme: "5 × 5", rpe: "8", rm: "82.5%", rest: "180s", sup: "", machineId: "power-rack" },
      { name: "Press de banca", scheme: "5 × 5", rpe: "8", rm: "80%", rest: "180s", sup: "", machineId: "bench-flat" },
    ],
  },
  {
    name: "Accesorios", tag: "ACCESORIO", color: DATA, tagBg: "rgba(56,224,123,.12)", wrapBorder: "rgba(56,224,123,.25)", supWrap: "box-shadow:inset 2px 0 0 " + DATA,
    exercises: [
      { name: "Zancadas con mancuerna", scheme: "3 × 12", rpe: "8", rm: "—", rest: "90s", sup: "A1" },
      { name: "Curl femoral tumbado", scheme: "3 × 12", rpe: "8", rm: "—", rest: "90s", sup: "A2", machineId: "leg-curl" },
      { name: "Plancha", scheme: "3 × 45s", rpe: "7", rm: "—", rest: "60s", sup: "" },
    ],
  },
];

// Coach view: which prescribed exercises target this machine, with their scheme.
const coachHistoryFor = (machineId: string) =>
  routineBlocks.flatMap((b) =>
    b.exercises
      .filter((e) => e.machineId === machineId)
      .map((e) => ({ when: e.name, val: e.scheme + (e.rm !== "—" ? " · " + e.rm + " RM" : "") })),
  );

function Builder({ onToast }: { onToast: (m: string) => void }) {
  const blocks = routineBlocks;

  return (
    <div style={css("padding:8px 18px 110px;animation:ccUp .45s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px")}>
        <div>
          <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;text-transform:uppercase;letter-spacing:.3px")}>Nueva rutina</div>
          <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.5px;margin-top:2px")}>Fuerza · Día A</div>
        </div>
        <div style={css("width:40px;height:40px;border-radius:12px;background:#171E21;display:flex;align-items:center;justify-content:center")}>
          <i className="ph ph-floppy-disk" style={css("color:var(--data);font-size:19px")} />
        </div>
      </div>
      <div style={css("display:flex;gap:14px;margin-bottom:18px;font:500 12px 'IBM Plex Sans';color:#6E7A76")}>
        <span style={css("display:flex;align-items:center;gap:5px")}><i className="ph ph-barbell" />7 ejercicios</span>
        <span style={css("display:flex;align-items:center;gap:5px")}><i className="ph ph-clock" />~62 min</span>
        <span style={css("display:flex;align-items:center;gap:5px")}><i className="ph ph-stack" />3 bloques</span>
      </div>

      {blocks.map((b, bi) => (
        <div key={bi} style={css("margin-bottom:16px")}>
          <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:9px")}>
            <span style={{ ...css("width:4px;height:16px;border-radius:3px"), background: b.color }} />
            <span style={css("font:600 14px 'Space Grotesk';color:#E6ECEA")}>{b.name}</span>
            <span style={{ ...css("font:600 9.5px 'JetBrains Mono';padding:2px 6px;border-radius:5px;letter-spacing:.5px"), color: b.color, background: b.tagBg }}>{b.tag}</span>
          </div>
          <div style={{ ...css("background:#10161800;border-radius:16px;overflow:hidden"), border: `1px solid ${b.wrapBorder}`, ...(b.supWrap ? css(b.supWrap) : {}) }}>
            {b.exercises.map((ex, ei) => (
              <div key={ei} style={css("padding:12px 13px;background:#12181A;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:11px")}>
                {ex.sup && <span style={{ ...css("font:700 10px 'JetBrains Mono';width:20px;flex:none"), color: b.color }}>{ex.sup}</span>}
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("font:600 14px 'IBM Plex Sans';color:#fff")}>{ex.name}</div>
                  <div style={css("display:flex;gap:10px;margin-top:6px;flex-wrap:wrap")}>
                    <span style={css("font:600 11px 'JetBrains Mono';color:#C6CFCB")}>{ex.scheme}</span>
                    <span style={css("font:500 11px 'JetBrains Mono';color:#6E7A76")}>RPE {ex.rpe}</span>
                    <span style={css("font:500 11px 'JetBrains Mono';color:#6E7A76")}>{ex.rm} RM</span>
                    <span style={css("font:500 11px 'JetBrains Mono';color:#6E7A76;display:flex;align-items:center;gap:3px")}><i className="ph ph-timer" style={css("font-size:12px")} />{ex.rest}</span>
                  </div>
                </div>
                <i className="ph ph-dots-six-vertical" style={css("color:#3A443F;font-size:18px;flex:none")} />
              </div>
            ))}
          </div>
          <button onClick={() => onToast("Ejercicio añadido")} style={css("width:100%;margin-top:8px;height:40px;border:1px dashed rgba(255,255,255,.12);border-radius:12px;background:none;color:#8A938F;font:600 12.5px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer")}>
            <i className="ph ph-plus" />Añadir ejercicio
          </button>
        </div>
      ))}

      <div style={css("display:flex;gap:10px;margin-top:6px")}>
        <button onClick={() => onToast("Superserie añadida")} style={css("flex:1;height:46px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#12181A;color:#E6ECEA;font:600 13px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer")}>
          <i className="ph ph-link" style={css("color:var(--action)")} />Superserie
        </button>
        <button onClick={() => onToast("Bloque añadido")} style={css("flex:1;height:46px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#12181A;color:#E6ECEA;font:600 13px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer")}>
          <i className="ph ph-plus-square" style={css("color:var(--data)")} />Bloque
        </button>
      </div>
    </div>
  );
}

/* ============================ LIVE SESSION ============================ */
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
              <div key={s.n} onClick={() => toggleSet(s.n)} style={{ ...css("display:grid;grid-template-columns:34px 1fr 1fr 44px;gap:8px;align-items:center;border-radius:14px;padding:11px 10px;cursor:pointer"), background: done ? "rgba(56,224,123,.07)" : "#10171A", border: `1px solid ${done ? "rgba(56,224,123,.3)" : "rgba(255,255,255,.06)"}` }}>
                <span style={css("font:700 15px 'Space Grotesk';color:#fff;text-align:center")}>{s.n}</span>
                <span style={css("font:500 12px 'JetBrains Mono';color:#6E7A76;line-height:1.3")}>{s.prevW + U + " × " + s.prevR + " · RPE" + s.rpe}</span>
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
      <div style={css("font:500 12px 'IBM Plex Sans';color:#6E7A76;text-transform:uppercase;letter-spacing:.3px")}>Progreso · Marcos Vidal</div>
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
              <div style={{ ...css("width:100%;border-radius:6px 6px 3px 3px;transition:height .5s ease"), background: t.fill, height: `${t.h}px` }} />
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

      <div style={css("font:600 11px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase;margin-bottom:9px")}>Almacenamiento</div>
      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:14px;margin-bottom:18px")}>
        <div style={css("display:flex;align-items:center;gap:11px")}>
          <div style={css("width:42px;height:42px;border-radius:12px;background:#1A2226;display:flex;align-items:center;justify-content:center")}>
            <i className="ph-fill ph-device-mobile" style={css("color:var(--data);font-size:20px")} />
          </div>
          <div style={css("flex:1")}>
            <div style={css("font:600 14px 'IBM Plex Sans';color:#fff")}>Este dispositivo · Local</div>
            <div style={css("font:500 11.5px 'JetBrains Mono';color:#6E7A76;margin-top:2px")}>2.4 MB · 6 clientes · 142 sesiones</div>
          </div>
          <span style={css("font:600 11px 'IBM Plex Sans';color:var(--data);background:rgba(56,224,123,.12);padding:4px 9px;border-radius:8px")}>Activo</span>
        </div>
      </div>

      <div style={css("font:600 11px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase;margin-bottom:9px")}>Exportar base de datos</div>
      <div style={css("display:flex;gap:10px;margin-bottom:18px")}>
        <button onClick={() => onToast("Base de datos exportada a CSV")} style={css("flex:1;height:62px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:#12181A;color:#E6ECEA;font:600 13px 'IBM Plex Sans';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer")}>
          <i className="ph ph-file-csv" style={css("font-size:22px;color:var(--data)")} />Exportar CSV
        </button>
        <button onClick={() => onToast("Base de datos exportada a JSON")} style={css("flex:1;height:62px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:#12181A;color:#E6ECEA;font:600 13px 'IBM Plex Sans';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer")}>
          <i className="ph ph-brackets-curly" style={css("font-size:22px;color:var(--action)")} />Exportar JSON
        </button>
      </div>

      <div style={css("font:600 11px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase;margin-bottom:9px")}>Servidor local autoalojado</div>
      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:14px;margin-bottom:18px")}>
        <div style={css("display:flex;align-items:center;gap:9px;background:#0A0F11;border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:0 12px;height:44px;margin-bottom:11px")}>
          <i className="ph ph-globe-simple" style={css("color:#6E7A76;font-size:17px")} />
          <input defaultValue="http://192.168.1.20:5000" style={css("flex:1;background:none;border:none;outline:none;color:#C6CFCB;font:500 12.5px 'JetBrains Mono'")} />
        </div>
        <div style={css("display:flex;align-items:center;justify-content:space-between")}>
          <span style={css("font:500 11.5px 'IBM Plex Sans';color:#6E7A76")}>Última sinc.: hoy 08:12</span>
          <button onClick={() => onToast("Sincronizado con servidor local")} style={css("height:40px;padding:0 16px;border:none;border-radius:11px;background:var(--data);color:#06140C;font:700 13px 'IBM Plex Sans';display:flex;align-items:center;gap:6px;cursor:pointer")}>
            <i className="ph-bold ph-arrows-clockwise" />Sincronizar
          </button>
        </div>
      </div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:12px")}>
        <i className="ph ph-clock-counter-clockwise" style={css("color:#8A938F;font-size:20px")} />
        <div style={css("flex:1")}>
          <div style={css("font:600 13.5px 'IBM Plex Sans';color:#fff")}>Copia de seguridad automática</div>
          <div style={css("font:500 11px 'IBM Plex Sans';color:#6E7A76;margin-top:1px")}>Diaria · local</div>
        </div>
        <div style={css("width:46px;height:27px;border-radius:14px;background:var(--data);position:relative")}>
          <span style={css("position:absolute;top:2.5px;right:2.5px;width:22px;height:22px;border-radius:50%;background:#06140C")} />
        </div>
      </div>

      <AccountActions name={user.name} email={user.email} />

      <div style={css("text-align:center;font:500 11px 'JetBrains Mono';color:#465049;line-height:1.7;margin-top:22px")}>
        CoachCore v1.0<br />Cifrado · RGPD · Datos en tu Postgres
      </div>
    </div>
  );
}

/* ============================ BOTTOM NAV ============================ */
function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const col = (s: Screen) => (screen === s ? DATA : "#54605A");
  return (
    <div style={css("flex:none;height:78px;background:rgba(10,14,15,.92);border-top:1px solid rgba(255,255,255,.06);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:space-around;padding:0 8px 14px")}>
      <button onClick={() => go("dashboard")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-house" style={{ fontSize: 22, color: col("dashboard") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("dashboard") }}>Hoy</span>
      </button>
      <button onClick={() => go("roster")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-users-three" style={{ fontSize: 22, color: col("roster") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("roster") }}>Clientes</span>
      </button>
      <button onClick={() => go("builder")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex:1")}>
        <span style={css("width:44px;height:34px;border-radius:12px;background:var(--action);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(255,122,26,.35)")}>
          <i className="ph-bold ph-plus" style={css("font-size:20px;color:#1a0c00")} />
        </span>
      </button>
      <button onClick={() => go("analytics")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-chart-line-up" style={{ fontSize: 22, color: col("analytics") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("analytics") }}>Progreso</span>
      </button>
      <button onClick={() => go("settings")} style={css("background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1")}>
        <i className="ph-fill ph-gear-six" style={{ fontSize: 22, color: col("settings") }} />
        <span style={{ ...css("font:600 9.5px 'IBM Plex Sans'"), color: col("settings") }}>Ajustes</span>
      </button>
    </div>
  );
}
