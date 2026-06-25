// Static seed data for the Coach app. Local-first: in a shipped PWA this would
// live in IndexedDB; here it mirrors the design's sample roster 1:1.

export const DATA = "#38E07B";
export const ACTION = "#FF7A1A";
export const MUTED = "#54605A";

export type Client = {
  id: number;
  name: string;
  initials: string;
  goal: string;
  goalIcon: string;
  goalCol: string;
  goalBg: string;
  level: string;
  age: string;
  status: string;
  statusCol: string;
  injuries: string;
  bg: string;
  s1: string;
  s2: string;
  s3: string;
};

export const clients: Client[] = [
  { id: 1, name: "Marcos Vidal", initials: "MV", goal: "Hipertrofia", goalIcon: "ph ph-arrows-out-line-vertical", goalCol: "#38E07B", goalBg: "rgba(56,224,123,.12)", level: "Avanzado", age: "32 años", status: "Activo", statusCol: DATA, injuries: "Sin lesiones activas. Molestia lumbar leve resuelta (mar. 2026).", bg: "linear-gradient(135deg,#1f3d2a,#16291d)", s1: "142", s2: "94%", s3: "3" },
  { id: 2, name: "Laura Pérez", initials: "LP", goal: "Pérdida de grasa", goalIcon: "ph ph-fire", goalCol: "#FF7A1A", goalBg: "rgba(255,122,26,.12)", level: "Intermedio", age: "28 años", status: "Activo", statusCol: DATA, injuries: "Sin lesiones registradas.", bg: "linear-gradient(135deg,#3d2a1f,#291d16)", s1: "88", s2: "90%", s3: "1" },
  { id: 3, name: "Diego Sánchez", initials: "DS", goal: "Fuerza", goalIcon: "ph ph-barbell", goalCol: "#5AA9FF", goalBg: "rgba(90,169,255,.12)", level: "Avanzado", age: "35 años", status: "Descanso", statusCol: MUTED, injuries: "Hombro izq. — tendinitis manguito rotador (en seguimiento).", bg: "linear-gradient(135deg,#23303d,#19232d)", s1: "210", s2: "88%", s3: "0" },
  { id: 4, name: "Ana Torres", initials: "AT", goal: "Hipertrofia", goalIcon: "ph ph-arrows-out-line-vertical", goalCol: "#38E07B", goalBg: "rgba(56,224,123,.12)", level: "Principiante", age: "24 años", status: "Activo", statusCol: DATA, injuries: "Sin lesiones registradas.", bg: "linear-gradient(135deg,#2e2440,#211a30)", s1: "34", s2: "97%", s3: "2" },
  { id: 5, name: "Javier Ruiz", initials: "JR", goal: "Rehabilitación", goalIcon: "ph ph-bandaids", goalCol: "#FF6B8A", goalBg: "rgba(255,107,138,.12)", level: "Intermedio", age: "41 años", status: "Activo", statusCol: DATA, injuries: "Rodilla der. — reconstrucción LCA (feb. 2026). Fase de fortalecimiento.", bg: "linear-gradient(135deg,#3d2330,#2c1a23)", s1: "56", s2: "92%", s3: "0" },
  { id: 6, name: "Sofía Gómez", initials: "SG", goal: "Fuerza", goalIcon: "ph ph-barbell", goalCol: "#5AA9FF", goalBg: "rgba(90,169,255,.12)", level: "Avanzado", age: "29 años", status: "Activo", statusCol: DATA, injuries: "Sin lesiones registradas.", bg: "linear-gradient(135deg,#1f3a3d,#16292c)", s1: "176", s2: "95%", s3: "4" },
];

export const byId = (id: number | null) => clients.find((c) => c.id === id);

export const rawSessions = [
  { time: "07:00", id: 2, type: "HIIT + core", state: "done" },
  { time: "09:30", id: 1, type: "Fuerza tren superior", state: "now" },
  { time: "12:00", id: 5, type: "Rehab rodilla", state: "next" },
  { time: "17:30", id: 6, type: "Fuerza tren inferior", state: "next" },
  { time: "19:00", id: 4, type: "Hipertrofia full body", state: "next" },
];

export const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + String(r).padStart(2, "0");
};
