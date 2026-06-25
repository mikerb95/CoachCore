// Shared gym-machine catalog + flat SVG illustrations, used by both the coach
// and client apps. Local-first: in a shipped PWA this would live in IndexedDB;
// here it mirrors the gym's real equipment list 1:1. Illustrations follow the
// site's flat green style (see public/icon.svg).
import type { ReactNode } from "react";

const G = "#38E07B"; // --data

export type MachineCategory =
  | "cardio"
  | "tren-inferior"
  | "tren-superior"
  | "core"
  | "poleas";

export type MachineStatus = "libre" | "ocupada" | "mantenimiento";

export type Machine = {
  id: string;
  name: string;
  category: MachineCategory;
  muscle: string;
  status: MachineStatus;
  uses30d: number; // usage/occupancy over the last 30 days
};

export const CATEGORIES: { key: MachineCategory; label: string }[] = [
  { key: "cardio", label: "Cardio" },
  { key: "tren-inferior", label: "Inferior" },
  { key: "tren-superior", label: "Superior" },
  { key: "core", label: "Core" },
  { key: "poleas", label: "Poleas" },
];

export const machines: Machine[] = [
  // Cardio
  { id: "treadmill", name: "Caminadora", category: "cardio", muscle: "Cardiovascular", status: "ocupada", uses30d: 132 },
  { id: "elliptical", name: "Elíptica", category: "cardio", muscle: "Cardiovascular · cuerpo completo", status: "libre", uses30d: 88 },
  { id: "bike", name: "Bicicleta estática", category: "cardio", muscle: "Cardiovascular · piernas", status: "libre", uses30d: 74 },
  { id: "spin-bike", name: "Bicicleta de spinning", category: "cardio", muscle: "Cardiovascular · piernas", status: "ocupada", uses30d: 96 },
  { id: "stair", name: "Simulador de escaleras", category: "cardio", muscle: "Glúteo · cuádriceps", status: "libre", uses30d: 41 },
  { id: "rower", name: "Máquina de remo", category: "cardio", muscle: "Espalda · piernas · core", status: "libre", uses30d: 53 },

  // Tren inferior
  { id: "leg-press", name: "Prensa de piernas", category: "tren-inferior", muscle: "Cuádriceps · glúteo", status: "ocupada", uses30d: 118 },
  { id: "leg-extension", name: "Extensión de piernas", category: "tren-inferior", muscle: "Cuádriceps", status: "libre", uses30d: 84 },
  { id: "leg-curl", name: "Curl de piernas", category: "tren-inferior", muscle: "Isquiotibiales", status: "libre", uses30d: 79 },
  { id: "hack-squat", name: "Sentadilla Hack", category: "tren-inferior", muscle: "Cuádriceps · glúteo", status: "libre", uses30d: 47 },
  { id: "smith", name: "Máquina Smith", category: "tren-inferior", muscle: "Cuerpo completo", status: "ocupada", uses30d: 102 },
  { id: "power-rack", name: "Jaula de sentadillas", category: "tren-inferior", muscle: "Cuerpo completo", status: "libre", uses30d: 91 },
  { id: "abductor", name: "Abductores", category: "tren-inferior", muscle: "Glúteo medio", status: "libre", uses30d: 62 },
  { id: "adductor", name: "Aductores", category: "tren-inferior", muscle: "Aductores", status: "libre", uses30d: 58 },
  { id: "hip-thrust", name: "Empuje de cadera", category: "tren-inferior", muscle: "Glúteo mayor", status: "mantenimiento", uses30d: 70 },
  { id: "calf", name: "Pantorrillas", category: "tren-inferior", muscle: "Gemelos · sóleo", status: "libre", uses30d: 44 },
  { id: "glute-kickback", name: "Patada de glúteo", category: "tren-inferior", muscle: "Glúteo mayor", status: "libre", uses30d: 36 },

  // Tren superior
  { id: "chest-press", name: "Press de pecho", category: "tren-superior", muscle: "Pectoral · tríceps", status: "ocupada", uses30d: 110 },
  { id: "pec-deck", name: "Aperturas de pecho", category: "tren-superior", muscle: "Pectoral", status: "libre", uses30d: 67 },
  { id: "lat-pulldown", name: "Polea alta (Lat Pulldown)", category: "tren-superior", muscle: "Dorsal · bíceps", status: "ocupada", uses30d: 124 },
  { id: "low-row", name: "Remo en polea baja", category: "tren-superior", muscle: "Espalda media · bíceps", status: "libre", uses30d: 95 },
  { id: "chest-row", name: "Remo articulado", category: "tren-superior", muscle: "Espalda · trapecio", status: "libre", uses30d: 72 },
  { id: "shoulder-press", name: "Press de hombros", category: "tren-superior", muscle: "Deltoides · tríceps", status: "libre", uses30d: 81 },
  { id: "lateral-raise", name: "Elevaciones laterales", category: "tren-superior", muscle: "Deltoides lateral", status: "libre", uses30d: 49 },
  { id: "triceps", name: "Extensiones de tríceps", category: "tren-superior", muscle: "Tríceps", status: "libre", uses30d: 64 },
  { id: "biceps-curl", name: "Curl de bíceps (predicador)", category: "tren-superior", muscle: "Bíceps", status: "libre", uses30d: 60 },

  // Core
  { id: "ab-crunch", name: "Crunch abdominal", category: "core", muscle: "Recto abdominal", status: "libre", uses30d: 55 },
  { id: "torso-rotation", name: "Rotación de torso", category: "core", muscle: "Oblicuos", status: "libre", uses30d: 38 },
  { id: "back-extension", name: "Extensiones lumbares", category: "core", muscle: "Lumbar · glúteo", status: "libre", uses30d: 42 },

  // Poleas y estructuras
  { id: "crossover", name: "Poleas cruzadas (Crossover)", category: "poleas", muscle: "Pectoral · multiarticular", status: "ocupada", uses30d: 87 },
  { id: "cable-station", name: "Estación de poleas", category: "poleas", muscle: "Multiarticular", status: "libre", uses30d: 78 },
  { id: "bench-flat", name: "Banco plano", category: "poleas", muscle: "Soporte · pectoral", status: "libre", uses30d: 90 },
  { id: "bench-incline", name: "Banco inclinado", category: "poleas", muscle: "Soporte · pectoral alto", status: "libre", uses30d: 65 },
  { id: "bench-decline", name: "Banco declinado", category: "poleas", muscle: "Soporte · pectoral bajo", status: "libre", uses30d: 31 },
  { id: "bench-adjustable", name: "Banco ajustable", category: "poleas", muscle: "Soporte · multiposición", status: "libre", uses30d: 76 },
  { id: "pullup-dip", name: "Dominadas y fondos", category: "poleas", muscle: "Espalda · pecho · tríceps", status: "libre", uses30d: 69 },
];

