export type ExerciseType = "reps" | "duration";
export interface ExerciseDef {
  name: string;
  category: string;
  type: ExerciseType;
}

export const EXERCISES: ExerciseDef[] = [
  // Piernas
  { name: "Sentadilla trasera", category: "Piernas", type: "reps" },
  { name: "Sentadilla frontal", category: "Piernas", type: "reps" },
  { name: "Prensa de pierna", category: "Piernas", type: "reps" },
  { name: "Peso muerto rumano", category: "Piernas", type: "reps" },
  { name: "Curl femoral tumbado", category: "Piernas", type: "reps" },
  { name: "Extensión de cuádriceps", category: "Piernas", type: "reps" },
  { name: "Hip thrust", category: "Piernas", type: "reps" },
  { name: "Zancadas con mancuerna", category: "Piernas", type: "reps" },
  { name: "Sentadilla búlgara", category: "Piernas", type: "reps" },
  { name: "Elevación de talones", category: "Piernas", type: "reps" },
  // Empuje
  { name: "Press de banca", category: "Empuje", type: "reps" },
  { name: "Press de banca inclinado", category: "Empuje", type: "reps" },
  { name: "Press de banca declinado", category: "Empuje", type: "reps" },
  { name: "Press militar", category: "Empuje", type: "reps" },
  { name: "Press Arnold", category: "Empuje", type: "reps" },
  { name: "Fondos en paralelas", category: "Empuje", type: "reps" },
  { name: "Aperturas con mancuerna", category: "Empuje", type: "reps" },
  { name: "Elevaciones laterales", category: "Empuje", type: "reps" },
  { name: "Elevaciones frontales", category: "Empuje", type: "reps" },
  { name: "Extensión de tríceps en polea", category: "Empuje", type: "reps" },
  // Tracción
  { name: "Peso muerto convencional", category: "Tracción", type: "reps" },
  { name: "Remo con barra", category: "Tracción", type: "reps" },
  { name: "Remo en polea baja", category: "Tracción", type: "reps" },
  { name: "Remo con mancuerna", category: "Tracción", type: "reps" },
  { name: "Jalón al pecho", category: "Tracción", type: "reps" },
  { name: "Jalón tras nuca", category: "Tracción", type: "reps" },
  { name: "Dominadas", category: "Tracción", type: "reps" },
  { name: "Face pull", category: "Tracción", type: "reps" },
  { name: "Curl de bíceps", category: "Tracción", type: "reps" },
  { name: "Curl martillo", category: "Tracción", type: "reps" },
  // Core
  { name: "Plancha", category: "Core", type: "duration" },
  { name: "Plancha lateral", category: "Core", type: "duration" },
  { name: "Crunch abdominal", category: "Core", type: "reps" },
  { name: "Rueda abdominal", category: "Core", type: "reps" },
  { name: "Elevación de piernas", category: "Core", type: "reps" },
  { name: "Russian twist", category: "Core", type: "reps" },
  { name: "Bird dog", category: "Core", type: "reps" },
  // Calentamiento
  { name: "Movilidad de cadera", category: "Calentamiento", type: "reps" },
  { name: "Movilidad de hombro", category: "Calentamiento", type: "reps" },
  // Cardio
  { name: "Caminata en banda", category: "Cardio", type: "duration" },
  { name: "Remo (máquina)", category: "Cardio", type: "duration" },
  { name: "Bicicleta estática", category: "Cardio", type: "duration" },
  { name: "Elíptica", category: "Cardio", type: "duration" },
  { name: "Cinta de correr", category: "Cardio", type: "duration" },
];

export const EXERCISE_NAMES = EXERCISES.map((e) => e.name);