export const machineById = (id: string) => machines.find((m) => m.id === id);

/* ============================ ILLUSTRATIONS ============================ */
// Flat green silhouettes on a 120×120 grid, same vocabulary as public/icon.svg.

const illos: Record<string, ReactNode> = {
  treadmill: (
    <>
      <rect x="14" y="74" width="74" height="12" rx="6" fill={G} />
      <rect x="80" y="34" width="9" height="44" rx="4" fill={G} />
      <rect x="70" y="32" width="28" height="9" rx="4" fill={G} opacity=".55" />
      <rect x="20" y="88" width="60" height="6" rx="3" fill={G} opacity=".4" />
    </>
  ),
  elliptical: (
    <>
      <circle cx="44" cy="62" r="20" fill="none" stroke={G} strokeWidth="6" />
      <rect x="62" y="38" width="8" height="52" rx="4" fill={G} />
      <rect x="40" y="86" width="48" height="7" rx="3" fill={G} opacity=".5" />
      <line x1="66" y1="44" x2="40" y2="72" stroke={G} strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  bike: (
    <>
      <circle cx="42" cy="74" r="18" fill="none" stroke={G} strokeWidth="6" />
      <rect x="38" y="36" width="9" height="26" rx="4" fill={G} />
      <rect x="28" y="32" width="26" height="8" rx="4" fill={G} />
      <rect x="64" y="34" width="9" height="40" rx="4" fill={G} />
      <rect x="60" y="30" width="22" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "spin-bike": (
    <>
      <circle cx="44" cy="72" r="20" fill={G} opacity=".22" />
      <circle cx="44" cy="72" r="20" fill="none" stroke={G} strokeWidth="6" />
      <rect x="40" y="32" width="9" height="30" rx="4" fill={G} />
      <rect x="30" y="28" width="26" height="8" rx="4" fill={G} />
      <rect x="66" y="40" width="9" height="34" rx="4" fill={G} />
      <rect x="62" y="36" width="20" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  stair: (
    <>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={20 + i * 16} y={84 - i * 16} width="18" height="10" rx="3" fill={G} opacity={1 - i * 0.16} />
      ))}
      <rect x="88" y="18" width="9" height="66" rx="4" fill={G} />
    </>
  ),
  rower: (
    <>
      <rect x="16" y="62" width="80" height="7" rx="3" fill={G} />
      <rect x="44" y="52" width="20" height="11" rx="5" fill={G} />
      <circle cx="24" cy="54" r="12" fill="none" stroke={G} strokeWidth="6" />
      <rect x="80" y="44" width="16" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "leg-press": (
    <>
      <rect x="16" y="68" width="40" height="12" rx="6" fill={G} />
      <rect x="20" y="44" width="10" height="26" rx="5" fill={G} />
      <rect x="70" y="28" width="26" height="46" rx="10" fill={G} opacity=".55" />
      <line x1="56" y1="74" x2="74" y2="52" stroke={G} strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  "leg-extension": (
    <>
      <rect x="30" y="56" width="40" height="12" rx="6" fill={G} />
      <rect x="32" y="34" width="10" height="24" rx="5" fill={G} />
      <rect x="72" y="74" width="20" height="9" rx="4" fill={G} opacity=".7" />
      <line x1="68" y1="62" x2="82" y2="76" stroke={G} strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  "leg-curl": (
    <>
      <rect x="22" y="58" width="60" height="12" rx="6" fill={G} />
      <rect x="76" y="44" width="18" height="9" rx="4" fill={G} opacity=".7" />
      <rect x="78" y="72" width="16" height="9" rx="4" fill={G} opacity=".5" />
      <rect x="28" y="70" width="8" height="20" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "hack-squat": (
    <>
      <line x1="34" y1="86" x2="74" y2="30" stroke={G} strokeWidth="10" strokeLinecap="round" />
      <rect x="24" y="84" width="44" height="10" rx="5" fill={G} />
      <rect x="70" y="26" width="18" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  smith: (
    <>
      <rect x="32" y="20" width="8" height="80" rx="4" fill={G} />
      <rect x="80" y="20" width="8" height="80" rx="4" fill={G} />
      <rect x="28" y="50" width="64" height="9" rx="4" fill={G} />
    </>
  ),
  "power-rack": (
    <>
      <rect x="26" y="20" width="9" height="80" rx="4" fill={G} />
      <rect x="85" y="20" width="9" height="80" rx="4" fill={G} />
      <rect x="26" y="22" width="68" height="8" rx="4" fill={G} />
      <rect x="22" y="56" width="76" height="8" rx="4" fill={G} opacity=".7" />
    </>
  ),
  abductor: (
    <>
      <rect x="42" y="34" width="18" height="10" rx="5" fill={G} />
      <rect x="44" y="40" width="14" height="48" rx="6" fill={G} />
      <rect x="20" y="62" width="20" height="10" rx="5" fill={G} opacity=".7" />
      <rect x="62" y="62" width="20" height="10" rx="5" fill={G} opacity=".7" />
    </>
  ),
  adductor: (
    <>
      <rect x="42" y="34" width="18" height="10" rx="5" fill={G} />
      <rect x="44" y="40" width="14" height="48" rx="6" fill={G} />
      <rect x="34" y="62" width="14" height="10" rx="5" fill={G} opacity=".7" />
      <rect x="54" y="62" width="14" height="10" rx="5" fill={G} opacity=".7" />
    </>
  ),
  "hip-thrust": (
    <>
      <rect x="20" y="66" width="64" height="10" rx="5" fill={G} />
      <rect x="40" y="48" width="30" height="10" rx="5" fill={G} opacity=".7" />
      <circle cx="86" cy="58" r="12" fill="none" stroke={G} strokeWidth="6" />
    </>
  ),
  calf: (
    <>
      <rect x="28" y="48" width="36" height="12" rx="6" fill={G} />
      <rect x="30" y="30" width="30" height="9" rx="4" fill={G} opacity=".7" />
      <rect x="26" y="80" width="40" height="9" rx="4" fill={G} opacity=".5" />
      <rect x="74" y="34" width="9" height="46" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "glute-kickback": (
    <>
      <rect x="28" y="50" width="34" height="12" rx="6" fill={G} />
      <rect x="30" y="38" width="10" height="14" rx="4" fill={G} />
      <line x1="60" y1="62" x2="84" y2="80" stroke={G} strokeWidth="8" strokeLinecap="round" />
      <rect x="78" y="74" width="14" height="9" rx="4" fill={G} opacity=".7" />
    </>
  ),
  "chest-press": (
    <>
      <rect x="30" y="44" width="14" height="44" rx="6" fill={G} />
      <rect x="30" y="80" width="36" height="9" rx="4" fill={G} />
      <rect x="56" y="50" width="20" height="8" rx="4" fill={G} opacity=".6" />
      <rect x="56" y="72" width="20" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "pec-deck": (
    <>
      <rect x="50" y="40" width="14" height="48" rx="6" fill={G} />
      <line x1="50" y1="50" x2="28" y2="40" stroke={G} strokeWidth="8" strokeLinecap="round" />
      <line x1="64" y1="50" x2="86" y2="40" stroke={G} strokeWidth="8" strokeLinecap="round" />
      <rect x="46" y="80" width="24" height="9" rx="4" fill={G} />
    </>
  ),
  "lat-pulldown": (
    <>
      <rect x="78" y="18" width="9" height="42" rx="4" fill={G} />
      <rect x="74" y="18" width="18" height="8" rx="4" fill={G} />
      <rect x="34" y="30" width="42" height="8" rx="4" fill={G} opacity=".7" />
      <rect x="40" y="60" width="30" height="10" rx="5" fill={G} />
      <rect x="44" y="70" width="9" height="20" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "low-row": (
    <>
      <rect x="20" y="74" width="9" height="22" rx="4" fill={G} />
      <rect x="34" y="60" width="40" height="10" rx="5" fill={G} />
      <rect x="36" y="40" width="10" height="20" rx="4" fill={G} />
      <line x1="22" y1="78" x2="46" y2="60" stroke={G} strokeWidth="6" strokeLinecap="round" />
      <rect x="78" y="64" width="14" height="9" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "chest-row": (
    <>
      <rect x="40" y="42" width="14" height="46" rx="6" fill={G} />
      <rect x="60" y="50" width="22" height="8" rx="4" fill={G} opacity=".6" />
      <rect x="60" y="70" width="22" height="8" rx="4" fill={G} opacity=".6" />
      <rect x="34" y="80" width="30" height="9" rx="4" fill={G} />
    </>
  ),
  "shoulder-press": (
    <>
      <rect x="36" y="48" width="14" height="40" rx="6" fill={G} />
      <rect x="34" y="80" width="34" height="9" rx="4" fill={G} />
      <rect x="40" y="28" width="9" height="22" rx="4" fill={G} opacity=".7" />
      <rect x="62" y="28" width="9" height="22" rx="4" fill={G} opacity=".7" />
      <rect x="38" y="26" width="34" height="8" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "lateral-raise": (
    <>
      <rect x="48" y="46" width="14" height="42" rx="6" fill={G} />
      <line x1="48" y1="52" x2="30" y2="40" stroke={G} strokeWidth="8" strokeLinecap="round" />
      <line x1="62" y1="52" x2="80" y2="40" stroke={G} strokeWidth="8" strokeLinecap="round" />
      <rect x="44" y="80" width="24" height="9" rx="4" fill={G} />
    </>
  ),
  triceps: (
    <>
      <rect x="36" y="44" width="14" height="44" rx="6" fill={G} />
      <rect x="34" y="80" width="32" height="9" rx="4" fill={G} />
      <line x1="58" y1="44" x2="74" y2="70" stroke={G} strokeWidth="8" strokeLinecap="round" />
      <rect x="68" y="64" width="14" height="9" rx="4" fill={G} opacity=".7" />
    </>
  ),
  "biceps-curl": (
    <>
      <rect x="34" y="54" width="36" height="10" rx="5" fill={G} opacity=".7" />
      <rect x="40" y="74" width="26" height="10" rx="5" fill={G} />
      <rect x="42" y="40" width="9" height="16" rx="4" fill={G} />
      <rect x="60" y="64" width="18" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "ab-crunch": (
    <>
      <rect x="34" y="70" width="34" height="10" rx="5" fill={G} />
      <path d="M40 70 Q44 40 64 40" stroke={G} strokeWidth="9" fill="none" strokeLinecap="round" />
      <rect x="40" y="82" width="9" height="12" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "torso-rotation": (
    <>
      <circle cx="56" cy="56" r="22" fill="none" stroke={G} strokeWidth="6" />
      <rect x="52" y="56" width="10" height="32" rx="5" fill={G} />
      <rect x="40" y="84" width="34" height="9" rx="4" fill={G} />
      <rect x="70" y="46" width="14" height="8" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "back-extension": (
    <>
      <line x1="30" y1="84" x2="74" y2="44" stroke={G} strokeWidth="10" strokeLinecap="round" />
      <rect x="26" y="80" width="9" height="16" rx="4" fill={G} />
      <rect x="70" y="72" width="14" height="9" rx="4" fill={G} opacity=".7" />
      <rect x="60" y="80" width="9" height="16" rx="4" fill={G} opacity=".5" />
    </>
  ),
  crossover: (
    <>
      <rect x="22" y="18" width="9" height="82" rx="4" fill={G} />
      <rect x="89" y="18" width="9" height="82" rx="4" fill={G} />
      <rect x="22" y="20" width="76" height="7" rx="3" fill={G} opacity=".6" />
      <line x1="28" y1="26" x2="60" y2="60" stroke={G} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <line x1="92" y1="26" x2="60" y2="60" stroke={G} strokeWidth="4" strokeLinecap="round" opacity=".7" />
    </>
  ),
  "cable-station": (
    <>
      <rect x="40" y="18" width="10" height="82" rx="4" fill={G} />
      <rect x="36" y="18" width="40" height="8" rx="4" fill={G} opacity=".6" />
      <rect x="50" y="44" width="18" height="8" rx="4" fill={G} opacity=".7" />
      <rect x="36" y="92" width="40" height="8" rx="4" fill={G} opacity=".5" />
    </>
  ),
  "bench-flat": (
    <>
      <rect x="24" y="58" width="64" height="10" rx="5" fill={G} />
      <rect x="30" y="68" width="8" height="22" rx="4" fill={G} opacity=".6" />
      <rect x="74" y="68" width="8" height="22" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "bench-incline": (
    <>
      <rect x="48" y="40" width="40" height="10" rx="5" fill={G} transform="rotate(-18 68 45)" />
      <rect x="24" y="62" width="40" height="10" rx="5" fill={G} />
      <rect x="30" y="72" width="8" height="20" rx="4" fill={G} opacity=".6" />
      <rect x="74" y="58" width="8" height="20" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "bench-decline": (
    <>
      <rect x="32" y="50" width="40" height="10" rx="5" fill={G} transform="rotate(14 52 55)" />
      <rect x="56" y="64" width="34" height="10" rx="5" fill={G} />
      <rect x="36" y="60" width="8" height="22" rx="4" fill={G} opacity=".6" />
      <rect x="80" y="74" width="8" height="18" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "bench-adjustable": (
    <>
      <rect x="48" y="44" width="34" height="10" rx="5" fill={G} transform="rotate(-32 65 49)" />
      <rect x="26" y="64" width="38" height="10" rx="5" fill={G} />
      <circle cx="58" cy="64" r="4" fill={G} />
      <rect x="32" y="74" width="8" height="18" rx="4" fill={G} opacity=".6" />
    </>
  ),
  "pullup-dip": (
    <>
      <rect x="30" y="20" width="9" height="80" rx="4" fill={G} />
      <rect x="81" y="20" width="9" height="80" rx="4" fill={G} />
      <rect x="30" y="22" width="60" height="8" rx="4" fill={G} />
      <rect x="40" y="56" width="12" height="8" rx="4" fill={G} opacity=".7" />
      <rect x="68" y="56" width="12" height="8" rx="4" fill={G} opacity=".7" />
    </>
  ),
};

const fallbackIllo = (
  <>
    <rect x="42" y="52" width="36" height="16" rx="8" fill={G} />
    <rect x="30" y="44" width="12" height="32" rx="6" fill={G} />
    <rect x="78" y="44" width="12" height="32" rx="6" fill={G} />
  </>
);

export function MachineIllo({ id, size = 120 }: { id: string; size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: "block" }} aria-hidden>
      {illos[id] ?? fallbackIllo}
    </svg>
  );
}
