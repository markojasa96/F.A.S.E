import { useState, useEffect, useMemo, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   F.A.S.E. v3 — Formación Atlética y Sistemas de Entrenamiento
   ═══════════════════════════════════════════════════════════ */

const C = {
  bg: "#07070C",
  surface: "#0E0E16",
  card: "#13131D",
  card2: "#1A1A28",
  border: "#23233A",
  text: "#F2F2F8",
  mut: "#8A8AAD",
  dim: "#55557A",
  green: "#22FF88",
  cyan: "#00E5FF",
  orange: "#FF7A2F",
  yellow: "#FFD600",
  red: "#FF3B5C",
  purple: "#A855F7",
  blue: "#3B82F6",
};

/* ─── Temas visuales (mutan C + variables CSS; ver applyTheme) ─── */
const THEMES = [
  { id: "sombra", name: "Sombra", emoji: "🌑", bg: "#07070C", card: "#13131D", card2: "#1A1A28", border: "#23233A", surface: "#0E0E16", accent: "#00E5FF", locked: false },
  { id: "fuego", name: "Fuego", emoji: "🔥", bg: "#0C0700", card: "#1D1006", card2: "#2A160A", border: "#3A2010", surface: "#150A02", accent: "#FF6B00", locked: false },
  { id: "bosque", name: "Bosque", emoji: "🌲", bg: "#030C05", card: "#0D1D10", card2: "#12280F", border: "#1A3A20", surface: "#071309", accent: "#00FF85", locked: false },
  { id: "oceano", name: "Océano", emoji: "🌊", bg: "#00050C", card: "#0A1A2E", card2: "#0F2440", border: "#1A2A44", surface: "#040D18", accent: "#0099FF", locked: false },
  { id: "oro", name: "Oro", emoji: "🏆", bg: "#0C0900", card: "#1D1706", card2: "#2A2109", border: "#3A2E10", surface: "#150F02", accent: "#FFD700",
    locked: true, unlockDesc: "Alcanza nivel Leyenda en cualquier disciplina", check: (st) => st.reachedLeyenda },
  { id: "cosmos", name: "Cosmos", emoji: "✨", bg: "#05030C", card: "#12102A", card2: "#191640", border: "#2A2050", surface: "#0A081A", accent: "#B084FF",
    locked: true, unlockDesc: "Completa 50 sesiones totales", check: (st) => st.totalSessions >= 50 },
  { id: "sangre", name: "Sangre y fuego", emoji: "🩸", bg: "#0C0000", card: "#1D0505", card2: "#2A0808", border: "#3A0A0A", surface: "#150202", accent: "#FF1A1A",
    locked: true, unlockDesc: "Racha de 30 días", check: (st) => st.bestStreak >= 30 },
];

/* Muta el objeto C (leído por todos los estilos inline) y las variables CSS globales */
function applyTheme(theme) {
  C.bg = theme.bg; C.card = theme.card; C.card2 = theme.card2; C.border = theme.border; C.surface = theme.surface; C.cyan = theme.accent;
  try {
    const root = document.documentElement;
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--card", theme.card);
    root.style.setProperty("--card2", theme.card2);
    root.style.setProperty("--border", theme.border);
    root.style.setProperty("--surface", theme.surface);
    root.style.setProperty("--cyan", theme.accent);
    document.body.style.background = theme.bg;
  } catch {
    /* SSR o entorno sin document */
  }
}

/* ─── Storage seguro (prefijo fase_) ─── */
const store = {
  get(key, fallback) {
    try {
      const v = window.localStorage.getItem("fase_" + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem("fase_" + key, JSON.stringify(value));
    } catch {
      if (store.onError) store.onError();
    }
  },
  onError: null,
};

/* ─── Niveles de entrenamiento ─── */
const LEVELS = [
  { name: "Iniciado", emoji: "🔵", color: C.blue, desc: "Estoy empezando" },
  { name: "Guerrero", emoji: "🟢", color: C.green, desc: "Entreno regularmente" },
  { name: "Campeón", emoji: "🟡", color: C.yellow, desc: "Llevo más de 6 meses" },
  { name: "Élite", emoji: "🟠", color: C.orange, desc: "Es mi estilo de vida" },
  { name: "Leyenda", emoji: "🔴", color: C.red, desc: "Entreno como profesional" },
  { name: "THE ONE", emoji: "⚡", color: C.purple, desc: "Soy el límite" },
];

/* Umbrales de sesiones totales para el nivel global (Iniciado 0-4, Guerrero 5-14, Campeón 15-29, Élite 30-59, Leyenda 60-99, THE ONE 100+) */
const GLOBAL_LEVEL_THRESHOLDS = [0, 5, 15, 30, 60, 100];

/* ─── Héroes por racha ─── */
const HEROES = [
  { id: "espartano", days: 3, emoji: "🛡️", name: "Espartano", quote: "El guerrero despertó", color: C.red },
  { id: "samurai", days: 7, emoji: "⚔️", name: "Samurái", quote: "Disciplina de acero", color: C.cyan },
  { id: "vikingo", days: 14, emoji: "🪓", name: "Vikingo", quote: "La leyenda crece", color: C.orange },
  { id: "gladiador", days: 30, emoji: "🏛️", name: "Gladiador", quote: "Nadie te detiene", color: C.yellow },
  { id: "centurion", days: 60, emoji: "🦅", name: "Centurión Romano", quote: "Imperio de fuerza", color: C.purple },
  { id: "khan", days: 90, emoji: "🏹", name: "Mongol Khan", quote: "Conquistador absoluto", color: C.green },
];
const EGG = { emoji: "🥚", name: "Huevo", quote: "Tu héroe aún no despierta. Entrena 3 días seguidos.", color: C.mut };

/* ─── Disciplinas y enfoques ─── */
const DISCIPLINES = {
  calistenia: {
    label: "Calistenia",
    icon: "🤸",
    color: C.green,
    desc: "Parque o casa · Sin equipo",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "empuje", label: "Empuje", tags: ["empuje"] },
      { id: "tiron", label: "Tirón", tags: ["tiron"] },
      { id: "core", label: "Core", tags: ["core"] },
      { id: "piernas", label: "Piernas", tags: ["piernas"] },
      { id: "explosivo", label: "Full body explosivo", tags: ["explosivo"] },
    ],
  },
  gimnasio: {
    label: "Gimnasio",
    icon: "🏋️",
    color: C.cyan,
    desc: "Fuerza · Barras y mancuernas",
    focuses: [
      { id: "todo", label: "Todo el cuerpo", tags: null },
      { id: "pecho", label: "Pecho", tags: ["pecho"] },
      { id: "espalda", label: "Espalda", tags: ["espalda"] },
      { id: "hombros", label: "Hombros", tags: ["hombros"] },
      { id: "brazos", label: "Brazos", tags: ["brazos"] },
      { id: "piernas", label: "Piernas", tags: ["piernas"] },
      { id: "gluteos", label: "Glúteos", tags: ["gluteos"] },
      { id: "sup", label: "Parte superior", tags: ["pecho", "espalda", "hombros", "brazos"] },
      { id: "inf", label: "Parte inferior", tags: ["piernas", "gluteos"] },
    ],
  },
  futbolGym: {
    label: "Fútbol — Gimnasio",
    icon: "⚽",
    color: C.orange,
    desc: "1 hora · Fuerza aplicada al campo",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "velocidad", label: "Velocidad explosiva", tags: ["velocidad"] },
      { id: "salto", label: "Salto", tags: ["salto"] },
      { id: "fuerza", label: "Fuerza de pierna", tags: ["fuerza"] },
      { id: "estabilidad", label: "Estabilidad", tags: ["estabilidad"] },
      { id: "resistencia", label: "Resistencia", tags: ["resistencia"] },
    ],
  },
  futbolParque: {
    label: "Fútbol — Parque",
    icon: "🥅",
    color: C.yellow,
    desc: "1 hora · Velocidad y técnica con balón",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "tiro", label: "Tiro", tags: ["tiro"] },
      { id: "regate", label: "Regate", tags: ["regate"] },
      { id: "ritmo", label: "Cambio de ritmo", tags: ["ritmo"] },
      { id: "velocidad", label: "Velocidad", tags: ["velocidad"] },
      { id: "resistencia", label: "Resistencia aeróbica", tags: ["resistencia"] },
    ],
  },
};

/* Fútbol se presenta como una sola disciplina; internamente usa futbolGym/futbolParque */
const FUTBOL_META = { label: "Fútbol", icon: "⚽", color: C.orange, desc: "Gimnasio o parque, tú eliges" };
const FUTBOL_LOCATIONS = [
  { id: "futbolGym", emoji: "🏋️", label: "Gimnasio", desc: "Fuerza aplicada al campo" },
  { id: "futbolParque", emoji: "🌳", label: "Parque", desc: "Velocidad y técnica" },
];
const CAL_LOCATIONS = [
  { id: "parque", emoji: "🌳", label: "Parque", desc: "Barras disponibles" },
  { id: "casa", emoji: "🏠", label: "Casa", desc: "Sin equipo" },
];

/* ─── Atletismo: distancias con sus propias rutinas ─── */
const DISTANCES = [
  { id: "100m", label: "100 m", tip: "Velocidad pura" },
  { id: "400m", label: "400 m", tip: "Velocidad-resistencia" },
  { id: "1000m", label: "1000 m", tip: "Medio fondo corto" },
  { id: "5km", label: "5 km", tip: "Medio fondo" },
  { id: "10km", label: "10 km", tip: "Fondo" },
  { id: "maraton", label: "Maratón", tip: "Fondo largo" },
];

/* Se añade a DISCIPLINES para que Progreso pueda mostrar su desglose,
   aunque su flujo de selección en Entrenar es especial (ver Train) */
DISCIPLINES.atletismo = {
  label: "Atletismo", icon: "🏃", color: C.purple, desc: "Corre y mejora tus tiempos",
  focuses: DISTANCES.map((d) => ({ id: d.id, label: d.label, tags: null })),
};

const ATLETISMO_BENCH = {
  "100m": [
    { l: "Iniciado", t: ">14s" }, { l: "Guerrero", t: "12s" }, { l: "Campeón", t: "11s" },
    { l: "Élite", t: "10.5s" }, { l: "Leyenda", t: "10s" }, { l: "THE ONE", t: "<9.8s" },
  ],
  "1000m": [
    { l: "Iniciado", t: ">6:00" }, { l: "Guerrero", t: "5:00" }, { l: "Campeón", t: "4:30" },
    { l: "Élite", t: "4:00" }, { l: "Leyenda", t: "3:30" }, { l: "THE ONE", t: "<3:00" },
  ],
  "5km": [
    { l: "Iniciado", t: ">35:00" }, { l: "Guerrero", t: "28:00" }, { l: "Campeón", t: "23:00" },
    { l: "Élite", t: "18:00" }, { l: "Leyenda", t: "15:00" }, { l: "THE ONE", t: "<13:00" },
  ],
};

const ATLETISMO_EXDB = {
  "100m": [
    { n: "Salidas de bloque (o posición baja)", t: "tiempo", s: 6, r: "20 m", rest: 120, tip: "Explota bajo y acelera los primeros 10 pasos." },
    { n: "Aceleraciones progresivas", t: "tiempo", s: 5, r: "30 m", rest: 120, tip: "De trote a sprint máximo en la distancia." },
    { n: "Sprint máximo", t: "tiempo", s: 4, r: "60 m", rest: 180, tip: "Inclinación de 45° al salir. Brazos en 90° que se mueven adelante-atrás sin cruzar el centro. Ataque del pie bajo el centro de masa. Máxima frecuencia de zancada en los primeros 30m." },
    { n: "Skipping A", t: "tiempo", s: 3, r: "20 m", rest: 60, tip: "Rodilla alta, apoyo activo bajo la cadera." },
    { n: "Skipping B", t: "tiempo", s: 3, r: "20 m", rest: 60, tip: "Extiende la pierna adelante antes de bajarla." },
    { n: "Frecuencia de zancada en el sitio", t: "tiempo", s: 3, r: "15s", rest: 60, tip: "Pasos muy rápidos y cortos, casi sin desplazarte." },
  ],
  "400m": [
    { n: "Repeticiones de 300 m a ritmo de carrera", t: "tiempo", s: 4, r: "300 m", rest: 240, tip: "Ritmo agresivo pero sostenible toda la distancia." },
    { n: "Series de 200 m rápidas", t: "tiempo", s: 5, r: "200 m", rest: 150, tip: "Controla el primer 100 m para no morir al final." },
    { n: "Progresivos de 150 m", t: "tiempo", s: 4, r: "150 m", rest: 120, tip: "Acelera cada 50 m: suave, medio, fuerte." },
    { n: "Cuestas cortas explosivas", t: "tiempo", s: 5, r: "40 m", rest: 120, tip: "Empuje potente con los brazos activos." },
    { n: "Trote de recuperación entre series", t: "tiempo", s: 1, r: "5 min", rest: 0, tip: "Ritmo muy suave para bajar pulsaciones." },
  ],
  "1000m": [
    { n: "Intervalos 6×200 m", t: "tiempo", s: 6, r: "200 m", rest: 90, tip: "Mismo ritmo en cada repetición, no te vayas fuerte al inicio." },
    { n: "Tempo run", t: "tiempo", s: 1, r: "15 min", rest: 0, tip: "Ritmo constante moderado, controlado pero exigente." },
    { n: "Fartlek libre", t: "tiempo", s: 1, r: "20 min", rest: 0, tip: "Alterna ritmos a tu gusto: fuerte y suave." },
    { n: "Series de colina", t: "tiempo", s: 5, r: "80 m", rest: 120, tip: "Sube fuerte, baja trotando de recuperación." },
    { n: "Rodaje suave de base", t: "tiempo", s: 1, r: "20 min", rest: 0, tip: "Ritmo cómodo, puedes hablar mientras corres." },
  ],
  "5km": [
    { n: "Intervalos 6×200 m", t: "tiempo", s: 6, r: "200 m", rest: 90, tip: "Trabaja velocidad de base para el ritmo de 5K." },
    { n: "Tempo run", t: "tiempo", s: 1, r: "20 min", rest: 0, tip: "Ritmo algo incómodo pero sostenible." },
    { n: "Fartlek libre", t: "tiempo", s: 1, r: "25 min", rest: 0, tip: "Cambios de ritmo espontáneos durante la carrera." },
    { n: "Series de colina", t: "tiempo", s: 6, r: "100 m", rest: 120, tip: "Construye fuerza específica de carrera." },
    { n: "Rodaje suave de base", t: "tiempo", s: 1, r: "30 min", rest: 0, tip: "El volumen aeróbico es la base de todo." },
  ],
  "10km": [
    { n: "Rodaje largo (long run)", t: "tiempo", s: 1, r: "50 min", rest: 0, tip: "Ritmo suave y constante, prioriza la duración." },
    { n: "Ritmo de carrera (pace run)", t: "tiempo", s: 1, r: "25 min", rest: 0, tip: "Corre al ritmo que esperas mantener el día de la carrera." },
    { n: "Intervalos largos 3×1 km", t: "tiempo", s: 3, r: "1 km", rest: 180, tip: "Ritmo algo más rápido que el objetivo de carrera." },
    { n: "Carrera continua suave", t: "tiempo", s: 1, r: "35 min", rest: 0, tip: "Base aeróbica: constante y cómoda." },
    { n: "Recuperación activa trotando", t: "tiempo", s: 1, r: "15 min", rest: 0, tip: "Muy suave, para asimilar el trabajo previo." },
  ],
  maraton: [
    { n: "Rodaje largo (long run)", t: "tiempo", s: 1, r: "90 min", rest: 0, tip: "El entrenamiento más importante de la semana: paciencia." },
    { n: "Ritmo de carrera (pace run)", t: "tiempo", s: 1, r: "40 min", rest: 0, tip: "Practica el ritmo objetivo de la maratón." },
    { n: "Intervalos largos 3×1 km", t: "tiempo", s: 3, r: "1 km", rest: 180, tip: "Aporta velocidad sin sacrificar la resistencia de base." },
    { n: "Carrera continua suave", t: "tiempo", s: 1, r: "50 min", rest: 0, tip: "Kilómetros fáciles que suman resistencia." },
    { n: "Recuperación activa trotando", t: "tiempo", s: 1, r: "20 min", rest: 0, tip: "Fundamental entre sesiones largas para no lesionarte." },
  ],
};

/* ─── Base de ejercicios ───
   t: peso | reps | tiempo · f: enfoques · lv: [nivel mín, nivel máx] 0-5 */
const EXDB = {
  gimnasio: [
    { n: "Press banca con barra", t: "peso", f: ["pecho"], lv: [1, 5], s: 4, r: "6-10", rest: 120, tip: "Agarre ligeramente más ancho que hombros. Escápulas retraídas y pies en el suelo. Baja la barra al pecho medio-bajo. Empuja en trayectoria ligeramente diagonal hacia arriba." },
    { n: "Press banca con mancuernas", t: "peso", f: ["pecho"], lv: [0, 3], s: 3, r: "8-12", rest: 90, tip: "Recorrido completo, junta las mancuernas arriba sin chocarlas." },
    { n: "Press inclinado con mancuernas", t: "peso", f: ["pecho"], lv: [0, 5], s: 3, r: "8-12", rest: 90, tip: "Banco a 30°, no arquees la zona lumbar." },
    { n: "Aperturas con mancuernas", t: "peso", f: ["pecho"], lv: [0, 4], s: 3, r: "10-15", rest: 60, tip: "Codos ligeramente flexionados, siente el estiramiento del pecho." },
    { n: "Cruce de poleas", t: "peso", f: ["pecho"], lv: [1, 5], s: 3, r: "12-15", rest: 60, tip: "Contrae el pecho al cerrar, controla la vuelta." },
    { n: "Press banca con barra y pausa", t: "peso", f: ["pecho"], lv: [3, 5], s: 4, r: "4-6", rest: 180, tip: "Pausa de 1 segundo en el pecho antes de empujar." },
    { n: "Jalón al pecho", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Lleva la barra a la clavícula con el pecho arriba." },
    { n: "Dominadas", t: "reps", f: ["espalda"], lv: [1, 3], s: 4, r: "5-10", rest: 120, tip: "Agarre prono, manos algo más anchas que hombros. Inicia el movimiento retrayendo escápulas. Sube hasta que la barbilla supere la barra. Baja completamente controlado." },
    { n: "Dominadas lastradas", t: "peso", f: ["espalda"], lv: [3, 5], s: 4, r: "4-6", rest: 150, tip: "Añade peso al cinturón, mantén el control al bajar." },
    { n: "Remo con barra", t: "peso", f: ["espalda"], lv: [1, 5], s: 4, r: "6-10", rest: 120, tip: "Torso a 45°, tira hacia el ombligo sin dar tirones." },
    { n: "Remo con mancuerna a una mano", t: "peso", f: ["espalda"], lv: [0, 4], s: 3, r: "8-12", rest: 90, tip: "Apoya la rodilla en el banco, espalda recta." },
    { n: "Remo en polea baja", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Saca pecho y lleva los codos atrás pegados al cuerpo." },
    { n: "Peso muerto convencional", t: "peso", f: ["espalda", "piernas"], lv: [2, 5], s: 4, r: "3-6", rest: 210, tip: "Pies a anchura de caderas. Barra sobre mediopié. Agarre justo fuera de las piernas. Espalda neutral, pecho arriba. Empuja el suelo hacia abajo, no jales la barra hacia arriba." },
    { n: "Pullover en polea", t: "peso", f: ["espalda"], lv: [1, 4], s: 3, r: "12-15", rest: 60, tip: "Brazos casi rectos, lleva la barra hasta la cadera." },
    { n: "Press militar con mancuernas", t: "peso", f: ["hombros"], lv: [0, 3], s: 3, r: "8-12", rest: 90, tip: "Sube sin encoger los hombros, abdomen firme." },
    { n: "Press militar de pie con barra", t: "peso", f: ["hombros"], lv: [2, 5], s: 4, r: "5-8", rest: 150, tip: "Aprieta glúteos y abdomen, sin impulso de piernas." },
    { n: "Elevaciones laterales", t: "peso", f: ["hombros"], lv: [0, 5], s: 3, r: "12-15", rest: 60, tip: "Sube hasta la altura del hombro sin balancear el cuerpo." },
    { n: "Pájaros (deltoide posterior)", t: "peso", f: ["hombros"], lv: [0, 5], s: 3, r: "12-15", rest: 60, tip: "Inclínate hacia adelante y abre los brazos como alas." },
    { n: "Push press", t: "peso", f: ["hombros"], lv: [3, 5], s: 4, r: "4-6", rest: 150, tip: "Pequeño impulso de piernas y bloquea arriba." },
    { n: "Face pull", t: "peso", f: ["hombros"], lv: [1, 5], s: 3, r: "15", rest: 60, tip: "Tira de la cuerda hacia la cara con los codos altos." },
    { n: "Curl de bíceps con mancuernas", t: "peso", f: ["brazos"], lv: [0, 3], s: 3, r: "10-12", rest: 60, tip: "Codos pegados al cuerpo, baja lento." },
    { n: "Curl con barra", t: "peso", f: ["brazos"], lv: [1, 5], s: 3, r: "8-10", rest: 90, tip: "No balancees la espalda, controla la bajada." },
    { n: "Curl martillo", t: "peso", f: ["brazos"], lv: [0, 4], s: 3, r: "10-12", rest: 60, tip: "Agarre neutro, trabaja también el antebrazo." },
    { n: "Extensión de tríceps en polea", t: "peso", f: ["brazos"], lv: [0, 3], s: 3, r: "12-15", rest: 60, tip: "Codos fijos al costado, extiende hasta bloquear." },
    { n: "Press francés", t: "peso", f: ["brazos"], lv: [1, 5], s: 3, r: "8-12", rest: 90, tip: "Baja la barra hacia la frente con los codos quietos." },
    { n: "Fondos entre bancos", t: "reps", f: ["brazos", "pecho"], lv: [0, 2], s: 3, r: "10-15", rest: 60, tip: "Hombros lejos de las orejas, baja hasta 90°." },
    { n: "Fondos lastrados en paralelas", t: "peso", f: ["brazos", "pecho"], lv: [3, 5], s: 4, r: "6-8", rest: 150, tip: "Inclínate levemente adelante, baja controlado." },
    { n: "Sentadilla goblet", t: "peso", f: ["piernas", "gluteos"], lv: [0, 2], s: 3, r: "10-12", rest: 90, tip: "Mancuerna al pecho, baja entre las rodillas." },
    { n: "Sentadilla con barra", t: "peso", f: ["piernas", "gluteos"], lv: [1, 5], s: 4, r: "5-8", rest: 180, tip: "Barra sobre trapecios, pies a anchura de hombros con puntas ligeramente abiertas. Inicia el movimiento sacando las caderas hacia atrás. Rodillas siguen la dirección de los pies. Baja hasta paralelo o más." },
    { n: "Sentadilla frontal", t: "peso", f: ["piernas"], lv: [3, 5], s: 4, r: "4-6", rest: 180, tip: "Codos altos, torso lo más vertical posible." },
    { n: "Prensa de piernas", t: "peso", f: ["piernas"], lv: [0, 4], s: 3, r: "10-12", rest: 120, tip: "No bloquees las rodillas arriba, baja profundo." },
    { n: "Peso muerto rumano", t: "peso", f: ["piernas", "gluteos"], lv: [1, 5], s: 3, r: "8-10", rest: 120, tip: "Cadera atrás, siente el estiramiento en los femorales." },
    { n: "Zancadas con mancuernas", t: "peso", f: ["piernas", "gluteos"], lv: [0, 4], s: 3, r: "8 c/pierna", rest: 90, tip: "Paso largo, rodilla trasera casi al suelo." },
    { n: "Curl femoral", t: "peso", f: ["piernas"], lv: [0, 4], s: 3, r: "10-12", rest: 60, tip: "Sube con fuerza, baja en 3 segundos." },
    { n: "Extensión de cuádriceps", t: "peso", f: ["piernas"], lv: [0, 3], s: 3, r: "12-15", rest: 60, tip: "Aprieta el cuádriceps 1 segundo arriba." },
    { n: "Elevación de talones con peso", t: "peso", f: ["piernas"], lv: [0, 5], s: 4, r: "12-15", rest: 45, tip: "Pausa arriba y estira abajo por completo." },
    { n: "Hip thrust con barra", t: "peso", f: ["gluteos"], lv: [1, 5], s: 4, r: "8-10", rest: 120, tip: "Barbilla al pecho, aprieta glúteos 2 segundos arriba." },
    { n: "Puente de glúteos con disco", t: "peso", f: ["gluteos"], lv: [0, 2], s: 3, r: "12-15", rest: 60, tip: "Empuja con los talones, no arquees la lumbar." },
    { n: "Sentadilla búlgara con mancuernas", t: "peso", f: ["gluteos", "piernas"], lv: [2, 5], s: 3, r: "8 c/pierna", rest: 120, tip: "Pie trasero en el banco, torso levemente inclinado." },
    { n: "Patada de glúteo en polea", t: "peso", f: ["gluteos"], lv: [0, 3], s: 3, r: "12 c/pierna", rest: 60, tip: "Extiende la cadera atrás sin arquear la espalda." },
    { n: "Press Arnold", t: "peso", f: ["hombros"], lv: [1, 4], s: 3, r: "8-12", rest: 90, tip: "Gira las palmas mientras subes las mancuernas." },
    { n: "Remo al mentón con barra", t: "peso", f: ["hombros"], lv: [1, 3], s: 3, r: "10-12", rest: 60, tip: "Codos por encima de las muñecas, sube hasta el pecho." },
    { n: "Encogimientos con mancuernas", t: "peso", f: ["hombros", "espalda"], lv: [1, 5], s: 3, r: "12-15", rest: 60, tip: "Sube los hombros hacia las orejas y pausa arriba." },
    { n: "Press declinado con barra", t: "peso", f: ["pecho"], lv: [2, 5], s: 3, r: "6-10", rest: 120, tip: "Trabaja el pecho inferior, baja controlado." },
    { n: "Aperturas en máquina (pec deck)", t: "peso", f: ["pecho"], lv: [0, 3], s: 3, r: "12-15", rest: 60, tip: "Junta los brazos al frente apretando el pecho." },
    { n: "Press de pecho en máquina", t: "peso", f: ["pecho"], lv: [0, 4], s: 3, r: "10-12", rest: 90, tip: "Ideal para acabar cuando el pecho ya está cansado." },
    { n: "Remo en máquina", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Pecho apoyado, tira sin encoger los hombros." },
    { n: "Jalón con brazos rectos", t: "peso", f: ["espalda"], lv: [1, 4], s: 3, r: "12-15", rest: 60, tip: "Brazos casi rectos, siente el dorsal al bajar la barra." },
    { n: "Buenos días con barra", t: "peso", f: ["espalda", "piernas"], lv: [2, 5], s: 3, r: "8-10", rest: 120, tip: "Barra ligera, cadera atrás y espalda neutra." },
    { n: "Curl concentrado", t: "peso", f: ["brazos"], lv: [0, 3], s: 3, r: "10-12", rest: 60, tip: "Codo apoyado en el muslo, aprieta arriba." },
    { n: "Curl predicador", t: "peso", f: ["brazos"], lv: [1, 4], s: 3, r: "8-12", rest: 60, tip: "No extiendas del todo abajo, tensión constante." },
    { n: "Extensión de tríceps tumbado", t: "peso", f: ["brazos"], lv: [1, 4], s: 3, r: "10-12", rest: 90, tip: "Baja las mancuernas junto a las orejas." },
    { n: "Extensión de tríceps sobre la cabeza", t: "peso", f: ["brazos"], lv: [0, 4], s: 3, r: "10-12", rest: 60, tip: "Codos apuntando al techo, estira por completo." },
    { n: "Peso muerto sumo", t: "peso", f: ["piernas", "gluteos"], lv: [2, 5], s: 4, r: "4-6", rest: 210, tip: "Pies muy abiertos, rodillas hacia afuera, torso vertical." },
    { n: "Zancada inversa con barra", t: "peso", f: ["piernas", "gluteos"], lv: [2, 5], s: 3, r: "8 c/pierna", rest: 90, tip: "Paso atrás controlado, más amable con las rodillas." },
    { n: "Step-up con mancuernas", t: "peso", f: ["piernas", "gluteos"], lv: [1, 4], s: 3, r: "10 c/pierna", rest: 90, tip: "Empuja con la pierna de arriba, no impulses con la de abajo." },
    { n: "Abducción de cadera en polea", t: "peso", f: ["gluteos"], lv: [0, 3], s: 3, r: "12 c/pierna", rest: 60, tip: "Pierna recta hacia el lado, sin inclinar el torso." },
  ],
  calistenia: [
    { n: "Flexiones con rodillas", t: "reps", f: ["empuje"], lv: [0, 0], s: 3, r: "8-12", rest: 60, tip: "Cuerpo alineado de rodillas a cabeza, pecho al suelo." },
    { n: "Flexiones", t: "reps", f: ["empuje"], lv: [0, 2], s: 3, r: "10-20", rest: 60, tip: "Manos a la anchura de hombros. Cuerpo en línea recta de cabeza a talones. Baja hasta rozar el pecho con el suelo. Codos a 45° del cuerpo, no abiertos." },
    { n: "Flexiones diamante", t: "reps", f: ["empuje"], lv: [1, 4], s: 3, r: "8-15", rest: 90, tip: "Manos juntas formando un diamante bajo el pecho." },
    { n: "Flexiones declinadas", t: "reps", f: ["empuje"], lv: [2, 4], s: 3, r: "10-15", rest: 90, tip: "Pies elevados en un escalón o silla firme, manos en el suelo." },
    { n: "Flexiones arqueras", t: "reps", f: ["empuje"], lv: [3, 5], s: 4, r: "6 c/lado", rest: 120, tip: "Un brazo empuja, el otro se extiende recto al lado." },
    { n: "Pike push-ups", t: "reps", f: ["empuje"], lv: [1, 3], s: 3, r: "8-12", rest: 90, tip: "Cadera alta en V invertida, baja la cabeza entre las manos." },
    { n: "Flexiones de pino en pared", t: "reps", f: ["empuje"], lv: [3, 5], s: 4, r: "4-8", rest: 150, tip: "Pies apoyados en la pared, baja la cabeza con control." },
    { n: "Fondos entre sillas", t: "reps", f: ["empuje"], lv: [0, 2], s: 3, r: "10-15", rest: 60, tip: "Dos sillas firmes a la anchura de los hombros, baja hasta codos a 90°." },
    { n: "Fondos en paralelas", t: "reps", f: ["empuje"], lv: [2, 4], s: 4, r: "8-12", rest: 120, tip: "Baja hasta que el hombro pase la línea del codo." , bar: true },
    { n: "Flexiones a una mano (progresión)", t: "reps", f: ["empuje"], lv: [4, 5], s: 4, r: "3-5 c/lado", rest: 180, tip: "Piernas muy abiertas, la mano libre en la espalda." },
    { n: "Remo invertido", t: "reps", f: ["tiron"], lv: [0, 2], s: 3, r: "8-12", rest: 90, tip: "Bajo una barra baja o mesa firme, pecho a la barra." , bar: true },
    { n: "Dominadas asistidas", t: "reps", f: ["tiron"], lv: [0, 1], s: 3, r: "5-8", rest: 120, tip: "Usa banda elástica, o salta y baja muy lento." , bar: true },
    { n: "Dominadas", t: "reps", f: ["tiron"], lv: [2, 4], s: 4, r: "6-10", rest: 120, tip: "Desde brazos extendidos, barbilla sobre la barra." , bar: true },
    { n: "Dominadas supinas", t: "reps", f: ["tiron"], lv: [1, 4], s: 3, r: "6-10", rest: 120, tip: "Palmas hacia ti: más trabajo de bíceps." , bar: true },
    { n: "Dominadas arqueras", t: "reps", f: ["tiron"], lv: [4, 5], s: 4, r: "4 c/lado", rest: 180, tip: "Sube hacia una mano con el otro brazo casi recto." , bar: true },
    { n: "Muscle-up (progresión)", t: "reps", f: ["tiron", "explosivo"], lv: [4, 5], s: 4, r: "3-5", rest: 180, tip: "Dominada explosiva y transición por encima de la barra." , bar: true },
    { n: "Colgado activo", t: "tiempo", f: ["tiron"], lv: [0, 3], s: 3, r: "20-40s", rest: 60, tip: "Cuelga de la barra hundiendo los hombros hacia abajo." , bar: true },
    { n: "Plancha", t: "tiempo", f: ["core"], lv: [0, 2], s: 3, r: "30-45s", rest: 45, tip: "Codos bajo los hombros. Contrae glúteos y abdomen simultáneamente. No dejes caer las caderas ni las subas. Respira normalmente. Cuello neutro mirando al suelo." },
    { n: "Plancha lateral", t: "tiempo", f: ["core"], lv: [0, 3], s: 3, r: "20-30s c/lado", rest: 45, tip: "Cuerpo en línea, cadera alta todo el tiempo." },
    { n: "Crunch bicicleta", t: "reps", f: ["core"], lv: [0, 2], s: 3, r: "15 c/lado", rest: 45, tip: "Codo a la rodilla contraria, lento y controlado." },
    { n: "Elevaciones de piernas tumbado", t: "reps", f: ["core"], lv: [0, 2], s: 3, r: "10-15", rest: 60, tip: "Lumbar pegada al suelo, baja las piernas sin tocarlo." },
    { n: "Elevaciones de piernas colgado", t: "reps", f: ["core"], lv: [2, 4], s: 3, r: "8-12", rest: 90, tip: "Sin balanceo, sube las piernas rectas o las rodillas." , bar: true },
    { n: "Hollow body hold", t: "tiempo", f: ["core"], lv: [1, 4], s: 3, r: "20-40s", rest: 60, tip: "Forma de banana: lumbar al suelo, brazos y piernas extendidos." },
    { n: "L-sit (progresión)", t: "tiempo", f: ["core"], lv: [3, 5], s: 4, r: "10-20s", rest: 90, tip: "En paralelas o en el suelo, piernas rectas al frente." , bar: true },
    { n: "Dragon flag (progresión)", t: "reps", f: ["core"], lv: [4, 5], s: 3, r: "5-8", rest: 120, tip: "Sujétate de un poste y baja el cuerpo recto sin quebrar la cadera." , bar: true },
    { n: "Sentadillas", t: "reps", f: ["piernas"], lv: [0, 1], s: 3, r: "15-25", rest: 60, tip: "Baja profundo con los talones en el suelo." },
    { n: "Zancadas alternadas", t: "reps", f: ["piernas"], lv: [0, 2], s: 3, r: "10 c/pierna", rest: 60, tip: "Paso largo y torso vertical." },
    { n: "Sentadilla búlgara", t: "reps", f: ["piernas"], lv: [1, 4], s: 3, r: "10 c/pierna", rest: 90, tip: "Pie trasero apoyado en una silla firme o escalón." },
    { n: "Sentadilla sissy", t: "reps", f: ["piernas"], lv: [2, 4], s: 3, r: "8-12", rest: 90, tip: "Rodillas adelante y talones arriba; sujétate si hace falta." },
    { n: "Pistol squat asistida", t: "reps", f: ["piernas"], lv: [2, 4], s: 3, r: "5 c/pierna", rest: 120, tip: "Sujétate de un poste y baja a una pierna." },
    { n: "Pistol squat", t: "reps", f: ["piernas"], lv: [4, 5], s: 4, r: "5 c/pierna", rest: 120, tip: "Una pierna extendida al frente, baja completo." },
    { n: "Puente de glúteos a una pierna", t: "reps", f: ["piernas"], lv: [1, 3], s: 3, r: "12 c/pierna", rest: 60, tip: "Empuja con el talón y aguanta la cadera arriba 2 segundos." },
    { n: "Elevación de talones a una pierna", t: "reps", f: ["piernas"], lv: [0, 4], s: 3, r: "15 c/pierna", rest: 45, tip: "En un escalón: estira abajo y pausa arriba." },
    { n: "Burpees", t: "reps", f: ["explosivo"], lv: [0, 3], s: 3, r: "10-15", rest: 60, tip: "Pecho al suelo y salto con palmada arriba." },
    { n: "Sentadillas con salto", t: "reps", f: ["explosivo", "piernas"], lv: [0, 3], s: 3, r: "10-12", rest: 60, tip: "Aterriza suave con las rodillas flexionadas." },
    { n: "Flexiones con aplauso", t: "reps", f: ["explosivo", "empuje"], lv: [2, 5], s: 4, r: "6-10", rest: 120, tip: "Empuja explosivo, aplaude y amortigua la caída." },
    { n: "Zancadas con salto", t: "reps", f: ["explosivo", "piernas"], lv: [1, 4], s: 3, r: "8 c/pierna", rest: 90, tip: "Cambia de pierna en el aire y aterriza estable." },
    { n: "Escaladores rápidos", t: "tiempo", f: ["explosivo", "core"], lv: [0, 2], s: 3, r: "30s", rest: 45, tip: "Rodillas al pecho lo más rápido que puedas." },
    { n: "Burpee con rodillas al pecho", t: "reps", f: ["explosivo"], lv: [3, 5], s: 4, r: "8-12", rest: 90, tip: "En el salto, lleva las rodillas hasta el pecho." },
    { n: "Pseudo planche push-up", t: "reps", f: ["empuje"], lv: [3, 5], s: 4, r: "5-8", rest: 150, tip: "Manos a la altura de la cadera, inclínate muy adelante." },
    { n: "Flexiones hindú (dive bomber)", t: "reps", f: ["empuje"], lv: [2, 4], s: 3, r: "8-12", rest: 90, tip: "Dibuja una ola con el cuerpo, de V invertida a cobra." },
    { n: "Flexiones espartanas", t: "reps", f: ["empuje"], lv: [1, 3], s: 3, r: "10-12", rest: 90, tip: "Una mano adelantada y otra atrasada, alterna cada serie." },
    { n: "Wall walk", t: "reps", f: ["empuje", "core"], lv: [2, 4], s: 3, r: "4-6", rest: 120, tip: "Camina con las manos hacia la pared hasta quedar casi vertical." },
    { n: "Australian pull-up agarre ancho", t: "reps", f: ["tiron"], lv: [1, 3], s: 3, r: "10-12", rest: 90, tip: "Codos abiertos, tira del pecho hacia la barra baja." , bar: true },
    { n: "Negative muscle-up", t: "reps", f: ["tiron"], lv: [3, 5], s: 3, r: "3-5", rest: 180, tip: "Empieza arriba de la barra y baja lo más lento posible." , bar: true },
    { n: "Typewriter pull-up", t: "reps", f: ["tiron"], lv: [4, 5], s: 3, r: "4-6", rest: 180, tip: "Arriba de la dominada, desplázate de mano a mano." , bar: true },
    { n: "Dominadas comando", t: "reps", f: ["tiron"], lv: [3, 5], s: 3, r: "6-8", rest: 150, tip: "Agarre mixto en línea, alterna la cabeza a cada lado." , bar: true },
    { n: "Skin the cat", t: "reps", f: ["tiron", "core"], lv: [3, 5], s: 3, r: "3-5", rest: 120, tip: "Rota el cuerpo entre los brazos con control total." , bar: true },
    { n: "Toes to bar", t: "reps", f: ["core"], lv: [3, 5], s: 3, r: "6-10", rest: 90, tip: "Lleva los pies hasta tocar la barra sin balanceo." , bar: true },
    { n: "V-ups", t: "reps", f: ["core"], lv: [1, 3], s: 3, r: "10-15", rest: 60, tip: "Manos y pies se encuentran arriba, cuerpo en V." },
    { n: "Arch body hold", t: "tiempo", f: ["core"], lv: [1, 4], s: 3, r: "20-30s", rest: 60, tip: "Boca abajo, despega pecho y piernas del suelo." },
    { n: "Superman con pausa", t: "reps", f: ["core"], lv: [0, 2], s: 3, r: "12", rest: 45, tip: "Aguanta 2 segundos arriba en cada repetición." },
    { n: "Puente completo", t: "tiempo", f: ["core", "piernas"], lv: [2, 4], s: 3, r: "15-20s", rest: 90, tip: "Empuja la cadera al cielo, abre bien los hombros." },
    { n: "Sentadilla cosaca", t: "reps", f: ["piernas"], lv: [2, 4], s: 3, r: "6 c/lado", rest: 90, tip: "Peso a una pierna, la otra estirada al lado." },
    { n: "Step-up en escalón", t: "reps", f: ["piernas"], lv: [0, 2], s: 3, r: "10 c/pierna", rest: 60, tip: "Un escalón o silla firme a la altura de la rodilla, sube controlado." },
    { n: "Broad jumps", t: "reps", f: ["explosivo", "piernas"], lv: [1, 4], s: 3, r: "6", rest: 90, tip: "Salta lo más lejos posible y aterriza estable." },
    { n: "Sprawls", t: "reps", f: ["explosivo"], lv: [0, 2], s: 3, r: "12", rest: 60, tip: "Como burpee sin flexión: cae, extiende y levántate rápido." },
    { n: "High knees a máxima velocidad", t: "tiempo", f: ["explosivo"], lv: [0, 2], s: 3, r: "20s", rest: 45, tip: "Rodillas a la cadera con braceo rápido." },
  ],
  futbolGym: [
    { n: "Sentadilla con salto (carga ligera)", t: "peso", f: ["velocidad", "salto"], lv: [1, 4], s: 4, r: "5-6", rest: 120, tip: "Mancuernas ligeras, salta con máxima intención." },
    { n: "Subida explosiva al cajón", t: "reps", f: ["velocidad"], lv: [0, 3], s: 3, r: "6 c/pierna", rest: 90, tip: "Sube con potencia, baja con control." },
    { n: "Sprint en cinta (intervalos)", t: "tiempo", f: ["velocidad", "resistencia"], lv: [0, 5], s: 4, r: "20s fuerte / 40s suave", rest: 60, tip: "Acelera progresivo con braceo firme." },
    { n: "Swing con mancuerna", t: "peso", f: ["velocidad", "fuerza"], lv: [1, 4], s: 4, r: "12-15", rest: 90, tip: "El impulso nace de la cadera, no de los brazos." },
    { n: "Empuje de trineo (o caminata con carga)", t: "peso", f: ["velocidad", "resistencia"], lv: [2, 5], s: 4, r: "20 m", rest: 120, tip: "Zancadas potentes con el torso inclinado adelante." },
    { n: "Salto al cajón", t: "reps", f: ["salto"], lv: [0, 4], s: 4, r: "5", rest: 90, tip: "Aterriza suave y en silencio; baja caminando." },
    { n: "Salto vertical con contramovimiento", t: "reps", f: ["salto"], lv: [0, 3], s: 3, r: "6", rest: 90, tip: "Baja rápido y explota hacia arriba usando los brazos." },
    { n: "Saltos a una pierna (bounds)", t: "reps", f: ["salto", "velocidad"], lv: [2, 5], s: 3, r: "5 c/pierna", rest: 120, tip: "Busca distancia con aterrizaje estable en cada salto." },
    { n: "Saltos de tobillo (pogo)", t: "reps", f: ["salto"], lv: [0, 2], s: 3, r: "15", rest: 60, tip: "Rodillas casi rectas, rebota con los tobillos." },
    { n: "Salto profundo desde escalón", t: "reps", f: ["salto"], lv: [3, 5], s: 3, r: "5", rest: 150, tip: "Cae del escalón y salta al instante: contacto mínimo con el suelo." },
    { n: "Sentadilla con barra", t: "peso", f: ["fuerza"], lv: [1, 5], s: 4, r: "5-8", rest: 180, tip: "La base de la potencia de pierna. Técnica primero." },
    { n: "Peso muerto rumano", t: "peso", f: ["fuerza"], lv: [1, 5], s: 3, r: "8-10", rest: 120, tip: "Femorales fuertes previenen desgarros al sprintar." },
    { n: "Hip thrust", t: "peso", f: ["fuerza", "velocidad"], lv: [1, 5], s: 4, r: "8-10", rest: 120, tip: "El glúteo es tu motor de aceleración." },
    { n: "Sentadilla búlgara con mancuernas", t: "peso", f: ["fuerza", "estabilidad"], lv: [1, 4], s: 3, r: "8 c/pierna", rest: 120, tip: "Fuerza a una pierna: así se corre en el campo." },
    { n: "Curl nórdico asistido", t: "reps", f: ["fuerza"], lv: [2, 5], s: 3, r: "4-6", rest: 120, tip: "Baja lo más lento posible para proteger los femorales." },
    { n: "Prensa a una pierna", t: "peso", f: ["fuerza"], lv: [0, 4], s: 3, r: "10 c/pierna", rest: 90, tip: "Rango completo sin despegar la cadera del asiento." },
    { n: "Elevación de talones con peso", t: "peso", f: ["fuerza", "salto"], lv: [0, 5], s: 4, r: "12-15", rest: 60, tip: "Pantorrillas fuertes = más sprint y más salto." },
    { n: "Plancha lateral con elevación de pierna", t: "tiempo", f: ["estabilidad"], lv: [0, 3], s: 3, r: "20s c/lado", rest: 45, tip: "Cadera alta y pierna superior elevada." },
    { n: "Peso muerto a una pierna con mancuerna", t: "peso", f: ["estabilidad", "fuerza"], lv: [1, 4], s: 3, r: "8 c/pierna", rest: 90, tip: "Cadera cuadrada: equilibrio antes que peso." },
    { n: "Pallof press en polea", t: "peso", f: ["estabilidad"], lv: [1, 4], s: 3, r: "10 c/lado", rest: 60, tip: "Resiste la rotación con los brazos extendidos al frente." },
    { n: "Sentadilla a una pierna al banco", t: "reps", f: ["estabilidad", "fuerza"], lv: [0, 3], s: 3, r: "8 c/pierna", rest: 90, tip: "Baja al banco sin dejarte caer, rodilla alineada." },
    { n: "Plancha con arrastre de mancuerna", t: "reps", f: ["estabilidad"], lv: [1, 4], s: 3, r: "10", rest: 60, tip: "La cadera no gira mientras cruzas la mancuerna." },
    { n: "Bicicleta estática (intervalos)", t: "tiempo", f: ["resistencia"], lv: [0, 5], s: 4, r: "30s fuerte / 60s suave", rest: 60, tip: "Piernas rápidas y respiración con ritmo." },
    { n: "Remo en máquina (intervalos)", t: "tiempo", f: ["resistencia"], lv: [0, 5], s: 4, r: "250 m", rest: 90, tip: "Empuja con las piernas primero, luego tira con los brazos." },
    { n: "Farmer walk", t: "peso", f: ["resistencia", "estabilidad"], lv: [1, 5], s: 3, r: "30 m", rest: 90, tip: "Mancuernas pesadas, camina erguido sin balancearte." },
    { n: "Step-ups continuos", t: "reps", f: ["resistencia", "fuerza"], lv: [0, 3], s: 3, r: "15 c/pierna", rest: 60, tip: "Ritmo constante: empuja siempre con la pierna de arriba." },
    { n: "Peso muerto con mancuernas explosivo", t: "peso", f: ["fuerza", "velocidad"], lv: [1, 4], s: 4, r: "6", rest: 120, tip: "Sube rápido con intención, baja en 2 segundos." },
    { n: "Sentadilla frontal", t: "peso", f: ["fuerza"], lv: [2, 5], s: 4, r: "4-6", rest: 180, tip: "Torso vertical: transfiere directo al salto." },
    { n: "Zancada lateral con mancuerna", t: "peso", f: ["estabilidad", "fuerza"], lv: [1, 4], s: 3, r: "8 c/lado", rest: 90, tip: "Como un cambio de dirección cargado." },
    { n: "Salto con giro de 90°", t: "reps", f: ["salto", "estabilidad"], lv: [1, 4], s: 3, r: "5 c/lado", rest: 90, tip: "Gira en el aire y aterriza clavado, sin pasos extra." },
    { n: "Skater jumps", t: "reps", f: ["salto", "estabilidad"], lv: [1, 4], s: 3, r: "8 c/lado", rest: 90, tip: "Salta lateral de pierna a pierna como un patinador." },
    { n: "Lanzamiento de balón medicinal al pecho", t: "reps", f: ["velocidad"], lv: [1, 4], s: 4, r: "6", rest: 90, tip: "Lanza contra la pared con toda tu potencia." },
    { n: "Slam de balón medicinal", t: "reps", f: ["velocidad", "resistencia"], lv: [1, 4], s: 3, r: "10", rest: 90, tip: "Azota el balón al suelo usando todo el cuerpo." },
    { n: "Rotación explosiva con balón medicinal", t: "reps", f: ["estabilidad"], lv: [1, 4], s: 3, r: "8 c/lado", rest: 90, tip: "Gira desde la cadera, como un disparo potente." },
    { n: "Hip thrust a una pierna", t: "peso", f: ["fuerza", "estabilidad"], lv: [2, 5], s: 3, r: "8 c/pierna", rest: 120, tip: "Cadera arriba sin que se caiga hacia un lado." },
    { n: "Remo renegado", t: "peso", f: ["estabilidad"], lv: [2, 5], s: 3, r: "8 c/brazo", rest: 90, tip: "En plancha con mancuernas, rema sin girar la cadera." },
    { n: "Isométrico de sóleo en pared", t: "tiempo", f: ["fuerza"], lv: [0, 3], s: 3, r: "30s", rest: 60, tip: "Talones arriba con rodillas flexionadas contra la pared." },
    { n: "Elevaciones de tibial", t: "reps", f: ["fuerza"], lv: [0, 3], s: 3, r: "15", rest: 45, tip: "Espalda en la pared, sube las puntas de los pies." },
    { n: "Sentadilla en pared con disco", t: "tiempo", f: ["fuerza", "resistencia"], lv: [0, 3], s: 3, r: "40s", rest: 60, tip: "Disco al pecho, muslos paralelos al suelo." },
    { n: "Escaladores con deslizadores", t: "tiempo", f: ["estabilidad", "resistencia"], lv: [1, 3], s: 3, r: "30s", rest: 60, tip: "Desliza los pies con toallas, cadera estable." },
    { n: "Cuerdas de batalla", t: "tiempo", f: ["resistencia"], lv: [1, 5], s: 4, r: "20s fuerte", rest: 60, tip: "Olas potentes y constantes con todo el cuerpo." },
  ],
  futbolParque: [
    { n: "Tiros de potencia a portería o pared", t: "reps", f: ["tiro"], lv: [0, 5], s: 4, r: "8 c/pierna", rest: 90, tip: "Pie de apoyo junto al balón, golpea con el empeine firme." },
    { n: "Tiro tras conducción", t: "reps", f: ["tiro", "regate"], lv: [1, 4], s: 3, r: "8", rest: 90, tip: "Conduce 10 m, levanta la vista y define." },
    { n: "Tiro de primera contra pared", t: "reps", f: ["tiro"], lv: [1, 5], s: 3, r: "10", rest: 90, tip: "Pásala a la pared y remata el rebote sin controlar." },
    { n: "Precisión a las esquinas", t: "reps", f: ["tiro"], lv: [0, 5], s: 3, r: "10", rest: 60, tip: "Marca objetivos (botellas o zonas) y apunta con el interior." },
    { n: "Vaselinas y tiro colocado", t: "reps", f: ["tiro"], lv: [2, 5], s: 3, r: "8", rest: 60, tip: "Menos fuerza y más precisión: acaricia el balón." },
    { n: "Slalom entre conos", t: "reps", f: ["regate"], lv: [0, 4], s: 4, r: "6 pasadas", rest: 60, tip: "Toques cortos con ambos pies, balón siempre pegado." },
    { n: "Toques rápidos entre dos conos", t: "tiempo", f: ["regate"], lv: [0, 3], s: 3, r: "30s", rest: 45, tip: "Suela e interior, lo más rápido que puedas." },
    { n: "Recortes en V", t: "reps", f: ["regate", "ritmo"], lv: [1, 4], s: 3, r: "10", rest: 60, tip: "Arrastra el balón atrás y sal en diagonal explosivo." },
    { n: "Elásticas y bicicletas", t: "reps", f: ["regate"], lv: [2, 5], s: 3, r: "10 c/pie", rest: 60, tip: "Primero lento y perfecto, luego a velocidad de partido." },
    { n: "Conducción con la pierna mala", t: "reps", f: ["regate"], lv: [0, 2], s: 3, r: "5 pasadas", rest: 60, tip: "Solo la pierna no dominante, en recta y en curvas." },
    { n: "Aceleraciones de 10 m desde trote", t: "reps", f: ["ritmo", "velocidad"], lv: [0, 4], s: 4, r: "6", rest: 90, tip: "Trota suave y explota al pasar el cono." },
    { n: "Cambio de ritmo con balón", t: "reps", f: ["ritmo", "regate"], lv: [1, 5], s: 4, r: "6", rest: 90, tip: "Conduce lento, toque largo y sprint tras el balón." },
    { n: "Skipping alto + sprint", t: "reps", f: ["ritmo"], lv: [0, 3], s: 3, r: "5", rest: 90, tip: "10 m de rodillas altas y 15 m de sprint." },
    { n: "Ida y vuelta 5-10-5", t: "reps", f: ["ritmo", "velocidad"], lv: [1, 5], s: 4, r: "4", rest: 120, tip: "Frena bajando la cadera, gira y explota." },
    { n: "Sprints de 30 m", t: "reps", f: ["velocidad"], lv: [0, 5], s: 5, r: "4-6", rest: 120, tip: "Recupera completo entre sprints: calidad, no cantidad." },
    { n: "Sprints en cuesta", t: "reps", f: ["velocidad"], lv: [2, 5], s: 4, r: "5", rest: 150, tip: "Cuesta corta y empinada; baja caminando." },
    { n: "Escalera de agilidad (o líneas en el suelo)", t: "tiempo", f: ["velocidad", "regate"], lv: [0, 3], s: 3, r: "30s", rest: 60, tip: "Pies rápidos y mirada al frente." },
    { n: "Sprint con salida desde el suelo", t: "reps", f: ["velocidad"], lv: [1, 4], s: 4, r: "4", rest: 120, tip: "Túmbate boca abajo, levántate y sprinta 20 m." },
    { n: "Carrera continua", t: "tiempo", f: ["resistencia"], lv: [0, 3], s: 1, r: "20-30 min", rest: 0, tip: "Ritmo cómodo: deberías poder hablar mientras corres." },
    { n: "Fartlek", t: "tiempo", f: ["resistencia", "ritmo"], lv: [1, 5], s: 1, r: "20 min", rest: 0, tip: "Alterna 1 minuto fuerte y 2 suaves sin parar." },
    { n: "Intervalos 4x4", t: "tiempo", f: ["resistencia"], lv: [2, 5], s: 4, r: "4 min fuerte", rest: 180, tip: "Al 85-90% de tu máximo; recupera trotando." },
    { n: "Circuito toques + carrera", t: "reps", f: ["resistencia", "regate"], lv: [0, 3], s: 3, r: "3 vueltas", rest: 90, tip: "30 toques al balón y 100 m de carrera, sin pausa." },
    { n: "Tiro con la pierna mala", t: "reps", f: ["tiro"], lv: [1, 4], s: 3, r: "10", rest: 60, tip: "Empieza cerca de la portería y aléjate al mejorar." },
    { n: "Volea tras auto-pase", t: "reps", f: ["tiro"], lv: [2, 5], s: 3, r: "8", rest: 90, tip: "Lánzate el balón con las manos y define de volea." },
    { n: "Toques de primera contra pared alternando pies", t: "reps", f: ["tiro", "regate"], lv: [1, 4], s: 3, r: "20", rest: 60, tip: "Un toque por pie, sin dejar que el balón se pare." },
    { n: "Control orientado tras rebote", t: "reps", f: ["regate"], lv: [1, 4], s: 3, r: "10", rest: 60, tip: "Recibe de la pared y sal orientado en un toque." },
    { n: "Croqueta en espacio corto", t: "reps", f: ["regate"], lv: [2, 5], s: 3, r: "10", rest: 60, tip: "Pasa el balón de pie a pie rápido y avanza." },
    { n: "Ruleta a ritmo", t: "reps", f: ["regate"], lv: [2, 5], s: 3, r: "8", rest: 60, tip: "Gira sobre el balón sin perder velocidad." },
    { n: "Freno de suela y salida", t: "reps", f: ["regate", "ritmo"], lv: [0, 3], s: 3, r: "10", rest: 60, tip: "Pisa el balón, pausa y explota en otra dirección." },
    { n: "Conducción a máxima velocidad", t: "reps", f: ["regate", "velocidad"], lv: [1, 4], s: 4, r: "4 x 30 m", rest: 90, tip: "Toques largos pero controlados, cabeza arriba al final." },
    { n: "Juego de sombra", t: "tiempo", f: ["regate", "ritmo"], lv: [0, 3], s: 3, r: "45s", rest: 60, tip: "Imagina rivales y encadena regates a ritmo de partido." },
    { n: "Sprint con cambio de dirección a 45°", t: "reps", f: ["velocidad", "ritmo"], lv: [1, 4], s: 4, r: "5", rest: 120, tip: "Planta el pie exterior y corta sin frenar de más." },
    { n: "Carioca", t: "tiempo", f: ["velocidad"], lv: [0, 2], s: 3, r: "20 m c/lado", rest: 60, tip: "Paso cruzado lateral, caderas sueltas." },
    { n: "Skipping lateral + sprint", t: "reps", f: ["velocidad"], lv: [0, 3], s: 3, r: "5", rest: 90, tip: "10 m laterales y giro a sprint frontal." },
    { n: "Saltitos de coordinación sobre líneas", t: "tiempo", f: ["ritmo"], lv: [0, 2], s: 3, r: "30s", rest: 45, tip: "Adelante-atrás y lado a lado, pies veloces." },
    { n: "Shuttle runs 20 m", t: "reps", f: ["resistencia", "velocidad"], lv: [0, 4], s: 4, r: "6 idas", rest: 90, tip: "Toca la línea en cada ida, ritmo constante." },
    { n: "Cuesta arriba con balón", t: "reps", f: ["resistencia", "regate"], lv: [2, 5], s: 3, r: "5 subidas", rest: 120, tip: "Conduce cuesta arriba, baja trotando sin balón." },
  ],
};

/* ─── Lista plana de todos los ejercicios disponibles (para el creador de rutinas) ─── */
const ALL_EXERCISES_FLAT = (() => {
  const map = new Map();
  Object.values(EXDB).forEach((arr) => arr.forEach((e) => { if (!map.has(e.n)) map.set(e.n, { name: e.n, type: e.t, tip: e.tip }); }));
  Object.values(ATLETISMO_EXDB).forEach((arr) => arr.forEach((e) => { if (!map.has(e.n)) map.set(e.n, { name: e.n, type: e.t, tip: e.tip }); }));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

/* ─── Secciones de Cuerpo (acondicionamiento) ─── */
const BODY_SECTIONS = [
  {
    id: "movilidad", name: "Movilidad general", icon: "🔄", color: C.cyan, mins: 10,
    desc: "Rutina diaria de 10 minutos",
    items: [
      { n: "Gato-vaca", d: "45s" },
      { n: "Círculos de cadera", d: "30s c/lado" },
      { n: "Zancada con rotación de torso", d: "5 c/lado" },
      { n: "Rotaciones torácicas de rodillas", d: "8 c/lado" },
      { n: "Sentadilla profunda sostenida", d: "60s" },
      { n: "Círculos de brazos y hombros", d: "30s" },
      { n: "Balanceos de pierna", d: "12 c/pierna" },
    ],
  },
  {
    id: "flex", name: "Elasticidad y flexibilidad", icon: "🧘", color: C.purple, mins: 15,
    desc: "Estiramientos profundos",
    items: [
      { n: "Isquiotibiales de pie", d: "60s c/pierna" },
      { n: "Flexor de cadera en zancada", d: "60s c/lado" },
      { n: "Postura de la paloma", d: "60s c/lado" },
      { n: "Mariposa sentado", d: "60s" },
      { n: "Torsión espinal tumbado", d: "45s c/lado" },
      { n: "Postura del niño", d: "60s" },
      { n: "Pecho en marco de puerta", d: "45s" },
    ],
  },
  {
    id: "tobillos", name: "Tobillos", icon: "🦶", color: C.green, mins: 12,
    desc: "Fases de rehabilitación y fuerza",
    items: [
      { n: "Fase 1 · Alfabeto con el pie", d: "1 vez c/pie" },
      { n: "Fase 1 · Círculos de tobillo", d: "15 c/dirección" },
      { n: "Fase 2 · Elevaciones de talón sentado", d: "15" },
      { n: "Fase 2 · Flexión dorsal con banda o manual", d: "12" },
      { n: "Fase 3 · Equilibrio a una pierna", d: "30s c/pie" },
      { n: "Fase 3 · Equilibrio con ojos cerrados", d: "15s c/pie" },
      { n: "Fase 4 · Saltos suaves a dos pies", d: "2x10" },
    ],
  },
  {
    id: "hombros", name: "Hombros", icon: "💪", color: C.orange, mins: 10,
    desc: "Movilidad y prevención",
    items: [
      { n: "Dislocaciones con palo o toalla", d: "12" },
      { n: "Rotaciones externas con banda o botella", d: "15 c/brazo" },
      { n: "Deslizamientos en pared", d: "12" },
      { n: "Y-T-W en el suelo", d: "8 c/letra" },
      { n: "Colgado pasivo de barra", d: "30s" },
      { n: "Círculos de brazos con pausa atrás", d: "10 c/dirección" },
    ],
  },
  {
    id: "munecas", name: "Muñecas", icon: "✋", color: C.yellow, mins: 8,
    desc: "Movilidad y fortalecimiento",
    items: [
      { n: "Círculos de muñeca", d: "20 c/dirección" },
      { n: "Estiramiento de flexores (palma arriba)", d: "30s c/mano" },
      { n: "Estiramiento de extensores (palma abajo)", d: "30s c/mano" },
      { n: "Apoyo progresivo en el suelo", d: "45s" },
      { n: "Elevaciones con botella o peso ligero", d: "15 c/mano" },
      { n: "Rebotes suaves en cuadrupedia", d: "20" },
    ],
  },
  {
    id: "rodillas", name: "Rodillas", icon: "🦵", color: C.blue, mins: 12,
    desc: "Estabilidad y prevención",
    items: [
      { n: "Sentadilla española isométrica", d: "30s x3" },
      { n: "Step-down controlado en escalón", d: "10 c/pierna" },
      { n: "Extensión terminal de rodilla (banda o isométrico)", d: "15 c/pierna" },
      { n: "Sentadilla sissy asistida suave", d: "8" },
      { n: "Wall sit", d: "45s" },
      { n: "Elevación de pierna recta tumbado", d: "12 c/pierna" },
    ],
  },
  {
    id: "prevencion", name: "Prevención de lesiones", icon: "🛡️", color: C.red, mins: 12,
    desc: "Rutina general anti-lesiones",
    items: [
      { n: "Puente de glúteos con pausa", d: "15" },
      { n: "Curl femoral con deslizamiento de talones", d: "10" },
      { n: "Caminata lateral en media sentadilla", d: "10 pasos c/lado" },
      { n: "Elevación lateral de cadera (plancha corta)", d: "10 c/lado" },
      { n: "Plancha frontal", d: "40s" },
      { n: "Respiración diafragmática profunda", d: "10 respiraciones" },
    ],
  },
];

/* ─── Comparativas motivacionales (sin nombres reales) ─── */
const COMPARATIVES = [
  { icon: "🏋️", text: "El humano más fuerte del mundo ha levantado 501 kg del suelo.", stat: "maxWeight" },
  { icon: "⚡", text: "El más rápido del mundo corre los 100 m en 9.58 segundos.", stat: null },
  { icon: "🦘", text: "El mejor saltador del mundo supera una barra a 2.45 m de altura.", stat: null },
  { icon: "🦍", text: "Un gorila adulto podría hacer dominadas cargando más de 200 kg.", stat: "maxReps" },
];

/* ─── Rangos por ejercicio ─── */
const EXRANKS = [
  { min: 15, name: "Leyenda", color: C.red },
  { min: 8, name: "Campeón", color: C.yellow },
  { min: 3, name: "Guerrero", color: C.green },
  { min: 0, name: "Novato", color: C.mut },
];

/* ─── Comparativas expandidas por disciplina ─── */
const WEIGHT_SCALE = [
  { min: 250, emoji: "🐻‍❄️", label: "Un oso polar" },
  { min: 200, emoji: "🐂", label: "Un toro de lidia" },
  { min: 150, emoji: "🎹", label: "Un piano de cola" },
  { min: 100, emoji: "🐻", label: "Un oso pardo" },
  { min: 80, emoji: "🧑", label: "Una persona promedio" },
  { min: 50, emoji: "📺", label: "Un televisor de 65 pulgadas" },
  { min: 20, emoji: "✈️", label: "Una maleta llena de ropa" },
  { min: 0, emoji: "🪶", label: "Todavía calentando" },
];
const PULLUP_SCALE = [
  { min: 30, emoji: "🦍", label: "Nivel gorila" },
  { min: 20, emoji: "🦧", label: "Nivel orangután" },
  { min: 10, emoji: "🐒", label: "Nivel chimpancé (proporcionalmente)" },
  { min: 0, emoji: "🧑", label: "Nivel humano promedio" },
];
const SPRINT_SCALE = [
  { max: 10, emoji: "⚡", label: "Territorio de los mejores del mundo" },
  { max: 10.5, emoji: "🏃", label: "Nivel atleta olímpico aficionado" },
  { max: 11, emoji: "🐘", label: "Velocidad de un elefante en carrera" },
  { max: 12, emoji: "🐻", label: "Velocidad de un oso corriendo" },
  { max: Infinity, emoji: "🐕", label: "Más lento que un perro labrador" },
];
function pickScale(scale, value, key = "min") {
  return scale.find((s) => (key === "min" ? value >= s.min : value <= s[key]));
}

/* ─── Utilidades ─── */
const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function calcStreak(sessions, frozen = []) {
  const days = new Set([...sessions.map((s) => dayKey(s.ts)), ...frozen]);
  let streak = 0;
  const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* Racha de la última cadena de días (aunque ya esté rota) */
function lastChainStreak(sessions, frozen = []) {
  if (!sessions.length) return 0;
  const days = new Set([...sessions.map((s) => dayKey(s.ts)), ...frozen]);
  const d = new Date(Math.max(...sessions.map((s) => s.ts)));
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* RNG con semilla: misma semilla → misma rutina; cambia cada 3 sesiones */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const todayKey = () => dayKey(Date.now());
const seedNow = () => Date.now();

/* ─── Audio (Web Audio API, sin librerías) ───
   El contexto se crea dentro de un gesto del usuario para funcionar en móvil */
let audioCtx = null;
function ensureAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* sin audio disponible */
  }
}
function beep(freq, dur, vol, delay = 0) {
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch {
    /* silencioso */
  }
}
/* Triple beep al terminar el descanso: 880 Hz, 150 ms, separados 200 ms */
const tripleBeep = () => {
  beep(880, 0.15, 0.3, 0);
  beep(880, 0.15, 0.3, 0.35);
  beep(880, 0.15, 0.3, 0.7);
};
/* Aviso suave a 3 segundos del final */
const softBeep = () => beep(440, 0.1, 0.15, 0);

/* ─── Sonido ambiental de fondo (Web Audio, sin archivos externos) ─── */
function generateAmbientSound(mode) {
  if (!audioCtx) return { stop() {} };
  try {
    if (mode === "atletismo") {
      /* Pulso rítmico simulando cadencia de 120 pasos/min (cada 500ms) */
      const id = setInterval(() => beep(300, 0.04, 0.06, 0), 500);
      return { stop() { clearInterval(id); } };
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    if (mode === "gym") {
      osc.frequency.value = 60;
      gain.gain.value = 0.05;
    } else {
      osc.frequency.value = 432;
      gain.gain.value = 0.03;
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.1;
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      return { stop() { try { osc.stop(); lfo.stop(); } catch { /* ya detenido */ } } };
    }
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    return { stop() { try { osc.stop(); } catch { /* ya detenido */ } } };
  } catch {
    return { stop() {} };
  }
}

/* ─── Voz sintetizada (Web Speech API, gratis, sin API key) ─── */
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = 0.9;
    u.pitch = 1.1;
    const voice = voices.find((v) => v.lang === "es-MX") || voices.find((v) => v.lang === "es-ES") || voices.find((v) => v.lang?.startsWith("es"));
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* voz no disponible */
  }
}

/* ─── Categoría de movimiento según el nombre del ejercicio (para el SVG animado) ─── */
function movementCategory(name) {
  const n = name.toLowerCase();
  if (/flexion|press|fondo/.test(n)) return "empuje";
  if (/domin|remo|jalón|jalon|tirón|tiron/.test(n)) return "tiron";
  if (/sentadill|zancada|squat|pistol/.test(n)) return "sentadilla";
  if (/plancha|abdomin|core|l-sit|hollow/.test(n)) return "core";
  if (/sprint|corre|carrera|velocidad/.test(n)) return "sprint";
  if (/salto|jump|pliom|cajón|cajon/.test(n)) return "salto";
  return "generic";
}

const MOVEMENT_COLORS = {
  empuje: "#FFFFFF", tiron: "#00E5FF", sentadilla: "#22FF88",
  core: "#FFD600", sprint: "#FF7A2F", salto: "#A855F7", generic: "#8A8AAD",
};

/* Convierte "30-45s", "20 min", "300 m" en segundos objetivo (o null si no aplica) */
function parseTargetSeconds(reps) {
  if (!reps) return null;
  const min = reps.match(/(\d+)\s*min/);
  if (min) return parseInt(min[1], 10) * 60;
  const sec = reps.match(/(\d+)(?:-(\d+))?\s*s(?:eg)?\b/);
  if (sec) return parseInt(sec[2] || sec[1], 10);
  return null;
}

/* Estado del streak freeze y de la racha rota */
function computeFreezeInfo(sessions, freezes) {
  const daySet = new Set([...sessions.map((s) => dayKey(s.ts)), ...freezes]);
  const trainedToday = daySet.has(dayKey(Date.now()));
  const trainedYest = daySet.has(dayKey(Date.now() - 86400000));
  const chainEndedDayBefore = daySet.has(dayKey(Date.now() - 2 * 86400000));
  const used = store.get("freezes_used", null);
  const now = new Date();
  const usedThisMonth = used && used.month === now.getMonth() && used.year === now.getFullYear() && used.count >= 1;
  const lost = lastChainStreak(sessions, freezes);
  return {
    canFreeze: !trainedYest && chainEndedDayBefore && !usedThisMonth && lost > 0,
    broken: !trainedToday && !trainedYest && lost > 0 ? { lost } : null,
  };
}

/* Sugerencia de peso según la última vez que se hizo el ejercicio */
function weightSuggestion(sessions, exName) {
  const entries = [];
  sessions.forEach((s) => {
    if (s.kind !== "entreno") return;
    s.exercises.forEach((e) => {
      if (e.name === exName && e.sets.length) entries.push({ ts: s.ts, sets: e.sets });
    });
  });
  if (!entries.length) return null;
  entries.sort((a, b) => a.ts - b.ts);
  const last = entries[entries.length - 1];
  const maxW = Math.max(...last.sets.map((x) => x.weight || 0));
  if (maxW <= 0) return null;
  const allOk = last.sets.every((x) => x.ok);
  return { weight: allOk ? maxW + 2.5 : maxW, up: allOk };
}

/* ─── Orden de disciplinas para agrupar récords ─── */
const DISC_ORDER = ["gimnasio", "calistenia", "futbolGym", "futbolParque", "atletismo", "especial", "custom"];

/* ─── Récords personales por ejercicio (mejor marca histórica) ─── */
function computeRecords(sessions) {
  const map = {};
  sessions.filter((s) => s.kind === "entreno").forEach((s) => {
    s.exercises.forEach((e) => {
      e.sets.forEach((st) => {
        if (!st.ok) return;
        const score = st.weight > 0 ? st.weight * 1000 + st.reps : st.reps;
        const cur = map[e.name];
        if (!cur || score > cur.score) {
          map[e.name] = { name: e.name, weight: st.weight, reps: st.reps, ts: s.ts, disc: s.disc, score };
        }
      });
    });
  });
  const list = Object.values(map);
  list.sort((a, b) => {
    const oa = DISC_ORDER.indexOf(a.disc);
    const ob = DISC_ORDER.indexOf(b.disc);
    if (oa !== ob) return (oa === -1 ? 99 : oa) - (ob === -1 ? 99 : ob);
    return b.score - a.score;
  });
  store.set("records", list);
  return list;
}

/* ─── Historial de un ejercicio concreto (para la pantalla de detalle) ─── */
function exerciseHistory(sessions, name) {
  const rows = [];
  sessions.filter((s) => s.kind === "entreno").forEach((s) => {
    s.exercises.forEach((e) => {
      if (e.name !== name) return;
      const okSets = e.sets.filter((st) => st.ok);
      if (!okSets.length) return;
      const best = okSets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      rows.push({ ts: s.ts, weight: best.weight, reps: best.reps });
    });
  });
  rows.sort((a, b) => a.ts - b.ts);
  const last10 = rows.slice(-10);
  const metricOf = (r) => (r.weight > 0 ? r.weight : r.reps);
  let trend = "estable";
  if (rows.length >= 6) {
    const recent3 = rows.slice(-3).map(metricOf);
    const prev3 = rows.slice(-6, -3).map(metricOf);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const diff = avg(recent3) - avg(prev3);
    if (diff > 0.5) trend = "mejorando";
    else if (diff < -0.5) trend = "bajando";
  }
  const maxMetric = Math.max(...rows.map(metricOf), 0);
  return { rows: last10, trend, isRecordRow: (r) => metricOf(r) >= maxMetric };
}

/* ─── Ejercicios de gimnasio que requieren máquinas/barras/poleas ─── */
function requiresGymEquipment(name) {
  return /barra|m[aá]quina|polea/i.test(name);
}

/* ═══════════════════ v5: LOGROS, XP Y ESTADÍSTICAS ÉPICAS ═══════════════════ */

/* Longitud de la cadena de días más larga en todo el historial (no solo la actual) */
function longestStreakEver(sessions) {
  const days = [...new Set(sessions.map((s) => dayKey(s.ts)))]
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    })
    .sort((a, b) => a - b);
  if (!days.length) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === 86400000) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

/* Volumen total (kg) de una sesión de entreno */
function sessionVolume(s) {
  return s.exercises.flatMap((e) => e.sets).filter((st) => st.ok).reduce((a, st) => a + st.weight * st.reps, 0);
}

/* ─── Definición de logros ─── */
const ACHIEVEMENTS = [
  { id: "first", emoji: "🪨", name: "Primera piedra", desc: "Completa tu primera sesión", secret: false,
    check: (st) => st.totalSessions >= 1 },
  { id: "week", emoji: "⭐", name: "Semana perfecta", desc: "7 días seguidos entrenando", secret: false,
    check: (st) => st.bestStreak >= 7 },
  { id: "month", emoji: "🔩", name: "Mes de hierro", desc: "30 días seguidos entrenando", secret: false,
    check: (st) => st.bestStreak >= 30 },
  { id: "centurion", emoji: "💯", name: "Centurión", desc: "100 sesiones totales", secret: false,
    check: (st) => st.totalSessions >= 100 },
  { id: "early", emoji: "🌅", name: "Madrugador", desc: "Entrena antes de las 7am", secret: false,
    check: (st) => st.hasEarlySession },
  { id: "night", emoji: "🌙", name: "Nocturno", desc: "Entrena después de las 10pm", secret: false,
    check: (st) => st.hasLateSession },
  { id: "noexcuses", emoji: "☔", name: "Sin excusas", desc: "Entrena un lunes y un viernes en la misma semana", secret: false,
    check: (st) => st.hasMonAndFriSameWeek },
  { id: "tonne", emoji: "🏋️", name: "Primera tonelada", desc: "Levanta 1,000 kg de volumen total", secret: false,
    check: (st) => st.totalVolume >= 1000 },
  { id: "tentonnes", emoji: "💪", name: "10 toneladas", desc: "Volumen acumulado de 10,000 kg", secret: false,
    check: (st) => st.totalVolume >= 10000 },
  { id: "sprinter", emoji: "⚡", name: "El velocista", desc: "Registra un sprint de 100m", secret: false,
    check: (st) => st.hasSprint100 },
  { id: "marathon", emoji: "🏃", name: "Maratonista", desc: "Completa una sesión de maratón", secret: false,
    check: (st) => st.hasMarathonSession },
  { id: "complete", emoji: "🎯", name: "El completo", desc: "Entrena las 4 disciplinas en una semana", secret: false,
    check: (st) => st.allDisciplinesOneWeek },
  { id: "explorer", emoji: "🗺️", name: "Explorador", desc: "Prueba AMRAP, EMOM e Intervalos", secret: false,
    check: (st) => st.specialModesUsed >= 3 },
  { id: "restless", emoji: "😤", name: "¿Descansas?", desc: "Entrena 14 días seguidos", secret: true,
    check: (st) => st.bestStreak >= 14 },
  { id: "theone", emoji: "👑", name: "Leyenda viviente", desc: "Alcanza nivel THE ONE en cualquier disciplina", secret: true,
    check: (st) => st.reachedTheOne },
  { id: "indestructible", emoji: "🛡️", name: "Indestructible", desc: "Usa el streak freeze y al día siguiente entrenas igual", secret: true,
    check: (st) => st.usedFreezeAndTrained },
];

/* Calcula las estadísticas base usadas para evaluar todos los logros */
function computeAchievementStats(sessions, freezes) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const totalSessions = sessions.length;
  const totalVolume = workouts.reduce((a, s) => a + sessionVolume(s), 0);
  const bestStreak = longestStreakEver(sessions);
  const hasEarlySession = sessions.some((s) => new Date(s.ts).getHours() < 7);
  const hasLateSession = sessions.some((s) => new Date(s.ts).getHours() >= 22);
  const weekMap = {};
  sessions.forEach((s) => {
    const wk = Math.floor(s.ts / (7 * 86400000));
    if (!weekMap[wk]) weekMap[wk] = new Set();
    weekMap[wk].add(new Date(s.ts).getDay());
  });
  const hasMonAndFriSameWeek = Object.values(weekMap).some((days) => days.has(1) && days.has(5));
  const hasSprint100 = workouts.some((s) => s.exercises.some((e) => /sprint m[aá]ximo/i.test(e.name)));
  const hasMarathonSession = workouts.some((s) => s.focusLabel === "Maratón");
  const discWeekMap = {};
  workouts.forEach((s) => {
    const wk = Math.floor(s.ts / (7 * 86400000));
    if (!discWeekMap[wk]) discWeekMap[wk] = new Set();
    const base = s.disc?.startsWith("futbol") ? "futbol" : s.disc;
    discWeekMap[wk].add(base);
  });
  const allDisciplinesOneWeek = Object.values(discWeekMap).some((set) =>
    ["gimnasio", "calistenia", "futbol", "atletismo"].every((d) => set.has(d))
  );
  const specialModesUsed = new Set(
    workouts.filter((s) => s.disc === "especial").map((s) => s.focusLabel?.split(" ")[0])
  ).size;
  const reachedTheOne = workouts.some((s) => s.levelIdx === 5);
  const reachedLeyenda = workouts.some((s) => s.levelIdx >= 4);
  const nextDayKey = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return dayKey(new Date(y, m - 1, d + 1).getTime());
  };
  const usedFreezeAndTrained = freezes.length > 0 && freezes.some((f) => sessions.some((s) => dayKey(s.ts) === nextDayKey(f)));
  return {
    totalSessions, totalVolume, bestStreak, hasEarlySession, hasLateSession, hasMonAndFriSameWeek,
    hasSprint100, hasMarathonSession, allDisciplinesOneWeek, specialModesUsed, reachedTheOne, reachedLeyenda, usedFreezeAndTrained,
  };
}

/* Devuelve la lista completa de logros con su estado (unlocked + fecha), y guarda nuevos desbloqueos */
function computeAchievements(sessions, freezes) {
  const stats = computeAchievementStats(sessions, freezes);
  const saved = store.get("achievements", {});
  const now = Date.now();
  let changed = false;
  const list = ACHIEVEMENTS.map((a) => {
    const already = saved[a.id];
    const earned = a.check(stats);
    if (earned && !already) {
      saved[a.id] = now;
      changed = true;
    }
    return { ...a, unlocked: !!saved[a.id], ts: saved[a.id] || null };
  });
  if (changed) store.set("achievements", saved);
  return { list, justUnlocked: changed ? list.filter((a) => a.ts === now) : [] };
}

/* ─── Sistema de XP y rangos ─── */
const XP_RANKS = ["Recluta", "Soldado", "Guerrero", "Élite", "Maestro", "Gran Maestro", "Leyenda", "THE ONE"];
const XP_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function computeXP(sessions, achievementsUnlockedCount, bestStreak) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const totalSets = workouts.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.filter((st) => st.ok).length, 0), 0);
  const perfectSessions = workouts.filter((s) => s.exercises.every((e) => e.sets.length > 0 && e.sets.every((st) => st.ok))).length;
  const recordsBonus = computeRecords(sessions).length * 200;
  const xp = workouts.length * 100
    + totalSets * 10
    + perfectSessions * 150
    + achievementsUnlockedCount * 300
    + Math.floor(bestStreak / 7) * 500
    + recordsBonus;
  const rankIdx = Math.min(XP_RANKS.length - 1, Math.floor(xp / 1000));
  const intoRank = xp - rankIdx * 1000;
  return { xp, rankIdx, rankName: XP_RANKS[rankIdx], roman: XP_ROMAN[rankIdx], progress: rankIdx === XP_RANKS.length - 1 ? 1 : intoRank / 1000 };
}

/* ─── Estadísticas globales épicas ─── */
function computeGlobalStats(sessions) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const totalSets = workouts.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.filter((st) => st.ok).length, 0), 0);
  const totalVolume = Math.round(workouts.reduce((a, s) => a + sessionVolume(s), 0));
  const activeDays = new Set(sessions.map((s) => dayKey(s.ts))).size;

  const discCount = {};
  workouts.forEach((s) => { discCount[s.disc] = (discCount[s.disc] || 0) + 1; });
  const favDiscId = Object.entries(discCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const exCount = {};
  workouts.forEach((s) => s.exercises.forEach((e) => { exCount[e.name] = (exCount[e.name] || 0) + 1; }));
  const favExercise = Object.entries(exCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const hourCount = {};
  sessions.forEach((s) => { const h = new Date(s.ts).getHours(); hourCount[h] = (hourCount[h] || 0) + 1; });
  const favHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  /* Semana más activa: máximo de sesiones en cualquier ventana de 7 días */
  const sortedTs = sessions.map((s) => s.ts).sort((a, b) => a - b);
  let busiestWeek = 0;
  for (let i = 0; i < sortedTs.length; i++) {
    let count = 1;
    for (let j = i + 1; j < sortedTs.length && sortedTs[j] - sortedTs[i] < 7 * 86400000; j++) count++;
    busiestWeek = Math.max(busiestWeek, count);
  }

  const progressFor = (name) => {
    const hist = exerciseHistory(sessions, name);
    if (hist.rows.length < 2) return null;
    const first = hist.rows[0];
    const last = hist.rows[hist.rows.length - 1];
    return { first: first.weight, last: last.weight, diff: Math.round((last.weight - first.weight) * 10) / 10 };
  };
  const squatProgress = progressFor("Sentadilla con barra");
  const benchProgress = progressFor("Press banca con barra");

  /* Proyección motivacional a 1 año según el ritmo actual */
  const weeksActive = Math.max(1, (Date.now() - (sortedTs[0] || Date.now())) / (7 * 86400000));
  const sessionsPerWeek = workouts.length / weeksActive;
  const volumePerWeek = totalVolume / weeksActive;
  const projectedDays = Math.round(sessionsPerWeek * 52);
  const projectedTonnes = Math.round((volumePerWeek * 52) / 1000);

  return {
    totalSets, totalVolume, activeDays, favDiscId, favExercise, favHour, busiestWeek,
    squatProgress, benchProgress, projectedDays, projectedTonnes,
  };
}

/* ─── Insight automático del día (rota diariamente, determinista por fecha) ─── */
function computeInsight(sessions) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  if (workouts.length < 5) {
    return "Cada sesión cuenta. Sigue sumando para desbloquear tus primeros insights 💡";
  }
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const dayCount = {};
  sessions.forEach((s) => { const d = new Date(s.ts).getDay(); dayCount[d] = (dayCount[d] || 0) + 1; });
  const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const hourCount = {};
  sessions.forEach((s) => { const h = new Date(s.ts).getHours(); hourCount[h] = (hourCount[h] || 0) + 1; });
  const bestHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const discCount = {};
  workouts.forEach((s) => { discCount[s.disc] = (discCount[s.disc] || 0) + 1; });
  const discEntries = Object.entries(discCount).sort((a, b) => a[1] - b[1]);
  const weakestDisc = discEntries[0]?.[0];
  const weakestLabel = DISCIPLINES[weakestDisc]?.label || weakestDisc;

  const last4 = workouts.slice(-8, -4).reduce((a, s) => a + sessionVolume(s), 0);
  const prev4 = workouts.slice(-4).reduce((a, s) => a + sessionVolume(s), 0);
  const volPct = last4 > 0 ? Math.round(((prev4 - last4) / last4) * 100) : null;

  const daysSinceLast = workouts.length ? Math.floor((Date.now() - workouts[workouts.length - 1].ts) / 86400000) : null;

  const candidates = [
    `Entrenas mejor los ${dayNames[bestDay]} 📅`,
    bestHour !== undefined ? `Tu mejor hora para entrenar es alrededor de las ${bestHour}:00 ⏰` : null,
    `Tu punto débil es ${weakestLabel}. ¿La trabajamos? 🎯`,
    volPct !== null ? `En tus últimas sesiones tu volumen ${volPct >= 0 ? "subió" : "bajó"} ${Math.abs(volPct)}% 📊` : null,
    daysSinceLast >= 2 ? `Última sesión hace ${daysSinceLast} días. Tu cuerpo ya está recuperado 💪` : null,
  ].filter(Boolean);

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return candidates[dayOfYear % candidates.length];
}

/* ─── Reto personal (torneo contra ti mismo) ─── */
const CHALLENGE_TYPES = [
  { id: "streak", label: "Racha de X días", unit: "días" },
  { id: "sessions", label: "X sesiones en Y semanas", unit: "sesiones" },
  { id: "weight", label: "Levantar X kg en un ejercicio", unit: "kg" },
  { id: "distance", label: "Correr una distancia en menos de X", unit: "seg" },
];

/* ─── Calculadora de plan de entrenamiento semanal ─── */
const PLAN_GOALS = [
  { id: "fuerza", label: "Fuerza" }, { id: "musculo", label: "Músculo" }, { id: "resistencia", label: "Resistencia" },
  { id: "futbol", label: "Fútbol" }, { id: "atletismo", label: "Atletismo" },
];
const PLAN_DURATIONS = [30, 45, 60, 90];
const PLAN_TEMPLATES = {
  fuerza: [
    { discId: "gimnasio", focusId: "pecho", label: "Gimnasio — Pecho y tríceps" },
    { discId: "gimnasio", focusId: "espalda", label: "Gimnasio — Espalda y bíceps" },
    { discId: "gimnasio", focusId: "piernas", label: "Gimnasio — Piernas" },
    { discId: "gimnasio", focusId: "hombros", label: "Gimnasio — Hombros y brazos" },
    { discId: "gimnasio", focusId: "todo", label: "Gimnasio — Full body" },
    { discId: "gimnasio", focusId: "gluteos", label: "Gimnasio — Glúteos y piernas" },
  ],
  musculo: [
    { discId: "gimnasio", focusId: "pecho", label: "Gimnasio — Pecho y tríceps" },
    { discId: "gimnasio", focusId: "espalda", label: "Gimnasio — Espalda y bíceps" },
    { discId: "calistenia", focusId: "core", label: "Calistenia — Core y hombros" },
    { discId: "gimnasio", focusId: "piernas", label: "Gimnasio — Piernas" },
    { discId: "gimnasio", focusId: "hombros", label: "Gimnasio — Hombros y brazos" },
    { discId: "gimnasio", focusId: "brazos", label: "Gimnasio — Brazos" },
  ],
  resistencia: [
    { discId: "futbolParque", focusId: "resistencia", label: "Fútbol Parque — Resistencia" },
    { discId: "calistenia", focusId: "explosivo", label: "Calistenia — Full body explosivo" },
    { discId: "atletismo", focusId: "5km", label: "Atletismo — 5 km" },
    { discId: "calistenia", focusId: "core", label: "Calistenia — Core" },
    { discId: "futbolParque", focusId: "velocidad", label: "Fútbol Parque — Velocidad" },
    { discId: "atletismo", focusId: "1000m", label: "Atletismo — 1000 m" },
  ],
  futbol: [
    { discId: "futbolGym", focusId: "fuerza", label: "Fútbol Gimnasio — Fuerza de pierna" },
    { discId: "futbolParque", focusId: "tiro", label: "Fútbol Parque — Tiro" },
    { discId: "futbolGym", focusId: "velocidad", label: "Fútbol Gimnasio — Velocidad explosiva" },
    { discId: "futbolParque", focusId: "regate", label: "Fútbol Parque — Regate" },
    { discId: "futbolGym", focusId: "estabilidad", label: "Fútbol Gimnasio — Estabilidad" },
    { discId: "futbolParque", focusId: "resistencia", label: "Fútbol Parque — Resistencia aeróbica" },
  ],
  atletismo: [
    { discId: "atletismo", focusId: "1000m", label: "Atletismo — 1000 m" },
    { discId: "gimnasio", focusId: "piernas", label: "Gimnasio — Piernas (fuerza)" },
    { discId: "atletismo", focusId: "100m", label: "Atletismo — 100 m" },
    { discId: "calistenia", focusId: "explosivo", label: "Calistenia — Explosivo" },
    { discId: "atletismo", focusId: "5km", label: "Atletismo — 5 km" },
    { discId: "atletismo", focusId: "400m", label: "Atletismo — 400 m" },
  ],
};
const PLAN_DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const PLAN_TRAIN_SLOTS = { 3: [0, 2, 4], 4: [0, 2, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };

function buildWeeklyPlan(days, goal, duration) {
  const templates = PLAN_TEMPLATES[goal] || PLAN_TEMPLATES.musculo;
  const trainDays = PLAN_TRAIN_SLOTS[days] || PLAN_TRAIN_SLOTS[4];
  const plan = PLAN_DAY_NAMES.map((name, i) => {
    if (i === 6) return { day: name, rest: true, label: "Descanso" };
    const slotIdx = trainDays.indexOf(i);
    if (slotIdx !== -1) return { day: name, ...templates[slotIdx % templates.length] };
    if (i === 5) return { day: name, rest: true, activeRest: true, label: "Descanso activo (Movilidad)" };
    return { day: name, rest: true, label: "Descanso" };
  });
  return { days, goal, duration, plan, createdTs: Date.now() };
}

function challengeProgress(challenge, sessions, streak) {
  if (!challenge) return null;
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((challenge.deadline - now) / 86400000));
  const workouts = sessions.filter((s) => s.kind === "entreno" && s.ts >= challenge.startTs);
  let current = 0;
  let target = challenge.target;
  let unit = "";
  let label = "";
  if (challenge.type === "streak") {
    current = streak;
    unit = "días";
    label = `Racha de ${target} días`;
  } else if (challenge.type === "sessions") {
    current = workouts.length;
    unit = "sesiones";
    label = `${target} sesiones antes de la fecha límite`;
  } else if (challenge.type === "weight") {
    const hist = exerciseHistory(sessions, challenge.exercise);
    current = hist.rows.length ? Math.max(...hist.rows.map((r) => r.weight)) : 0;
    unit = "kg";
    label = `Levantar ${target} kg en ${challenge.exercise}`;
  } else if (challenge.type === "distance") {
    const vals = workouts
      .flatMap((s) => s.exercises)
      .filter((e) => e.name === challenge.exercise)
      .flatMap((e) => e.sets)
      .filter((st) => st.ok && st.reps > 0)
      .map((st) => st.reps);
    current = vals.length ? Math.min(...vals) : Infinity;
    unit = "seg";
    label = `${challenge.exercise} en menos de ${target}s`;
    const pct = current === Infinity ? 0 : Math.min(1, target / current);
    return { daysLeft, current: current === Infinity ? null : current, target, unit, label, pct, done: current <= target, lowerIsBetter: true };
  }
  const pct = Math.min(1, current / target);
  return { daysLeft, current, target, unit, label, pct, done: current >= target, lowerIsBetter: false };
}

function heroForStreak(streak) {
  let hero = null;
  for (const h of HEROES) if (streak >= h.days) hero = h;
  return hero || EGG;
}

function startOfWeek() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function fmtDate(ts) {
  const today = dayKey(Date.now());
  const yest = dayKey(Date.now() - 86400000);
  const k = dayKey(ts);
  if (k === today) return "Hoy";
  if (k === yest) return "Ayer";
  const daysAgo = Math.round((Date.now() - ts) / 86400000);
  if (daysAgo >= 2 && daysAgo <= 6) return `hace ${daysAgo} días`;
  const d = new Date(ts);
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

function levelFromCount(count, thresholds) {
  let idx = 0;
  thresholds.forEach((t, i) => {
    if (count >= t) idx = i;
  });
  return idx;
}

/* ─── Generador de rutinas (5-8 ejercicios, con variación por semilla) ─── */
function genRoutine(discId, focusId, lvlIdx, seed = 0, opts = {}) {
  const rnd = mulberry32(seed);
  const db = EXDB[discId];
  const focus = DISCIPLINES[discId].focuses.find((f) => f.id === focusId);
  const matchFocus = (e) => !focus.tags || e.f.some((t) => focus.tags.includes(t));
  const matchBar = (e) => !opts.noBar || !e.bar;
  const matchEquip = (e) => !(opts.noEquip && discId === "gimnasio") || !requiresGymEquipment(e.n);
  const matchAll = (e) => matchFocus(e) && matchBar(e) && matchEquip(e);

  let pool = db.filter((e) => matchAll(e) && e.lv[0] <= lvlIdx && lvlIdx <= e.lv[1]);
  if (pool.length < 5) pool = db.filter(matchAll);
  /* Si el enfoque elegido no tiene alternativas sin barra/equipo, prioriza
     respetar el equipo disponible antes que el enfoque exacto. */
  if (pool.length < 5) pool = db.filter((e) => matchBar(e) && matchEquip(e));
  if (pool.length < 5) pool = db.filter(matchFocus);

  const target = Math.max(
    5,
    Math.min(8, Math.min(pool.length, 5 + (lvlIdx >= 2 ? 1 : 0) + (lvlIdx >= 4 ? 1 : 0) + (rnd() < 0.5 ? 1 : 0)))
  );

  const shuffled = [...pool].sort(() => rnd() - 0.5);
  const chosen = [];
  const seenTags = new Set();
  for (const e of shuffled) {
    if (chosen.length >= target) break;
    if (!seenTags.has(e.f[0])) {
      chosen.push(e);
      seenTags.add(e.f[0]);
    }
  }
  for (const e of shuffled) {
    if (chosen.length >= target) break;
    if (!chosen.includes(e)) chosen.push(e);
  }

  const extraSets = lvlIdx >= 3 ? 1 : 0;
  return chosen.map((e) => ({
    name: e.n,
    type: e.t,
    sets: e.s === 1 ? 1 : Math.min(5, e.s + extraSets),
    reps: e.r,
    rest: e.rest,
    tip: e.tip,
    tag: e.f ? e.f[0] : null,
  }));
}

/* Generador de rutinas de Atletismo (no usa enfoque, la distancia ya filtra) */
function genAtletismoRoutine(distance, lvlIdx, seed = 0) {
  const rnd = mulberry32(seed);
  const pool = ATLETISMO_EXDB[distance] || [];
  const target = Math.min(pool.length, 5 + (rnd() < 0.5 ? 1 : 0));
  const shuffled = [...pool].sort(() => rnd() - 0.5).slice(0, target);
  const extraSets = lvlIdx >= 3 ? 1 : 0;
  return shuffled.map((e) => ({
    name: e.n,
    type: e.t,
    sets: e.s === 1 ? 1 : Math.min(6, e.s + extraSets),
    reps: e.r,
    rest: e.rest,
    tip: e.tip,
    tag: "velocidad",
  }));
}

/* Reconstruye un plan de sesión a partir de un registro del historial (para "Repetir última sesión") */
function planFromSession(session) {
  const seed = Date.now();
  if (session.disc === "atletismo") {
    const distId = DISTANCES.find((d) => d.label === session.focusLabel)?.id || DISTANCES[0].id;
    return {
      discId: "atletismo", discLabel: "Atletismo", discColor: C.purple, discIcon: "🏃",
      focusLabel: session.focusLabel, lvlIdx: session.levelIdx,
      exercises: genAtletismoRoutine(distId, session.levelIdx, seed),
    };
  }
  const disc = DISCIPLINES[session.disc];
  if (!disc) return null;
  const focusId = disc.focuses.find((f) => f.label === session.focusLabel)?.id || "todo";
  const noBar = session.disc === "calistenia" && session.calLocation === "casa";
  return {
    discId: session.disc, discLabel: disc.label, discColor: disc.color, discIcon: disc.icon,
    focusLabel: session.focusLabel, lvlIdx: session.levelIdx,
    exercises: genRoutine(session.disc, focusId, session.levelIdx, seed, { noBar }),
    calLocation: session.calLocation,
  };
}

/* ─── Mapa muscular (zonas por enfoque) ─── */
const ALL_ZONES = ["pecho", "espalda", "hombros", "brazos", "core", "piernas", "gluteos"];
const FOCUS_ZONES = {
  gimnasio: {
    todo: ALL_ZONES,
    pecho: ["pecho"],
    espalda: ["espalda"],
    hombros: ["hombros"],
    brazos: ["brazos"],
    piernas: ["piernas"],
    gluteos: ["gluteos"],
    sup: ["pecho", "espalda", "hombros", "brazos"],
    inf: ["piernas", "gluteos"],
  },
  calistenia: {
    todo: ALL_ZONES,
    empuje: ["pecho", "hombros", "brazos"],
    tiron: ["espalda", "brazos"],
    core: ["core"],
    piernas: ["piernas", "gluteos"],
    explosivo: ALL_ZONES,
  },
};

/* ═══════════════════ COMPONENTES UI ═══════════════════ */

/* Confetti CSS puro: 20 partículas cayendo, sin librerías */
const CONFETTI_COLORS = [C.cyan, C.green, C.orange, C.yellow, C.red, C.purple];
function Confetti({ show }) {
  const [particles] = useState(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 0.8,
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
  })));
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", overflow: "hidden" }}>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute", top: -20, left: `${p.left}%`,
            width: p.size, height: p.size * 0.4, background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function MuscleMap({ zones }) {
  const on = (z) => zones.includes(z);
  const fill = (z) => (on(z) ? C.orange : "#1A1A2E");
  const stroke = (z) => (on(z) ? C.red : C.border);
  const p = (z) => ({ fill: fill(z), stroke: stroke(z), strokeWidth: 1.5, style: { transition: "fill .3s ease, stroke .3s ease" } });
  return (
    <svg viewBox="0 0 100 126" style={{ width: 108, height: 136 }} aria-hidden="true">
      {/* cabeza */}
      <circle cx="50" cy="11" r="8" fill="#1A1A2E" stroke={C.border} strokeWidth="1.5" />
      {/* brazos */}
      <rect x="16" y="34" width="8" height="30" rx="4" {...p("brazos")} />
      <rect x="76" y="34" width="8" height="30" rx="4" {...p("brazos")} />
      {/* espalda (dorsales laterales) */}
      <rect x="27" y="37" width="7" height="22" rx="3.5" {...p("espalda")} />
      <rect x="66" y="37" width="7" height="22" rx="3.5" {...p("espalda")} />
      {/* hombros */}
      <circle cx="31" cy="29" r="6.5" {...p("hombros")} />
      <circle cx="69" cy="29" r="6.5" {...p("hombros")} />
      {/* pecho */}
      <rect x="37" y="24" width="26" height="16" rx="5" {...p("pecho")} />
      {/* core */}
      <rect x="39" y="43" width="22" height="18" rx="5" {...p("core")} />
      {/* glúteos */}
      <rect x="38" y="64" width="24" height="10" rx="5" {...p("gluteos")} />
      {/* piernas */}
      <rect x="37" y="77" width="11" height="42" rx="5" {...p("piernas")} />
      <rect x="52" y="77" width="11" height="42" rx="5" {...p("piernas")} />
    </svg>
  );
}

function NumPad({ onKey }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => onKey(k)}
          aria-label={k === "⌫" ? "Borrar" : k === "." ? "Punto decimal" : `Dígito ${k}`}
          style={{
            height: 64, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`,
            fontSize: 18, fontWeight: 800, color: k === "⌫" ? C.red : C.text,
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

/* Figuras de palo SVG animadas según la categoría de movimiento del ejercicio.
   Evita depender de URLs externas (GIFs) que pueden fallar o tener CORS. */
function StickFigure({ category, color }) {
  const strokeProps = { stroke: color, strokeWidth: 4, strokeLinecap: "round", fill: "none" };
  switch (category) {
    case "empuje":
      return (
        <g className="anim-empuje">
          <circle cx="30" cy="35" r="7" fill={color} />
          <path d="M30 42 L100 42" {...strokeProps} />
          <path d="M45 42 L38 60" {...strokeProps} />
          <path d="M85 42 L92 60" {...strokeProps} />
          <path d="M50 44 L65 30 L80 44" {...strokeProps} />
        </g>
      );
    case "tiron":
      return (
        <g>
          <path d="M20 15 L110 15" {...strokeProps} />
          <g className="anim-tiron">
            <circle cx="65" cy="30" r="7" fill={color} />
            <path d="M65 37 L65 65" {...strokeProps} />
            <path d="M65 42 L45 20" {...strokeProps} />
            <path d="M65 42 L85 20" {...strokeProps} />
            <path d="M65 65 L52 85" {...strokeProps} />
            <path d="M65 65 L78 85" {...strokeProps} />
          </g>
        </g>
      );
    case "sentadilla":
      return (
        <g className="anim-sentadilla">
          <circle cx="65" cy="20" r="7" fill={color} />
          <path d="M65 27 L65 55" {...strokeProps} />
          <path d="M65 32 L50 45" {...strokeProps} />
          <path d="M65 32 L80 45" {...strokeProps} />
          <path className="anim-leg" d="M65 55 L52 70 L52 90" {...strokeProps} />
          <path className="anim-leg" d="M65 55 L78 70 L78 90" {...strokeProps} />
        </g>
      );
    case "core":
      return (
        <g>
          <circle cx="25" cy="45" r="7" fill={color} />
          <path d="M25 52 L100 60" {...strokeProps} />
          <path d="M35 50 L45 38" {...strokeProps} />
          <path className="anim-core" d="M100 60 L112 48" {...strokeProps} />
        </g>
      );
    case "sprint":
      return (
        <g>
          <circle cx="55" cy="18" r="7" fill={color} />
          <path d="M55 25 L60 50" {...strokeProps} />
          <path d="M60 30 L78 20" {...strokeProps} />
          <path d="M60 35 L42 45" {...strokeProps} />
          <path className="anim-leg1" d="M60 50 L78 62 L88 55" {...strokeProps} />
          <path className="anim-leg2" d="M60 50 L42 68 L30 78" {...strokeProps} />
        </g>
      );
    case "salto":
      return (
        <g className="anim-salto">
          <circle cx="65" cy="20" r="7" fill={color} />
          <path d="M65 27 L65 55" {...strokeProps} />
          <path d="M65 32 L48 15" {...strokeProps} />
          <path d="M65 32 L82 15" {...strokeProps} />
          <path d="M65 55 L52 78" {...strokeProps} />
          <path d="M65 55 L78 78" {...strokeProps} />
        </g>
      );
    default:
      return (
        <g className="anim-generic">
          <circle cx="65" cy="22" r="7" fill={color} />
          <path d="M65 29 L65 58" {...strokeProps} />
          <path d="M65 36 L48 48" {...strokeProps} />
          <path d="M65 36 L82 48" {...strokeProps} />
          <path d="M65 58 L52 82" {...strokeProps} />
          <path d="M65 58 L78 82" {...strokeProps} />
        </g>
      );
  }
}

function ExerciseDemo({ exerciseName }) {
  const category = movementCategory(exerciseName);
  const color = MOVEMENT_COLORS[category];
  return (
    <div
      className="exercise-demo"
      style={{
        width: "100%", maxHeight: 160, aspectRatio: "16 / 9",
        borderRadius: 12, background: "#1A1A2E", border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12, overflow: "hidden",
      }}
    >
      <svg viewBox="0 0 130 100" style={{ width: "70%", maxWidth: 160 }}>
        <StickFigure category={category} color={color} />
      </svg>
    </div>
  );
}

/* Cronómetro integrado para ejercicios de tipo "tiempo" */
function Stopwatch({ target, onStop }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const nearEnd = target && elapsed >= target - 5 && elapsed < target;
  const color = running ? (nearEnd ? C.orange : C.green) : C.text;

  const stop = () => {
    setRunning(false);
    onStop(elapsed);
  };

  return (
    <div style={{ textAlign: "center", marginTop: 16 }}>
      <div style={{ fontSize: 48, fontWeight: 900, color, fontVariantNumeric: "tabular-nums", transition: "color .3s ease" }}>
        {mm}:{ss}
      </div>
      {target && <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Objetivo: ~{target}s</div>}
      {!running ? (
        <button
          className="btn-xl"
          onClick={() => { ensureAudio(); setRunning(true); }}
          style={{ marginTop: 16, background: C.green, color: "#07070C" }}
        >
          ▶ INICIAR
        </button>
      ) : (
        <button
          className="btn-xl"
          onClick={stop}
          style={{ marginTop: 16, background: C.orange, color: "#07070C" }}
        >
          ⏹ DETENER
        </button>
      )}
    </div>
  );
}

function Heatmap({ sessions, color, freezes = [] }) {
  const [tapped, setTapped] = useState(null);
  const days = useMemo(() => {
    const set = new Set(sessions.map((s) => dayKey(s.ts)));
    const freezeSet = new Set(freezes);
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // 0 = lunes
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow - 28); // inicio de hace 5 semanas (lunes)
    monday.setHours(0, 0, 0, 0);
    const arr = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const k = dayKey(d.getTime());
      arr.push({ key: k, active: set.has(k), frozen: freezeSet.has(k), isToday: k === todayKey(), future: d.getTime() > today.getTime() });
    }
    return arr;
  }, [sessions, freezes]);
  const month = new Date().toLocaleDateString("es", { month: "long", year: "numeric" });
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.mut }}>ACTIVIDAD</span>
        <span style={{ fontSize: 12, color: C.mut, textTransform: "capitalize" }}>{month}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginTop: 10 }}>
        {days.map((d) => (
          <button
            key={d.key}
            aria-label={d.future ? "Día futuro" : d.active ? "Entrenaste aquí" : d.frozen ? "Racha congelada este día" : "Sin entrenamiento"}
            onClick={() => !d.future && setTapped(d.frozen ? "Racha congelada este día ❄️" : d.active ? "Entrenaste aquí 💪" : "Sin entrenamiento")}
            style={{
              aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
              background: d.future ? "transparent" : d.active ? color : "#1A1A2E",
              border: d.isToday ? "1.5px solid #FFFFFFcc" : `1px solid ${d.active ? color : C.border}`,
              opacity: d.future ? 0.2 : 1,
              transition: "background .3s ease",
            }}
          >
            {d.frozen && !d.active ? "❄️" : ""}
          </button>
        ))}
      </div>
      {tapped && <div style={{ fontSize: 11, color: C.mut, marginTop: 8, textAlign: "center" }}>{tapped}</div>}
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8, textAlign: "right" }}>Últimas 5 semanas · lunes a domingo</div>
    </div>
  );
}

function WeekRing({ done, goal = 4, accent }) {
  const pct = Math.min(1, done / goal);
  const r = 15;
  const circ = 2 * Math.PI * r;
  const color = pct >= 1 ? C.green : accent;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-label={`Meta semanal: ${done} de ${goal}`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke={C.border} strokeWidth="4" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        transform="rotate(-90 20 20)" style={{ transition: "stroke-dashoffset .5s ease, stroke .3s ease" }}
      />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>{done}</text>
    </svg>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: "center", padding: "14px 8px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent || C.text }}>{value}</div>
      <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StreakBar({ streak }) {
  const filled = Math.min(streak, 7);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.mut }}>RACHA</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.orange }}>
          {streak} {streak === 1 ? "día" : "días"} 🔥
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              background: i < filled ? "rgba(255,122,47,0.14)" : C.surface,
              border: `1px solid ${i < filled ? "rgba(255,122,47,0.45)" : C.border}`,
              transition: "all .3s ease",
            }}
          >
            {i < filled ? (
              <span className={i === filled - 1 ? "flame" : ""}>🔥</span>
            ) : (
              <span style={{ opacity: 0.2 }}>·</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Pantalla de bienvenida ─── */
const MODE_OPTIONS = [
  { id: "guiado", emoji: "🎮", label: "Con guía y retos", desc: "Gamificación activa: héroes, rachas visuales y mensajes" },
  { id: "pro", emoji: "⚙️", label: "Control total", desc: "Datos puros, sin distracciones" },
];

const NOTIF_HOURS = [
  { id: "morning", label: "Mañana 7am", hour: 7 },
  { id: "afternoon", label: "Tarde 5pm", hour: 17 },
  { id: "night", label: "Noche 8pm", hour: 20 },
];

const GOAL_OPTIONS = [
  { id: "rendimiento", emoji: "🏆", label: "Rendimiento deportivo", desc: "Fútbol, atletismo",
    msg: "Tu camino al alto rendimiento empieza hoy. F.A.S.E. te llevará ahí." },
  { id: "musculo", emoji: "💪", label: "Ganar músculo y fuerza", desc: "Gimnasio, hipertrofia",
    msg: "La fuerza no se pide, se construye. Empecemos." },
  { id: "grasa", emoji: "🔥", label: "Perder grasa y definirme", desc: "Volumen alto, constancia",
    msg: "Cada sesión te acerca a la mejor versión de ti. Vamos." },
  { id: "general", emoji: "⚡", label: "Mejorar condición física general", desc: "Un poco de todo",
    msg: "La versatilidad es tu superpoder. F.A.S.E. te acompaña en cada disciplina." },
  { id: "bienestar", emoji: "🧘", label: "Movilidad y bienestar", desc: "Cuidar el cuerpo",
    msg: "Cuidar tu cuerpo es la inversión más importante que harás. Empecemos con calma." },
];

const EXPERIENCE_OPTIONS = [
  { id: "nuevo", emoji: "🥚", label: "Soy nuevo", desc: "Menos de 3 meses" },
  { id: "base", emoji: "🌱", label: "Tengo algo de base", desc: "3-12 meses" },
  { id: "año", emoji: "💪", label: "Llevo más de un año", desc: "Experiencia sólida" },
  { id: "atleta", emoji: "🔥", label: "Soy atleta o entreno serio", desc: "Alto nivel" },
];

function Welcome({ onDone }) {
  const [step, setStep] = useState(1);
  const [value, setValue] = useState("");
  const [goal, setGoal] = useState(null);
  const [experience, setExperience] = useState(null);
  const [days, setDays] = useState(4);
  const [mode, setMode] = useState(null);

  const chooseMode = (m) => {
    setMode(m);
    setStep(6);
  };
  const finish = () => {
    store.set("profile", { goal, experience, days });
    store.set("weekly_goal", days);
    onDone(value.trim(), mode);
  };

  const acceptNotifs = async (hourId) => {
    try {
      if (window.Notification) {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          store.set("notif_hour", hourId);
          if (navigator.serviceWorker) {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
          }
        }
      }
    } catch {
      /* notificaciones no disponibles */
    }
    setStep(7);
  };

  const wrap = (children) => (
    <div className="fade-up" style={{ minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, gap: 12 }}>
      {children}
    </div>
  );

  if (step === 7) {
    const g = GOAL_OPTIONS.find((o) => o.id === goal);
    return wrap(
      <div style={{ textAlign: "center" }}>
        <div className="pop" style={{ fontSize: 70 }}>🥚</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 14 }}>¡Bienvenido, {value.trim()}!</h2>
        <p style={{ fontSize: 14, color: C.mut, marginTop: 10, lineHeight: 1.6, padding: "0 8px" }}>
          {g ? g.msg : "Tu momento es ahora. Empecemos."}
        </p>
        <button
          className="btn-xl"
          onClick={finish}
          style={{ marginTop: 24, background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`, color: "#07070C" }}
        >
          COMENZAR
        </button>
      </div>
    );
  }

  if (step === 6) {
    return wrap(
      <>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 40 }}>🔔</div>
        </div>
        <p style={{ color: C.text, fontSize: 15, fontWeight: 600, textAlign: "center", lineHeight: 1.5 }}>
          ¿Quieres que F.A.S.E. te recuerde entrenar cada día? Solo te avisaremos una vez al día.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {NOTIF_HOURS.map((h) => (
            <button key={h.id} className="card" onClick={() => acceptNotifs(h.id)} style={{ textAlign: "center", padding: "12px 8px" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Sí, recuérdame — {h.label}</span>
            </button>
          ))}
        </div>
        <button
          className="btn-xl"
          onClick={() => setStep(7)}
          style={{ marginTop: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 13 }}
        >
          Ahora no
        </button>
      </>
    );
  }

  if (step === 5) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 600, textAlign: "center" }}>¿Cómo prefieres entrenar?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {MODE_OPTIONS.map((m) => (
            <button key={m.id} className="card" onClick={() => chooseMode(m.id)} style={{ textAlign: "left", display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 30 }}>{m.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep(4)} style={{ color: C.dim, fontSize: 13, marginTop: 12, fontWeight: 600 }}>‹ Volver</button>
      </>
    );
  }

  if (step === 4) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 600, textAlign: "center" }}>¿Cuántos días a la semana puedes entrenar?</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              className="card"
              onClick={() => setDays(n)}
              style={{ flex: 1, padding: "14px 4px", textAlign: "center", border: `1px solid ${days === n ? C.cyan : C.border}` }}
            >
              <span style={{ fontSize: 16, fontWeight: 800, color: days === n ? C.cyan : C.text }}>{n}</span>
            </button>
          ))}
        </div>
        <button className="btn-xl" onClick={() => setStep(5)} style={{ marginTop: 16, background: C.cyan, color: "#07070C" }}>CONTINUAR</button>
        <button onClick={() => setStep(3)} style={{ color: C.dim, fontSize: 13, marginTop: 8, fontWeight: 600 }}>‹ Volver</button>
      </>
    );
  }

  if (step === 3) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 600, textAlign: "center" }}>¿Cuánto tiempo llevas entrenando?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {EXPERIENCE_OPTIONS.map((e) => (
            <button key={e.id} className="card" onClick={() => { setExperience(e.id); setStep(4); }} style={{ textAlign: "left", display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 26 }}>{e.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{e.label}</div>
                <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{e.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep(2)} style={{ color: C.dim, fontSize: 13, marginTop: 12, fontWeight: 600 }}>‹ Volver</button>
      </>
    );
  }

  if (step === 2) {
    return wrap(
      <>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 40 }}>👋</div>
          <p style={{ color: C.text, fontSize: 18, fontWeight: 700, marginTop: 8 }}>Hola, {value.trim()}</p>
        </div>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 600, textAlign: "center" }}>¿Qué quieres lograr?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {GOAL_OPTIONS.map((g) => (
            <button key={g.id} className="card" onClick={() => { setGoal(g.id); setStep(3); }} style={{ textAlign: "left", display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 26 }}>{g.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{g.label}</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{g.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep(1)} style={{ color: C.dim, fontSize: 13, marginTop: 10, fontWeight: 600 }}>‹ Volver</button>
      </>
    );
  }

  return wrap(
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div className="pop" style={{ fontSize: 64, marginBottom: 12 }}>⚡</div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: 4,
            background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          F.A.S.E.
        </h1>
        <p style={{ color: C.mut, fontSize: 12, marginTop: 8 }}>
          Formación Atlética y Sistemas de Entrenamiento
        </p>
      </div>
      <p style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>¿Cómo te llamas?</p>
      <input
        className="input"
        placeholder="Tu nombre"
        value={value}
        maxLength={24}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && setStep(2)}
        autoFocus
      />
      <button
        className="btn-xl"
        disabled={!value.trim()}
        onClick={() => setStep(2)}
        style={{ background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`, color: "#07070C", marginTop: 8 }}
      >
        CONTINUAR
      </button>
      <p style={{ color: C.dim, fontSize: 12, textAlign: "center", marginTop: 8 }}>
        Sin cuentas ni correos. Todo se guarda solo en tu dispositivo.
      </p>
    </>
  );
}

/* ─── INICIO ─── */
function Home({ name, sessions, streak, unlockedHeroes, onTrain, onRepeat, mode, broken, canFreeze, onFreeze, challenge, onDeleteSession, freezes = [] }) {
  const [menuId, setMenuId] = useState(null);
  const [tappedHero, setTappedHero] = useState(null);
  const longPressRef = useRef(null);
  const startLongPress = (id) => {
    longPressRef.current = setTimeout(() => setMenuId(id), 500);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };
  const pro = mode === "pro";
  const hero = heroForStreak(streak);
  const nextHero = HEROES.find((h) => h.days > streak);
  const recent = sessions.slice(-5).reverse();
  const lastEntreno = [...sessions].reverse().find((s) => s.kind === "entreno");
  const insight = useMemo(() => computeInsight(sessions), [sessions]);
  const challProg = useMemo(() => challengeProgress(challenge, sessions, streak), [challenge, sessions, streak]);

  /* Resumen semanal (desde el lunes) */
  const weekList = sessions.filter((s) => s.ts >= startOfWeek());
  const week = weekList.length;
  const weekSets = weekList
    .filter((s) => s.kind === "entreno")
    .flatMap((s) => s.exercises.flatMap((e) => e.sets))
    .filter((st) => st.ok);
  const weekKg = Math.round(weekSets.reduce((a, st) => a + st.weight * st.reps, 0));

  /* Resumen limpio para modo Control total */
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const activeDaysMonth = new Set(sessions.filter((s) => s.ts >= monthStart.getTime()).map((s) => dayKey(s.ts))).size;
  const totalVolume = Math.round(
    sessions
      .filter((s) => s.kind === "entreno")
      .flatMap((s) => s.exercises.flatMap((e) => e.sets))
      .filter((st) => st.ok)
      .reduce((a, st) => a + st.weight * st.reps, 0)
  );

  /* Widget de acceso rápido: contexto según cuándo entrenaste por última vez */
  const todaySessions = sessions.filter((s) => dayKey(s.ts) === todayKey());
  const trainedToday = todaySessions.length > 0;
  const lastAnyTs = sessions.length ? Math.max(...sessions.map((s) => s.ts)) : null;
  const daysSince = lastAnyTs ? Math.floor((seedNow() - lastAnyTs) / 86400000) : null;
  const bestStreakEver = Math.max(longestStreakEver(sessions), streak);
  const isStreakRecordToday = streak > 0 && streak === bestStreakEver && trainedToday;
  const todayVolume = Math.round(
    todaySessions.filter((s) => s.kind === "entreno").flatMap((s) => s.exercises.flatMap((e) => e.sets)).filter((st) => st.ok)
      .reduce((a, st) => a + st.weight * st.reps, 0)
  );

  return (
    <div className="screen">
      <p style={{ fontSize: 18, fontWeight: 800 }}>
        Hola, <span style={{ color: C.cyan }}>{name}</span> {!pro && "👋"}
      </p>
      <p className="muted" style={{ marginTop: 2 }}>{pro ? "Resumen de tu entrenamiento." : "Tu momento es ahora."}</p>

      {sessions.length > 0 && (
        <>
          {isStreakRecordToday ? (
            <div className="card pop" style={{ marginTop: 12, padding: "16px", textAlign: "center", background: "rgba(255,215,0,0.1)", borderColor: "#FFD700" }}>
              <div style={{ fontSize: 30 }}>🏆</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FFD700", marginTop: 4 }}>RÉCORD DE RACHA — Día {streak}</div>
            </div>
          ) : trainedToday ? (
            <div className="card" style={{ marginTop: 12, padding: "13px 14px" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.green }}>Ya entrenaste hoy 🔥 — Sesión completada</p>
              <p style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>{todaySessions.length} {todaySessions.length === 1 ? "sesión" : "sesiones"} hoy{todayVolume > 0 ? ` · ${todayVolume} kg` : ""}</p>
            </div>
          ) : daysSince !== null && daysSince >= 2 ? (
            <div className="card" style={{ marginTop: 12, padding: "13px 14px", border: `2px solid ${C.red}`, animation: "flame 1.6s ease-in-out infinite" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.red }}>{name}, han pasado {daysSince} días desde tu último entrenamiento</p>
              <button className="btn-xl" onClick={onTrain} style={{ marginTop: 10, background: C.red, color: "#fff", fontSize: 13 }}>
                Volver a entrenar ahora
              </button>
            </div>
          ) : (
            <div className="card" style={{ marginTop: 12, padding: "13px 14px" }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Buenos días {name} ☀️ — ¿Entrenamos hoy?</p>
              {lastEntreno && (
                <button className="btn-xl" onClick={() => onRepeat(lastEntreno)} style={{ marginTop: 10, background: C.cyan, color: "#07070C", fontSize: 13 }}>
                  Continuar con {DISCIPLINES[lastEntreno.disc]?.label || "tu última disciplina"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className="card" style={{ marginTop: 12, padding: "11px 14px", borderColor: `${C.cyan}44` }}>
        <p style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>💡 INSIGHT DEL DÍA</p>
        <p style={{ fontSize: 13, marginTop: 3, lineHeight: 1.4 }}>{insight}</p>
      </div>

      {challProg && (
        <div className="card" style={{ marginTop: 10, padding: "13px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>🏆 {challProg.label}</span>
            <span style={{ fontSize: 11, color: C.dim }}>{challProg.daysLeft}d restantes</span>
          </div>
          <div style={{ height: 8, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 8 }}>
            <div style={{
              height: "100%", width: `${challProg.pct * 100}%`, borderRadius: 99, transition: "width .5s ease",
              background: `linear-gradient(90deg, ${C.red}, ${challProg.pct > 0.5 ? C.yellow : C.red}, ${C.green})`,
            }} />
          </div>
          <p style={{ fontSize: 11, color: C.mut, marginTop: 6 }}>
            {challProg.current ?? "—"} / {challProg.target} {challProg.unit} {challProg.done ? "· ¡Completado! 🎉" : ""}
          </p>
        </div>
      )}

      {pro ? (
        /* Modo Control total: estadísticas limpias, sin héroes ni animaciones */
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <StatBox label="Sesiones" value={sessions.length} />
          <StatBox label="Volumen total" value={`${totalVolume} kg`} />
          <StatBox label="Días activos (mes)" value={activeDaysMonth} />
        </div>
      ) : (
        /* Héroe */
        <div className="card" style={{ marginTop: 16, textAlign: "center", padding: "22px 16px", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(circle at 50% 0%, ${hero === EGG ? "rgba(138,138,173,0.10)" : "rgba(255,122,47,0.12)"}, transparent 70%)`,
              animation: "glowPulse 3s ease-in-out infinite",
            }}
          />
          <div className="pop" style={{ fontSize: 62 }} key={hero.name}>{hero.emoji}</div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 6 }}>{hero.name}</div>
          <div style={{ color: C.mut, fontSize: 13, marginTop: 3, fontStyle: "italic" }}>“{hero.quote}”</div>
          {nextHero && (
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 6, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (streak / nextHero.days) * 100)}%`,
                    background: `linear-gradient(90deg, ${C.orange}, ${C.yellow})`,
                    borderRadius: 99,
                    transition: "width .5s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                Próximo héroe: {nextHero.name} a los {nextHero.days} días de racha
              </div>
            </div>
          )}
          {/* Colección */}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
            {HEROES.map((h) => {
              const has = unlockedHeroes.includes(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => has && setTappedHero(h)}
                  aria-label={has ? `${h.name}, desbloqueado a los ${h.days} días de racha` : `${h.name} bloqueado`}
                  style={{ textAlign: "center", opacity: has ? 1 : 0.3, minWidth: 44, minHeight: 44 }}
                >
                  <div style={{ fontSize: 20, filter: has ? "none" : "grayscale(1)" }}>{has ? h.emoji : "🔒"}</div>
                  <div style={{ fontSize: 9, color: has ? C.mut : C.dim, marginTop: 2 }}>{h.days}d</div>
                </button>
              );
            })}
          </div>
          {tappedHero && (
            <p style={{ fontSize: 11, color: C.mut, marginTop: 8 }}>
              {tappedHero.name} — desbloqueado a los {tappedHero.days} días de racha
            </p>
          )}
        </div>
      )}

      {/* Racha (o mensaje motivacional si se rompió) */}
      {pro ? (
        <div className="card" style={{ marginTop: 12, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.mut, fontWeight: 700 }}>Racha</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{streak} {streak === 1 ? "día" : "días"}</span>
        </div>
      ) : broken ? (
        <div className="card fade-up" style={{ marginTop: 12, textAlign: "center", padding: "20px 16px" }}>
          <div style={{ fontSize: 34 }}>🌅</div>
          <p style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>
            {name}, tu racha se rompió en {broken.lost} {broken.lost === 1 ? "día" : "días"}. ¿Empezamos una nueva?
          </p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>
            Tus héroes desbloqueados se quedan contigo para siempre.
          </p>
          <button
            className="btn-xl"
            onClick={onTrain}
            style={{ marginTop: 14, background: `linear-gradient(90deg, ${C.orange}, ${C.red})`, color: "#fff" }}
          >
            🔥 REINICIAR RACHA — ENTRENA AHORA
          </button>
          {canFreeze && (
            <button
              className="btn-xl"
              onClick={onFreeze}
              style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.cyan}55`, color: C.cyan, fontSize: 14 }}
            >
              🧊 Congelar racha (1 disponible al mes)
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <StreakBar streak={streak} />
          {canFreeze && (
            <button
              className="btn-xl"
              onClick={onFreeze}
              style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.cyan}55`, color: C.cyan, fontSize: 12, padding: 13 }}
            >
              🧊 Congelar racha (1 disponible al mes)
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <StatBox label="Racha actual" value={streak} accent={C.orange} />
        <StatBox label="Esta semana" value={week} accent={C.cyan} />
        <StatBox label="Total sesiones" value={sessions.length} accent={C.green} />
      </div>

      {/* Heatmap de actividad */}
      <Heatmap sessions={sessions} color={hero.color} freezes={freezes} />

      {/* Resumen semanal */}
      <div className="card" style={{ marginTop: 12, padding: "13px 16px" }}>
        {week === 0 ? (
          <p style={{ fontSize: 13, color: C.mut }}>
            Esta semana aún no empiezas. <span style={{ color: C.text, fontWeight: 700 }}>¿Hoy? 👀</span>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: C.mut, lineHeight: 1.5 }}>
            Esta semana: <span style={{ color: C.cyan, fontWeight: 800 }}>{week} {week === 1 ? "sesión" : "sesiones"}</span>
            {" · "}<span style={{ color: C.green, fontWeight: 800 }}>{weekSets.length} series</span> completadas
            {weekKg > 0 && <>{" · "}<span style={{ color: C.orange, fontWeight: 800 }}>{weekKg} kg</span> levantados</>}
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        className="btn-xl"
        onClick={onTrain}
        style={{
          marginTop: 16,
          background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`,
          color: "#07070C",
          fontSize: 18,
          boxShadow: "0 8px 30px rgba(34,255,136,0.25)",
        }}
      >
        ENTRENAR AHORA 💪
      </button>

      {lastEntreno && (
        <button
          className="btn-xl"
          onClick={() => onRepeat(lastEntreno)}
          style={{ marginTop: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.mut, fontSize: 13 }}
        >
          🔄 Repetir: {DISCIPLINES[lastEntreno.disc]?.label || lastEntreno.discLabel || "sesión"} · {LEVELS[lastEntreno.levelIdx]?.name}
        </button>
      )}

      {/* Historial reciente */}
      <div className="sec-title">Últimas sesiones</div>
      {recent.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: C.dim, fontSize: 13 }}>
          Aún no hay sesiones. ¡Hoy es el día perfecto para la primera! 🚀
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recent.map((s) => {
          const isBody = s.kind === "cuerpo";
          const disc = isBody ? null : DISCIPLINES[s.disc];
          const sec = isBody ? BODY_SECTIONS.find((b) => b.id === s.section) : null;
          return (
            <div key={s.id} style={{ position: "relative" }}>
              <div
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}
                onTouchStart={() => startLongPress(s.id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
              >
                <span style={{ fontSize: 24 }}>{isBody ? sec?.icon || "🧘" : disc?.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isBody ? `Cuerpo · ${sec?.name || ""}` : disc?.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.mut }}>
                    {isBody ? "Acondicionamiento" : `${s.focusLabel} · ${LEVELS[s.levelIdx].emoji} ${LEVELS[s.levelIdx].name}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: C.dim }}>{fmtDate(s.ts)}</span>
              </div>
              {menuId === s.id && (
                <div className="card pop" style={{ position: "absolute", top: "100%", right: 8, zIndex: 30, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => setMenuId(null)} style={{ fontSize: 12, padding: "6px 10px", textAlign: "left" }}>Ver detalles</button>
                  <button
                    onClick={() => { onDeleteSession?.(s.id); setMenuId(null); }}
                    style={{ fontSize: 12, padding: "6px 10px", textAlign: "left", color: C.red }}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ENTRENAR (selección) ─── */
const ENERGY_OPTIONS = [
  { id: "high", emoji: "⚡", label: "Al 100%" },
  { id: "mid", emoji: "😐", label: "Normal" },
  { id: "low", emoji: "😴", label: "Cansado" },
];

const TRAIN_CARDS = [
  { id: "calistenia", ...DISCIPLINES.calistenia },
  { id: "gimnasio", ...DISCIPLINES.gimnasio },
  { id: "futbol", ...FUTBOL_META },
  { id: "atletismo", ...DISCIPLINES.atletismo },
];

/* Sugiere primero la disciplina afín al objetivo elegido en el onboarding */
function orderedTrainCards() {
  const profile = store.get("profile", null);
  if (!profile?.goal) return TRAIN_CARDS;
  const priority = { rendimiento: ["futbol", "atletismo"], musculo: ["gimnasio"], grasa: ["gimnasio", "calistenia"] }[profile.goal];
  if (!priority) return TRAIN_CARDS;
  return [...TRAIN_CARDS].sort((a, b) => {
    const ia = priority.indexOf(a.id);
    const ib = priority.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

const MAX_CUSTOM_ROUTINES = 10;

/* ─── Creador / editor de rutina personalizada ─── */
function CustomRoutineBuilder({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [items, setItems] = useState(initial?.exercises || []);
  const [query, setQuery] = useState("");

  const matches = query.trim()
    ? ALL_EXERCISES_FLAT.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const addExercise = (e) => {
    setItems((prev) => [...prev, { name: e.name, type: e.type, tip: e.tip, sets: 3, reps: e.type === "tiempo" ? "30s" : "10", rest: 60 }]);
    setQuery("");
  };
  const removeAt = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const updateField = (i, field, value) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };

  const canSave = name.trim() && items.length > 0;

  return (
    <div className="screen">
      <button onClick={onCancel} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
        ‹ Cancelar
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{initial ? "Editar rutina" : "Nueva rutina"}</h2>

      <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginTop: 12, display: "block" }}>NOMBRE</label>
      <input className="input" placeholder="Ej. Full body express" value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 4 }} />

      <div className="sec-title">Buscar ejercicio</div>
      <input className="input" placeholder="Buscar por nombre..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {matches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {matches.map((e) => (
            <button key={e.name} className="card" onClick={() => addExercise(e)} style={{ textAlign: "left", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{e.name}</span>
              <span style={{ fontSize: 14, color: C.cyan }}>＋</span>
            </button>
          ))}
        </div>
      )}

      <div className="sec-title">Tu rutina · {items.length} ejercicios</div>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: C.dim, fontSize: 12 }}>
          Busca y añade ejercicios arriba.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it, i) => (
            <div key={`${it.name}-${i}`} className="card" style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{it.name}</span>
                <button onClick={() => move(i, -1)} style={{ padding: 4, color: C.mut }}>↑</button>
                <button onClick={() => move(i, 1)} style={{ padding: 4, color: C.mut }}>↓</button>
                <button onClick={() => removeAt(i)} style={{ padding: 4, color: C.red }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: C.dim }}>SERIES</label>
                  <input
                    className="input" type="number" value={it.sets} min={1} max={10}
                    onChange={(e) => updateField(i, "sets", Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ padding: 8, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: C.dim }}>{it.type === "tiempo" ? "TIEMPO" : "REPS"}</label>
                  <input
                    className="input" type="text" value={it.reps}
                    onChange={(e) => updateField(i, "reps", e.target.value)}
                    style={{ padding: 8, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: C.dim }}>DESCANSO (S)</label>
                  <input
                    className="input" type="number" value={it.rest} min={0} max={300}
                    onChange={(e) => updateField(i, "rest", Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ padding: 8, fontSize: 12 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-xl"
        disabled={!canSave}
        onClick={() => onSave({ id: initial?.id || `custom-${Date.now()}`, name: name.trim(), exercises: items })}
        style={{ marginTop: 16, background: C.cyan, color: "#07070C" }}
      >
        💾 GUARDAR RUTINA
      </button>
    </div>
  );
}

/* ─── Modo especial: AMRAP (As Many Rounds As Possible) ─── */
function AmrapMode({ onFinish, onSave }) {
  const [duration, setDuration] = useState(null);
  const [circuit, setCircuit] = useState(null);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [done, setDone] = useState(false);
  const secRef = useRef(0);

  const chooseDuration = (min) => {
    setDuration(min);
    const c = genRoutine("calistenia", "todo", 2, seedNow(), { noBar: true }).slice(0, 5);
    setCircuit(c);
    secRef.current = min * 60;
    setSecondsLeft(min * 60);
  };

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      secRef.current -= 1;
      if (secRef.current <= 0) {
        tripleBeep();
        setSecondsLeft(0);
        setRunning(false);
        setDone(true);
      } else {
        setSecondsLeft(secRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const finish = () => {
    const records = store.get("amrap_records", {});
    const prevBest = records[duration] || 0;
    const isRecord = rounds > prevBest;
    if (isRecord) {
      records[duration] = rounds;
      store.set("amrap_records", records);
    }
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "especial",
      focusLabel: `AMRAP ${duration} min`, levelIdx: 2,
      exercises: [{ name: `AMRAP ${duration} min`, sets: [{ weight: 0, reps: rounds, ok: true }] }],
    });
    onFinish();
  };

  if (!duration) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 16 }}>⏱</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>AMRAP</h2>
        <p className="muted" style={{ marginTop: 4 }}>Cuantas rondas puedas en el tiempo elegido</p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {[5, 10, 15, 20].map((m) => (
            <button key={m} className="card" onClick={() => chooseDuration(m)} style={{ flex: 1, padding: "16px 4px" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{m}</div>
              <div style={{ fontSize: 10, color: C.mut }}>min</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    const records = store.get("amrap_records", {});
    const prevBest = records[duration] || 0;
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 60 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>¡Tiempo!</h2>
        <div style={{ fontSize: 42, fontWeight: 900, color: C.green, marginTop: 10 }}>{rounds} rondas</div>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>
          {rounds > prevBest ? `🏆 ¡Nuevo récord! Anterior: ${prevBest}` : `Tu récord: ${Math.max(prevBest, rounds)}`}
        </p>
        <button className="btn-xl" onClick={finish} style={{ marginTop: 20, background: C.green, color: "#07070C" }}>
          VOLVER
        </button>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>AMRAP · {duration} min</p>
      <div style={{ fontSize: 56, fontWeight: 900, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
        {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
      </div>
      <div className="card" style={{ marginTop: 16, textAlign: "left" }}>
        <p style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>CIRCUITO</p>
        {circuit.map((e, i) => (
          <p key={i} style={{ fontSize: 12, marginTop: 4 }}>{i + 1}. {e.name} — {e.reps}</p>
        ))}
      </div>
      <div style={{ fontSize: 40, fontWeight: 900, color: C.cyan, marginTop: 20 }}>{rounds}</div>
      <p style={{ fontSize: 11, color: C.dim }}>rondas completadas</p>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button className="btn-xl" onClick={() => setRounds((r) => Math.max(0, r - 1))} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>−</button>
        <button className="btn-xl" onClick={() => setRounds((r) => r + 1)} style={{ background: C.cyan, color: "#07070C" }}>+1 RONDA</button>
      </div>
      {!running ? (
        <button className="btn-xl" onClick={() => setRunning(true)} style={{ marginTop: 14, background: C.green, color: "#07070C" }}>▶ INICIAR</button>
      ) : (
        <button className="btn-xl" onClick={() => { setRunning(false); setDone(true); }} style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
          TERMINAR AHORA
        </button>
      )}
    </div>
  );
}

/* ─── Modo especial: EMOM (Every Minute On the Minute) ─── */
function EmomMode({ onFinish, onSave }) {
  const [duration, setDuration] = useState(null);
  const [exercises, setExercises] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const elapsedRef = useRef(0);

  const chooseDuration = (min) => {
    setDuration(min);
    const ex = genRoutine("calistenia", "todo", 1, seedNow(), { noBar: true }).slice(0, 2);
    setExercises(ex);
  };

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      elapsedRef.current += 1;
      const total = duration * 60;
      if (elapsedRef.current % 60 === 0 && elapsedRef.current < total) tripleBeep();
      if (elapsedRef.current >= total) {
        tripleBeep();
        setRunning(false);
        setDone(true);
      }
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [running, duration]);

  const finish = () => {
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "especial",
      focusLabel: `EMOM ${duration} min`, levelIdx: 2,
      exercises: exercises.map((e) => ({ name: e.name, sets: [{ weight: 0, reps: duration, ok: true }] })),
    });
    onFinish();
  };

  if (!duration) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 16 }}>🔔</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>EMOM</h2>
        <p className="muted" style={{ marginTop: 4 }}>Cada minuto en punto, haz tus reps</p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {[10, 15, 20].map((m) => (
            <button key={m} className="card" onClick={() => chooseDuration(m)} style={{ flex: 1, padding: "16px 4px" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{m}</div>
              <div style={{ fontSize: 10, color: C.mut }}>min</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 60 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>¡EMOM completado!</h2>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>{duration} minutos de trabajo constante.</p>
        <button className="btn-xl" onClick={finish} style={{ marginTop: 20, background: C.green, color: "#07070C" }}>VOLVER</button>
      </div>
    );
  }

  const secInMinute = 60 - (elapsed % 60);
  const minuteNum = Math.floor(elapsed / 60) + 1;

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>EMOM · Minuto {minuteNum} de {duration}</p>
      <div style={{ fontSize: 64, fontWeight: 900, marginTop: 10, color: secInMinute <= 5 ? C.orange : C.text, fontVariantNumeric: "tabular-nums" }}>
        {secInMinute === 60 ? 0 : secInMinute}
      </div>
      <p style={{ fontSize: 11, color: C.dim }}>segundos de este minuto</p>
      <div className="card" style={{ marginTop: 20, textAlign: "left" }}>
        {exercises.map((e, i) => (
          <p key={i} style={{ fontSize: 13, fontWeight: 700, marginTop: i > 0 ? 8 : 0 }}>{e.name} — {e.reps}</p>
        ))}
      </div>
      {!running ? (
        <button className="btn-xl" onClick={() => setRunning(true)} style={{ marginTop: 20, background: C.green, color: "#07070C" }}>▶ INICIAR</button>
      ) : (
        <button className="btn-xl" onClick={() => { setRunning(false); setDone(true); }} style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
          TERMINAR AHORA
        </button>
      )}
    </div>
  );
}

/* ─── Modo especial: Intervalos (Tabata / Personalizado) ─── */
function IntervalMode({ onFinish, onSave }) {
  const [cfg, setCfg] = useState(null); // { work, rest, rounds }
  const [customWork, setCustomWork] = useState("30");
  const [customRest, setCustomRest] = useState("15");
  const [customRounds, setCustomRounds] = useState("6");
  const [phase, setPhase] = useState("work");
  const [round, setRound] = useState(1);
  const [secLeft, setSecLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const secRef = useRef(0);

  const start = (c) => {
    setCfg(c);
    setPhase("work");
    setRound(1);
    secRef.current = c.work;
    setSecLeft(c.work);
  };

  useEffect(() => {
    if (!running || !cfg) return undefined;
    const t = setInterval(() => {
      secRef.current -= 1;
      if (secRef.current <= 0) {
        if (phase === "work") {
          if (round >= cfg.rounds) {
            tripleBeep();
            setRunning(false);
            setDone(true);
            return;
          }
          speak("Descansa");
          setPhase("rest");
          secRef.current = cfg.rest;
          setSecLeft(cfg.rest);
        } else {
          speak("Trabaja");
          setPhase("work");
          setRound((r) => r + 1);
          secRef.current = cfg.work;
          setSecLeft(cfg.work);
        }
      } else {
        setSecLeft(secRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running, cfg, phase, round]);

  const finish = () => {
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "especial",
      focusLabel: `Intervalos ${cfg.work}/${cfg.rest}×${cfg.rounds}`, levelIdx: 2,
      exercises: [{ name: "Intervalos", sets: [{ weight: 0, reps: cfg.rounds, ok: true }] }],
    });
    onFinish();
  };

  if (!cfg) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 16 }}>📊</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Intervalos</h2>
        <button
          className="btn-xl"
          onClick={() => start({ work: 20, rest: 10, rounds: 8 })}
          style={{ marginTop: 20, background: C.orange, color: "#07070C" }}
        >
          🔥 TABATA CLÁSICO (20s/10s×8)
        </button>
        <div className="sec-title" style={{ textAlign: "left" }}>Personalizado</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, color: C.dim }}>TRABAJO (S)</label>
            <input className="input" type="number" value={customWork} onChange={(e) => setCustomWork(e.target.value)} style={{ padding: 8, fontSize: 12 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, color: C.dim }}>DESCANSO (S)</label>
            <input className="input" type="number" value={customRest} onChange={(e) => setCustomRest(e.target.value)} style={{ padding: 8, fontSize: 12 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, color: C.dim }}>RONDAS</label>
            <input className="input" type="number" value={customRounds} onChange={(e) => setCustomRounds(e.target.value)} style={{ padding: 8, fontSize: 12 }} />
          </div>
        </div>
        <button
          className="btn-xl"
          onClick={() => start({ work: parseInt(customWork, 10) || 20, rest: parseInt(customRest, 10) || 10, rounds: parseInt(customRounds, 10) || 8 })}
          style={{ marginTop: 10, background: C.cyan, color: "#07070C" }}
        >
          COMENZAR PERSONALIZADO
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 60 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>¡Intervalos completados!</h2>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>{cfg.rounds} rondas de {cfg.work}s / {cfg.rest}s.</p>
        <button className="btn-xl" onClick={finish} style={{ marginTop: 20, background: C.green, color: "#07070C" }}>VOLVER</button>
      </div>
    );
  }

  const isWork = phase === "work";
  return (
    <div
      className="fade-up"
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: isWork ? "rgba(34,255,136,0.15)" : "rgba(59,130,246,0.18)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        transition: "background .3s ease",
      }}
    >
      <p style={{ fontSize: 14, color: C.mut, fontWeight: 700 }}>Ronda {round} de {cfg.rounds}</p>
      <p style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: isWork ? C.green : C.blue, letterSpacing: 3 }}>
        {isWork ? "TRABAJA" : "DESCANSA"}
      </p>
      <div style={{ fontSize: 72, fontWeight: 900, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{secLeft}</div>
      {!running ? (
        <button className="btn-xl" onClick={() => { speak("Trabaja"); setRunning(true); }} style={{ marginTop: 20, background: C.green, color: "#07070C", maxWidth: 260 }}>
          ▶ INICIAR
        </button>
      ) : (
        <button className="btn-xl" onClick={() => { setRunning(false); setDone(true); }} style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, color: C.text, maxWidth: 260 }}>
          TERMINAR AHORA
        </button>
      )}
    </div>
  );
}

/* ─── Reto personal: creación y seguimiento ─── */
function ChallengeScreen({ challenge, sessions, streak, onSave, onBack }) {
  const [type, setType] = useState("streak");
  const [target, setTarget] = useState("30");
  const [exercise, setExercise] = useState(RM_EXERCISES[0]);
  const [days, setDays] = useState("30");

  const prog = challenge ? challengeProgress(challenge, sessions, streak) : null;

  const create = () => {
    const t = parseFloat(target) || 0;
    if (t <= 0) return;
    onSave({
      type, target: t, exercise: type === "weight" || type === "distance" ? exercise : null,
      startTs: Date.now(), deadline: Date.now() + (parseInt(days, 10) || 30) * 86400000,
    });
  };

  if (challenge) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 16 }}>🏆</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>{prog.label}</h2>
        <div style={{ fontSize: 42, fontWeight: 900, color: prog.done ? C.green : C.orange, marginTop: 12 }}>
          {prog.current ?? "—"} / {prog.target} {prog.unit}
        </div>
        <div style={{ height: 10, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 12 }}>
          <div style={{
            height: "100%", width: `${prog.pct * 100}%`, borderRadius: 99,
            background: `linear-gradient(90deg, ${C.red}, ${C.yellow}, ${C.green})`,
          }} />
        </div>
        <p style={{ fontSize: 12, color: C.mut, marginTop: 8 }}>{prog.daysLeft} días restantes</p>
        {prog.done && <p style={{ fontSize: 15, fontWeight: 800, color: C.green, marginTop: 10 }}>🎉 ¡Reto completado!</p>}
        <button
          className="btn-xl"
          onClick={() => onSave(null)}
          style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 13 }}
        >
          Eliminar reto
        </button>
      </div>
    );
  }

  return (
    <div className="screen fade-up">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>🏆 Nuevo reto personal</h2>
      <div className="sec-title">Tipo de reto</div>
      <div className="chip-wrap">
        {CHALLENGE_TYPES.map((t) => (
          <button key={t.id} className={`chip ${type === t.id ? "on" : ""}`} style={type === t.id ? { background: C.yellow } : {}} onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {(type === "weight" || type === "distance") && (
        <>
          <div className="sec-title">Ejercicio</div>
          <input className="input" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Nombre exacto del ejercicio" />
        </>
      )}
      <div className="sec-title">Meta ({CHALLENGE_TYPES.find((t) => t.id === type)?.unit})</div>
      <input className="input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
      <div className="sec-title">Fecha límite (días desde hoy)</div>
      <input className="input" type="number" value={days} onChange={(e) => setDays(e.target.value)} />
      <button className="btn-xl" onClick={create} style={{ marginTop: 16, background: C.yellow, color: "#07070C" }}>
        🏁 CREAR RETO
      </button>
    </div>
  );
}

function Train({ onStart, onAccent, totalSessions, noEquipment, onSaveSpecial, sessions = [], streak = 0, challenge, onSaveChallenge }) {
  const [discId, setDiscId] = useState(null); // null | "futbol" (pendiente) | "atletismo" | id concreto
  const [focusId, setFocusId] = useState("todo");
  const [lvlIdx, setLvlIdx] = useState(null);
  const [seed, setSeed] = useState(0);
  const [calLocation, setCalLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [customRoutines, setCustomRoutines] = useState(() => store.get("custom_routines", []));
  const [trainCards] = useState(() => orderedTrainCards());
  const [showTutorial] = useState(() => !store.get("tutorial_done", false));
  const [builderMode, setBuilderMode] = useState(null); // null | "new" | routine object para editar
  const [special, setSpecial] = useState(null); // null | "amrap" | "emom" | "intervalos"
  /* La energía elegida se recuerda durante el día */
  const [energy, setEnergy] = useState(() => {
    const saved = store.get("energy", null);
    return saved && saved.day === todayKey() ? saved.value : null;
  });

  const startAndFinishTutorial = (planToStart) => {
    if (showTutorial) store.set("tutorial_done", true);
    onStart(planToStart);
  };

  const chooseEnergy = (v) => {
    setEnergy(v);
    store.set("energy", { day: todayKey(), value: v });
  };

  const pickDisc = (id) => {
    /* Modo sin equipo: fútbol siempre en parque, calistenia siempre en casa */
    const finalId = id === "futbol" && noEquipment ? "futbolParque" : id;
    setDiscId(finalId);
    setFocusId("todo");
    setLvlIdx(null);
    setCalLocation(finalId === "calistenia" && noEquipment ? "casa" : null);
    setDistance(null);
    if (finalId === "futbol") onAccent(C.orange);
    else if (finalId === "atletismo") onAccent(C.purple);
    else onAccent(DISCIPLINES[finalId].color);
  };
  const backToDiscs = () => {
    setDiscId(null);
    onAccent(null);
  };

  const saveCustomRoutine = (routine) => {
    setCustomRoutines((prev) => {
      const exists = prev.some((r) => r.id === routine.id);
      let next;
      if (exists) {
        next = prev.map((r) => (r.id === routine.id ? routine : r));
      } else {
        if (prev.length >= MAX_CUSTOM_ROUTINES) {
          alert("Límite alcanzado. Elimina una rutina para crear otra.");
          return prev;
        }
        next = [...prev, routine];
      }
      store.set("custom_routines", next);
      return next;
    });
    setBuilderMode(null);
  };

  const deleteCustomRoutine = (id) => {
    if (!window.confirm("¿Eliminar esta rutina?")) return;
    setCustomRoutines((prev) => {
      const next = prev.filter((r) => r.id !== id);
      store.set("custom_routines", next);
      return next;
    });
  };

  const startCustomRoutine = (routine) => {
    onStart({
      discId: "custom", discLabel: routine.name, discColor: C.cyan, discIcon: "📋",
      focusLabel: "Personalizada", lvlIdx: 1,
      exercises: routine.exercises.map((e) => ({
        name: e.name, type: e.type || "reps", sets: e.sets, reps: e.reps, rest: e.rest,
        tip: e.tip || "Controla la técnica en cada repetición.",
      })),
    });
  };

  const isConcreteDisc = discId && discId !== "futbol" && discId !== "atletismo";
  const disc = isConcreteDisc ? DISCIPLINES[discId] : null;

  const routine = useMemo(() => {
    if (!isConcreteDisc || lvlIdx === null) return null;
    /* Con poca energía: un nivel menos y una serie menos por ejercicio */
    const effLvl = energy === "low" ? Math.max(0, lvlIdx - 1) : lvlIdx;
    /* Semilla automática: cambia cada 3 sesiones + botón "Variar" */
    const focusHash = [...(discId + focusId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const seedVal = Math.floor(totalSessions / 3) * 7919 + seed * 131 + effLvl * 17 + focusHash;
    let r = genRoutine(discId, focusId, effLvl, seedVal, {
      noBar: discId === "calistenia" && calLocation === "casa",
      noEquip: noEquipment,
    });
    if (energy === "low") r = r.map((e) => ({ ...e, sets: Math.max(1, e.sets - 1) }));
    if (energy === "high") r = r.map((e, i) => (i === 0 ? { ...e, sets: Math.min(6, e.sets + 1) } : e));
    return r;
  }, [isConcreteDisc, discId, focusId, lvlIdx, seed, energy, totalSessions, calLocation, noEquipment]);

  const atletRoutine = useMemo(() => {
    if (discId !== "atletismo" || !distance || lvlIdx === null) return null;
    const seedVal = Math.floor(totalSessions / 3) * 7919 + seed * 131 + lvlIdx * 17;
    return genAtletismoRoutine(distance, lvlIdx, seedVal);
  }, [discId, distance, lvlIdx, seed, totalSessions]);

  /* ── Creador / editor de rutina personalizada ── */
  if (builderMode) {
    return (
      <CustomRoutineBuilder
        initial={builderMode === "new" ? null : builderMode}
        onSave={saveCustomRoutine}
        onCancel={() => setBuilderMode(null)}
      />
    );
  }

  /* ── Modos especiales (AMRAP / EMOM / Intervalos) ── */
  if (special === "amrap") return <AmrapMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "emom") return <EmomMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "intervalos") return <IntervalMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "reto") {
    return (
      <ChallengeScreen
        challenge={challenge} sessions={sessions} streak={streak}
        onSave={onSaveChallenge} onBack={() => setSpecial(null)}
      />
    );
  }

  /* ── Pantalla 1: lista de disciplinas ── */
  if (!discId) {
    return (
      <div className="screen">
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Entrenar</h2>
        <p className="muted" style={{ marginTop: 2 }}>Elige tu disciplina de hoy</p>
        {showTutorial && (
          <div className="card" style={{ marginTop: 10, padding: "9px 12px", borderColor: `${C.cyan}66`, background: "rgba(0,229,255,0.08)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>👇 Elige tu disciplina</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {trainCards.map((d) => (
            <button
              key={d.id}
              className="card fade-up"
              onClick={() => pickDisc(d.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                borderLeft: `4px solid ${d.color}`, transition: "transform .15s ease",
              }}
            >
              <span style={{ fontSize: 30 }}>{d.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{d.desc}</div>
              </div>
              <span style={{ marginLeft: "auto", color: d.color, fontSize: 20 }}>›</span>
            </button>
          ))}
        </div>

        <div className="sec-title">Modo especial</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="card" onClick={() => setSpecial("amrap")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 22 }}>⏱</div>
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>AMRAP</div>
          </button>
          <button className="card" onClick={() => setSpecial("emom")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 22 }}>🔔</div>
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>EMOM</div>
          </button>
          <button className="card" onClick={() => setSpecial("intervalos")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 22 }}>📊</div>
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>Intervalos</div>
          </button>
        </div>
        <button className="card" onClick={() => setSpecial("reto")} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, textAlign: "left", borderLeft: `4px solid ${C.yellow}` }}>
          <span style={{ fontSize: 24 }}>🏆</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Reto Personal</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{challenge ? "Ver progreso de tu reto activo" : "Crea un desafío contra ti mismo"}</div>
          </div>
        </button>

        <div className="sec-title">Mi rutina</div>
        <button
          className="card fade-up"
          onClick={() => setBuilderMode("new")}
          style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", borderLeft: `4px solid ${C.cyan}` }}
        >
          <span style={{ fontSize: 26 }}>➕</span>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Crear rutina personalizada</div>
        </button>
        {customRoutines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {customRoutines.map((r) => (
              <div key={r.id} className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.mut }}>{r.exercises.length} ejercicios</div>
                </div>
                <button onClick={() => startCustomRoutine(r)} style={{ fontSize: 16, padding: 4 }}>▶</button>
                <button onClick={() => setBuilderMode(r)} style={{ fontSize: 14, padding: 4 }}>✏️</button>
                <button onClick={() => deleteCustomRoutine(r.id)} style={{ fontSize: 14, padding: 4, color: C.red }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Fútbol: preguntar Gimnasio o Parque ── */
  if (discId === "futbol") {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Disciplinas
        </button>
        <div style={{ fontSize: 44, marginTop: 20 }}>⚽</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>¿Dónde entrenas hoy?</h2>
        <p className="muted" style={{ marginTop: 6 }}>Elige tu entorno de hoy</p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {FUTBOL_LOCATIONS.map((o) => (
            <button key={o.id} onClick={() => setDiscId(o.id)} className="card" style={{ flex: 1, padding: "18px 8px" }}>
              <div style={{ fontSize: 30 }}>{o.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>{o.label}</div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Atletismo: flujo propio con distancia + nivel + referencias ── */
  if (discId === "atletismo") {
    return (
      <div className="screen" key="atletismo">
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
          ‹ Disciplinas
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 30 }}>🏃</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.purple }}>Atletismo</h2>
            <p style={{ fontSize: 12, color: C.mut }}>Elige tu distancia objetivo</p>
          </div>
        </div>

        <div className="sec-title">Distancia</div>
        <div className="chip-wrap">
          {DISTANCES.map((d) => (
            <button
              key={d.id}
              className={`chip ${distance === d.id ? "on" : ""}`}
              style={distance === d.id ? { background: C.purple, color: "#fff" } : {}}
              onClick={() => setDistance(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {distance && ATLETISMO_BENCH[distance] && (
          <>
            <div className="sec-title">Referencias de nivel · {DISTANCES.find((d) => d.id === distance)?.label}</div>
            <div className="card" style={{ padding: "10px 14px" }}>
              {ATLETISMO_BENCH[distance].map((row) => (
                <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.mut }}>{row.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{row.t}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {distance && (
          <>
            <div className="sec-title">Nivel</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {LEVELS.map((l, i) => (
                <button
                  key={l.name}
                  className="card"
                  style={{
                    textAlign: "left", padding: "8px 10px",
                    border: `1px solid ${lvlIdx === i ? l.color : C.border}`,
                    background: lvlIdx === i ? `${l.color}18` : C.card,
                  }}
                  onClick={() => setLvlIdx(i)}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: lvlIdx === i ? l.color : C.text }}>{l.emoji} {l.name}</div>
                  <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {atletRoutine ? (
          <>
            <div className="sec-title">Tu rutina · {atletRoutine.length} ejercicios</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {atletRoutine.map((e, i) => (
                <div key={`${e.name}-${i}`} className="card fade-up" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.purple, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: C.mut }}>{e.sets} series × {e.reps}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                className="btn-xl"
                onClick={() => setSeed((s) => s + 1)}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
              >
                🔄 Variar
              </button>
              <button
                className="btn-xl"
                onClick={() => startAndFinishTutorial({
                  discId: "atletismo", discLabel: "Atletismo", discColor: C.purple, discIcon: "🏃",
                  focusLabel: DISTANCES.find((d) => d.id === distance)?.label, lvlIdx, exercises: atletRoutine,
                })}
                style={{ flex: 2, background: C.purple, color: "#fff", fontSize: 15 }}
              >
                COMENZAR SESIÓN
              </button>
            </div>
          </>
        ) : distance ? (
          <div className="card" style={{ marginTop: 20, textAlign: "center", color: C.dim, fontSize: 13 }}>
            Elige tu nivel para generar la rutina ⚡
          </div>
        ) : null}
      </div>
    );
  }

  /* ── Pregunta rápida de energía antes de los selectores ── */
  if (!energy) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Disciplinas
        </button>
        <div style={{ fontSize: 44, marginTop: 20 }}>{disc.icon}</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>¿Cómo tienes la energía hoy?</h2>
        <p className="muted" style={{ marginTop: 6 }}>La sesión se ajusta a tu día</p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {ENERGY_OPTIONS.map((o) => (
            <button key={o.id} onClick={() => chooseEnergy(o.id)} className="card" style={{ flex: 1, padding: "18px 8px" }}>
              <div style={{ fontSize: 30 }}>{o.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>{o.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Calistenia: preguntar Parque o Casa antes del enfoque ── */
  if (discId === "calistenia" && !calLocation) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Disciplinas
        </button>
        <div style={{ fontSize: 44, marginTop: 20 }}>🤸</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>¿Dónde vas a entrenar hoy?</h2>
        <p className="muted" style={{ marginTop: 6 }}>Ajustamos los ejercicios a tu equipo disponible</p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {CAL_LOCATIONS.map((o) => (
            <button key={o.id} onClick={() => setCalLocation(o.id)} className="card" style={{ flex: 1, padding: "18px 8px" }}>
              <div style={{ fontSize: 30 }}>{o.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>{o.label}</div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="screen" key={discId}>
      <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
        ‹ Disciplinas
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 30 }}>{disc.icon}</span>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: disc.color }}>{disc.label}</h2>
          <p style={{ fontSize: 12, color: C.mut }}>{disc.desc}</p>
        </div>
      </div>

      {discId === "calistenia" && (
        <div className="card" style={{ marginTop: 12, padding: "10px 14px" }}>
          <span style={{ fontSize: 12, color: C.mut }}>
            {calLocation === "casa" ? "🏠 Entrenando en casa — sin ejercicios de barra" : "🌳 Entrenando en el parque — barras disponibles"}
          </span>
          <button onClick={() => setCalLocation(null)} style={{ float: "right", color: C.cyan, fontSize: 12, fontWeight: 700 }}>
            Cambiar
          </button>
        </div>
      )}

      {energy === "low" && (
        <div className="card" style={{ marginTop: 12, padding: "11px 14px", borderColor: `${C.yellow}44`, background: "rgba(255,214,0,0.06)" }}>
          <span style={{ fontSize: 13, color: C.yellow, fontWeight: 700 }}>😴 Ajustamos la sesión. Más vale algo que nada.</span>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Un nivel abajo y una serie menos por ejercicio.</div>
        </div>
      )}
      {energy === "high" && (
        <div className="card" style={{ marginTop: 12, padding: "11px 14px", borderColor: `${C.green}44`, background: "rgba(34,255,136,0.06)" }}>
          <span style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>⚡ ¡Hoy te ves con todo!</span>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Serie extra en el primer ejercicio.</div>
        </div>
      )}

      <div className="sec-title">A · Enfoque</div>
      {showTutorial && (
        <div className="card" style={{ marginBottom: 8, padding: "9px 12px", borderColor: `${C.cyan}66`, background: "rgba(0,229,255,0.08)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Selecciona tu enfoque</p>
        </div>
      )}
      <div className="chip-wrap">
        {disc.focuses.map((f) => (
          <button
            key={f.id}
            className={`chip ${focusId === f.id ? "on" : ""}`}
            style={focusId === f.id ? { background: disc.color } : {}}
            onClick={() => setFocusId(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {FOCUS_ZONES[discId] && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <MuscleMap zones={FOCUS_ZONES[discId][focusId] || []} />
        </div>
      )}

      <div className="sec-title">B · Nivel</div>
      {showTutorial && (
        <div className="card" style={{ marginBottom: 8, padding: "9px 12px", borderColor: `${C.cyan}66`, background: "rgba(0,229,255,0.08)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Elige tu nivel honestamente</p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {LEVELS.map((l, i) => (
          <button
            key={l.name}
            className="card"
            style={{
              textAlign: "left", padding: "8px 10px",
              border: `1px solid ${lvlIdx === i ? l.color : C.border}`,
              background: lvlIdx === i ? `${l.color}18` : C.card,
            }}
            onClick={() => setLvlIdx(i)}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: lvlIdx === i ? l.color : C.text }}>{l.emoji} {l.name}</div>
            <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{l.desc}</div>
          </button>
        ))}
      </div>

      {routine ? (
        <>
          <div className="sec-title">Tu rutina · {routine.length} ejercicios</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {routine.map((e, i) => (
              <div key={`${e.name}-${i}`} className="card fade-up" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: disc.color, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: C.mut }}>{e.sets} series × {e.reps}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              className="btn-xl"
              onClick={() => setSeed((s) => s + 1)}
              style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
            >
              🔄 Variar
            </button>
            <button
              className="btn-xl"
              onClick={() => startAndFinishTutorial({ discId, discLabel: disc.label, discColor: disc.color, discIcon: disc.icon, focusLabel: disc.focuses.find((f) => f.id === focusId).label, lvlIdx, exercises: routine, calLocation: discId === "calistenia" ? calLocation : undefined })}
              style={{ flex: 2, background: disc.color, color: "#07070C", fontSize: 15 }}
            >
              COMENZAR SESIÓN
            </button>
          </div>
        </>
      ) : (
        <div className="card" style={{ marginTop: 20, textAlign: "center", color: C.dim, fontSize: 13 }}>
          Elige tu nivel para generar la rutina ⚡
        </div>
      )}
    </div>
  );
}

/* ─── SESIÓN ACTIVA ─── */
function ActiveSession({ plan, streak, sessions, onSave, onClose, voiceOn, onToggleVoice, onViewStats }) {
  const [exIdx, setExIdx] = useState(0);
  const [setNum, setSetNum] = useState(0);
  const [phase, setPhase] = useState("work"); // work | rest | exdone | finished
  const [restLeft, setRestLeft] = useState(0);
  const [logs, setLogs] = useState(() => plan.exercises.map(() => []));
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [field, setField] = useState(() => (plan.exercises[0].type === "peso" ? "weight" : "reps"));
  const [repsError, setRepsError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flashDone, setFlashDone] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [flashWhite, setFlashWhite] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [ambientOn, setAmbientOn] = useState(() => store.get("ambient", false));
  const wakeLockRef = useRef(null);
  const ambientRef = useRef(null);

  const toggleLiveMode = async () => {
    const next = !liveMode;
    setLiveMode(next);
    try {
      if (next && navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } else if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      /* Wake Lock no soportado: continúa sin bloquear pantalla */
    }
  };

  useEffect(() => () => { if (wakeLockRef.current) wakeLockRef.current.release(); }, []);

  /* Sonido ambiental de fondo, mezclado con los beeps existentes */
  useEffect(() => {
    if (!ambientOn) {
      if (ambientRef.current) { ambientRef.current.stop(); ambientRef.current = null; }
      return undefined;
    }
    ensureAudio();
    const ambientMode = plan.discId === "gimnasio" ? "gym" : plan.discId === "atletismo" ? "atletismo" : "parque";
    ambientRef.current = generateAmbientSound(ambientMode);
    return () => { if (ambientRef.current) { ambientRef.current.stop(); ambientRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientOn]);
  const [showSwipeHint] = useState(() => store.get("session_count", 0) < 3);
  const [showGestureOverlay, setShowGestureOverlay] = useState(() => store.get("session_count", 0) === 0);
  const [showStep4, setShowStep4] = useState(() => store.get("session_count", 0) === 0 && !store.get("tutorial_done", false));
  const restRef = useRef(0);
  const touchYRef = useRef(null);

  useEffect(() => {
    store.set("session_count", store.get("session_count", 0) + 1);
    store.set("tutorial_done", true);
    if (showStep4) {
      const t = setTimeout(() => setShowStep4(false), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [startTs] = useState(() => Date.now());

  const ex = plan.exercises[exIdx];
  const isLastEx = exIdx === plan.exercises.length - 1;
  const lvl = LEVELS[plan.lvlIdx];

  const popConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2500);
  };

  /* Cronómetro global de la sesión */
  useEffect(() => {
    const t = setInterval(() => setSessionSecs(Math.floor((Date.now() - startTs) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTs]);

  /* Modo competencia: comparación contra la sesión anterior de la misma disciplina+enfoque */
  const prevSession = useMemo(() => {
    return [...sessions].reverse().find(
      (s) => s.kind === "entreno" && s.disc === plan.discId && s.focusLabel === plan.focusLabel
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const prevTotals = useMemo(() => {
    if (!prevSession) return null;
    const okSets = prevSession.exercises.flatMap((e) => e.sets).filter((st) => st.ok);
    return { sets: okSets.length, volume: Math.round(okSets.reduce((a, st) => a + st.weight * st.reps, 0)) };
  }, [prevSession]);

  /* Historial y récords ANTERIORES a esta sesión (para comparativas en la pantalla final) */
  const priorHistory = useMemo(() => sessions, []); // eslint-disable-line react-hooks/exhaustive-deps
  const priorRecords = useMemo(() => computeRecords(priorHistory), [priorHistory]);
  const priorAvgVolume = useMemo(() => {
    const w = priorHistory.filter((s) => s.kind === "entreno");
    if (!w.length) return 0;
    return w.reduce((a, s) => a + sessionVolume(s), 0) / w.length;
  }, [priorHistory]);

  /* Sugerencias de peso calculadas al iniciar la sesión */
  const suggestions = useMemo(
    () => plan.exercises.map((e) => (e.type === "peso" ? weightSuggestion(sessions, e.name) : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const sug = suggestions[exIdx];

  const endRest = () => {
    setPhase("work");
    setSetNum((n) => n + 1);
  };

  useEffect(() => {
    if (phase !== "rest") return undefined;
    const t = setInterval(() => {
      restRef.current -= 1;
      if (restRef.current === 3) softBeep();
      if (restRef.current <= 0) {
        tripleBeep();
        if (voiceOn) speak("¡Siguiente serie!");
        setPhase("work");
        setSetNum((n) => n + 1);
      } else {
        setRestLeft(restRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Anuncia el nombre del ejercicio al empezarlo */
  useEffect(() => {
    if (voiceOn) speak(ex.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exIdx]);

  const pressKey = (k) => {
    const cur = field === "weight" ? weight : reps;
    let next;
    if (k === "⌫") {
      next = cur.slice(0, -1);
    } else if (k === ".") {
      if (field !== "weight" || cur.includes(".")) return;
      next = cur === "" ? "0." : cur + ".";
    } else {
      if (cur.replace(".", "").length >= 4) return;
      next = cur === "0" ? k : cur + k;
    }
    const cap = field === "weight" ? 500 : 200;
    if (parseFloat(next) > cap) next = String(cap);
    if (field === "weight") setWeight(next);
    else setReps(next);
  };

  const attemptComplete = () => {
    if (ex.type !== "tiempo" && reps.trim() === "") {
      setRepsError(true);
      setField("reps");
      setTimeout(() => setRepsError(false), 1000);
      return;
    }
    logSet(true);
  };

  const finishSession = (finalLogs) => {
    const record = {
      id: Date.now(),
      ts: Date.now(),
      kind: "entreno",
      disc: plan.discId,
      focusLabel: plan.focusLabel,
      levelIdx: plan.lvlIdx,
      calLocation: plan.calLocation,
      durationMin: Math.round(sessionSecs / 60),
      exercises: plan.exercises.map((e, i) => ({ name: e.name, sets: finalLogs[i] })),
    };
    onSave(record);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (voiceOn) speak(`¡Sesión completada! Eres un ${LEVELS[plan.lvlIdx]?.name || ""}`);
    popConfetti();
    setFlashWhite(true);
    setTimeout(() => setFlashWhite(false), 300);
    setPhase("finished");
  };

  const logSet = (ok, repsOverride = null) => {
    ensureAudio(); // el AudioContext debe nacer en un gesto del usuario (móvil)
    if (ok && navigator.vibrate) navigator.vibrate(100);
    const repsVal = repsOverride !== null ? repsOverride : parseInt(reps, 10) || 0;
    const entry = { reps: repsVal, weight: parseFloat(weight) || 0, ok };
    const updatedLogs = logs.map((arr, i) => (i === exIdx ? [...arr, entry] : arr));
    setLogs(updatedLogs);
    setReps("");
    if (setNum + 1 >= ex.sets) {
      setFlashDone(true);
      setTimeout(() => setFlashDone(false), 300);
      if (isLastEx) {
        /* Última serie del último ejercicio: va directo a felicitaciones */
        finishSession(updatedLogs);
        return;
      }
      if (voiceOn) speak("¡Ejercicio completado!");
      setPhase("exdone");
    } else if (ex.rest > 0) {
      restRef.current = ex.rest;
      setRestLeft(ex.rest);
      setPhase("rest");
    } else {
      setSetNum((n) => n + 1);
    }
  };

  const nextExercise = () => {
    if (isLastEx) {
      /* Reserva de seguridad: normalmente ya se pasó a "finished" automáticamente desde logSet */
      finishSession(logs);
    } else {
      const nextEx = plan.exercises[exIdx + 1];
      setExIdx((i) => i + 1);
      setSetNum(0);
      setWeight("");
      setField(nextEx.type === "peso" ? "weight" : "reps");
      setPhase("work");
    }
  };

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const quit = () => setShowExitConfirm(true);

  /* Felicitaciones — resumen épico post-sesión */
  if (phase === "finished") {
    const allSets = logs.flat();
    const okSets = allSets.filter((s) => s.ok).length;
    const totalPlanned = plan.exercises.reduce((a, e) => a + e.sets, 0);
    const pctComplete = totalPlanned > 0 ? okSets / totalPlanned : 1;
    const volume = Math.round(allSets.reduce((acc, s) => acc + s.weight * s.reps, 0));
    const newStreak = streak;
    const hero = heroForStreak(newStreak);
    const justUnlocked = HEROES.find((h) => h.days === newStreak);

    const title = pctComplete >= 1 ? "¡SESIÓN PERFECTA! 🔥" : pctComplete > 0.8 ? "¡Gran trabajo! 💪" : "¡Buen esfuerzo! Mañana más fuerte 🦾";
    const bulldogs = (volume / 20).toFixed(0); // 1 bulldog ≈ 20kg

    const volDiffPct = priorAvgVolume > 0 ? Math.round(((volume - priorAvgVolume) / priorAvgVolume) * 100) : null;

    /* Detectar si esta sesión rompió algún récord previo */
    let newRecord = null;
    plan.exercises.forEach((e, i) => {
      const okLogs = (logs[i] || []).filter((l) => l.ok);
      if (!okLogs.length) return;
      const best = okLogs.reduce((a, b) => (b.weight * 1000 + b.reps > a.weight * 1000 + a.reps ? b : a));
      const prior = priorRecords.find((r) => r.name === e.name);
      const bestScore = best.weight * 1000 + best.reps;
      if (!prior || bestScore > prior.score) {
        if (!newRecord || bestScore - (prior?.score || 0) > newRecord.improvement) {
          newRecord = { name: e.name, weight: best.weight, reps: best.reps, improvement: bestScore - (prior?.score || 0) };
        }
      }
    });

    /* Sugerencia de la siguiente sesión (equilibrio muscular básico) */
    const NEXT_SUGGESTION = {
      pecho: "Espalda y bíceps", espalda: "Pecho y tríceps", piernas: "Tren superior",
      hombros: "Piernas y core", brazos: "Piernas", gluteos: "Tren superior",
      sup: "Piernas y glúteos", inf: "Pecho, espalda y hombros", todo: "Un enfoque específico mañana",
    };
    const focusKey = Object.keys(NEXT_SUGGESTION).find((k) => plan.focusLabel?.toLowerCase().includes(k));
    const suggestion = plan.discId === "gimnasio" ? NEXT_SUGGESTION[focusKey] || "Otro grupo muscular" : null;

    return (
      <div className="screen fade-up" style={{ paddingTop: 30, textAlign: "center", paddingBottom: 30 }}>
        {flashWhite && <div className="white-flash" />}
        <Confetti show={confetti} />
        <div className="unlock-pop" style={{ fontSize: 64 }}>{hero.emoji}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{title}</h2>
        <p style={{ color: C.mut, marginTop: 4, fontSize: 13 }}>Sesión de {plan.discLabel} completada</p>

        {justUnlocked && (
          <div className="card unlock-pop" style={{ marginTop: 14, borderColor: C.yellow, background: "rgba(255,214,0,0.07)" }}>
            <div style={{ fontSize: 36 }}>{justUnlocked.emoji}</div>
            <div style={{ fontWeight: 800, color: C.yellow, marginTop: 4, fontSize: 13 }}>¡Héroe desbloqueado: {justUnlocked.name}!</div>
            <div style={{ fontSize: 11, color: C.mut, fontStyle: "italic" }}>“{justUnlocked.quote}”</div>
          </div>
        )}

        {newRecord && (
          <div className="card pop" style={{ marginTop: 12, borderColor: C.yellow, background: "rgba(255,214,0,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.yellow }}>🏆 NUEVO RÉCORD PERSONAL</div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
              {newRecord.name}: {newRecord.weight > 0 ? `${newRecord.weight} kg × ${newRecord.reps}` : `${newRecord.reps} reps`}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <StatBox label="⏱ Tiempo" value={`${Math.floor(sessionSecs / 60)} min`} accent={C.cyan} />
          <StatBox label="💪 Series" value={`${okSets}/${totalPlanned}`} accent={C.green} />
          <StatBox label="🔥 Racha" value={newStreak} accent={C.orange} />
        </div>

        {volume > 0 && (
          <div className="card" style={{ marginTop: 10, padding: "12px" }}>
            <span style={{ fontSize: 13, color: C.mut }}>🏋️ Volumen total: </span>
            <span style={{ fontWeight: 800, color: C.cyan }}>{volume} kg</span>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>Levantaste el peso de {bulldogs} bulldogs 🐕</div>
          </div>
        )}

        {volDiffPct !== null && (
          <div className="card" style={{ marginTop: 8, padding: "11px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: volDiffPct >= 0 ? C.green : C.mut }}>
              {volDiffPct >= 0 ? `+${volDiffPct}% de volumen vs tu promedio 📈` : `${volDiffPct}% vs tu promedio — eso está bien, descansa mañana`}
            </span>
          </div>
        )}

        {suggestion && (
          <div className="card" style={{ marginTop: 8, padding: "11px" }}>
            <span style={{ fontSize: 12, color: C.mut }}>Mañana sugerido: </span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{suggestion}</span>
          </div>
        )}

        {prevTotals && (
          <div className="card" style={{ marginTop: 8, padding: "12px" }}>
            {volume >= prevTotals.volume ? (
              <span style={{ fontSize: 13, fontWeight: 800, color: C.green }}>GANASTE contra tu yo anterior 🏆</span>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>PERDISTE por poco — mañana la revancha 💪</span>
            )}
          </div>
        )}

        <button
          className="btn-xl"
          onClick={async () => {
            const lvlName = LEVELS[plan.lvlIdx]?.name || "";
            const text = `Completé ${okSets} series en ${plan.discLabel} nivel ${lvlName} con F.A.S.E. 💪 f-a-s-e.vercel.app`;
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* portapapeles no disponible */
            }
          }}
          style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
        >
          {copied ? "¡Copiado!" : "📤 Compartir"}
        </button>
        {onViewStats && (
          <button
            className="btn-xl"
            onClick={onViewStats}
            style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
          >
            📊 Ver estadísticas
          </button>
        )}
        <button
          className="btn-xl"
          onClick={onClose}
          style={{ marginTop: 10, background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`, color: "#07070C" }}
        >
          🏠 VOLVER AL INICIO
        </button>
      </div>
    );
  }

  /* Descanso — timer gigante visible a distancia */
  if (phase === "rest") {
    return (
      <div
        className="fade-up"
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(7, 7, 12, 0.88)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "0 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            minHeight: "60vh", width: "100%", maxWidth: 430,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
          }}
        >
          <p style={{ color: C.mut, fontSize: 13, fontWeight: 800, letterSpacing: 4 }}>DESCANSO</p>
          <div
            style={{
              fontSize: 56, fontWeight: 900, lineHeight: 1, marginTop: 14,
              color: restLeft <= 5 ? C.green : C.text, transition: "color .3s",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {restLeft}
          </div>
          <p style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>segundos</p>
        </div>
        <div style={{ width: "100%", maxWidth: 430 }}>
          <div className="card" style={{ textAlign: "left" }}>
            <p style={{ fontSize: 12, color: C.dim, fontWeight: 700 }}>SIGUIENTE SERIE</p>
            <p style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{ex.name}</p>
            <p style={{ fontSize: 13, color: C.mut, marginTop: 2 }}>
              Serie {setNum + 2} de {ex.sets} · {ex.reps}
            </p>
          </div>
          <button
            className="btn-xl"
            onClick={endRest}
            style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          >
            SALTAR DESCANSO ⏭
          </button>
        </div>
      </div>
    );
  }

  /* Ejercicio (work / exdone) */
  const doneSets = logs[exIdx];
  return (
    <div className={`screen session-rise ${liveMode ? "live-mode" : ""}`} style={{ paddingBottom: 30 }}>
      {showExitConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="card" style={{ maxWidth: 340, textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>¿Seguro que quieres salir?</p>
            <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>Perderás el progreso de esta sesión</p>
            <button
              className="btn-xl" onClick={onClose} aria-label="Confirmar salida de la sesión"
              style={{ marginTop: 16, background: C.red, color: "#fff" }}
            >
              Sí, salir
            </button>
            <button
              className="btn-xl" onClick={() => setShowExitConfirm(false)} aria-label="Continuar entrenando"
              style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
            >
              Continuar entrenando
            </button>
          </div>
        </div>
      )}
      {showGestureOverlay && (
        <button
          onClick={() => setShowGestureOverlay(false)}
          aria-label="Cerrar guía de gestos"
          style={{
            position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.75)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24,
          }}
        >
          <p style={{ fontSize: 34 }}>↑</p>
          <p style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>Desliza arriba para completar serie</p>
          <p style={{ fontSize: 34, marginTop: 10 }}>↓</p>
          <p style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>Desliza abajo si no pudiste</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 16 }}>Toca en cualquier lugar para continuar</p>
        </button>
      )}
      {showStep4 && (
        <div className="card unlock-pop" style={{ position: "fixed", top: 70, left: 12, right: 12, zIndex: 100, textAlign: "center", padding: 14, borderColor: `${C.green}66` }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.green }}>¡Perfecto! La sesión empieza ahora</p>
        </div>
      )}
      {!liveMode && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={quit} style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>✕ Salir</button>
          <span style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>
            {plan.discIcon} {plan.discLabel} · {lvl.emoji} {lvl.name}
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: sessionSecs > 5400 ? C.orange : C.text, fontVariantNumeric: "tabular-nums" }}>
            ⏱ {String(Math.floor(sessionSecs / 60)).padStart(2, "0")}:{String(sessionSecs % 60).padStart(2, "0")}
          </span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: liveMode ? "space-between" : "flex-end", alignItems: "center", gap: 6, marginTop: liveMode ? 0 : 4 }}>
        {liveMode && (
          <>
            <button onClick={quit} style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>✕ Salir</button>
            <span style={{ fontSize: 11, color: C.dim }}>🔆 Pantalla activa</span>
          </>
        )}
        <button onClick={() => setAmbientOn((v) => { const nv = !v; store.set("ambient", nv); return nv; })} aria-label="Sonido ambiental" style={{ fontSize: 14, padding: 4 }}>
          {ambientOn ? "🎵" : "🔇"}
        </button>
        <button onClick={onToggleVoice} aria-label="Alternar voz" style={{ fontSize: 14, padding: 4 }}>
          {voiceOn ? "🔊" : "🔈"}
        </button>
        <button onClick={toggleLiveMode} aria-label="Modo pantalla activa" style={{ fontSize: 14, padding: 4 }}>
          {liveMode ? "👁️‍🗨️" : "👁️"}
        </button>
      </div>

      {prevTotals && (() => {
        const curSets = logs.flat().filter((s) => s.ok).length;
        const diff = curSets - prevTotals.sets;
        return (
          <div className="card" style={{ marginTop: 10, padding: "8px 12px", textAlign: "center" }}>
            <span style={{ fontSize: 11, color: C.mut }}>vs tu mejor sesión anterior de {plan.discLabel}: </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: diff >= 0 ? C.green : C.orange }}>
              {diff >= 0 ? `Vas +${diff} series adelante 🔥` : `Vas ${diff} series atrás ⚠️ — dale!`}
            </span>
          </div>
        );
      })()}

      {/* Progreso de la sesión */}
      <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
        {plan.exercises.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 99,
              background: i < exIdx ? plan.discColor : i === exIdx ? `${plan.discColor}66` : C.border,
              transition: "background .3s",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
        Ejercicio {exIdx + 1} de {plan.exercises.length}
      </p>

      <div
        className="card fade-up"
        key={exIdx}
        style={{
          marginTop: 10, borderLeft: `4px solid ${plan.discColor}`,
          boxShadow: flashDone ? `0 0 0 2px ${C.green}` : "none",
          transition: "box-shadow .3s ease",
        }}
        onTouchStart={(e) => { touchYRef.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (touchYRef.current === null || phase !== "work" || ex.type === "tiempo") return;
          const dy = e.changedTouches[0].clientY - touchYRef.current;
          touchYRef.current = null;
          if (dy < -60) attemptComplete();
          else if (dy > 60) logSet(false);
        }}
      >
        <ExerciseDemo exerciseName={ex.name} />
        <h2 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.25, marginTop: 12 }}>{ex.name}</h2>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          <span style={{ color: plan.discColor, fontWeight: 800 }}>{ex.sets} series</span>
          <span style={{ color: C.mut }}> × </span>
          <span style={{ fontWeight: 800 }}>{ex.reps}</span>
        </p>
        <p style={{ marginTop: 10, fontSize: 13, color: C.mut, lineHeight: 1.5 }}>💡 {ex.tip}</p>
        {showSwipeHint && phase === "work" && ex.type !== "tiempo" && (
          <p style={{ marginTop: 8, fontSize: 11, color: C.cyan, textAlign: "center" }}>💡 Desliza arriba para completar serie</p>
        )}
      </div>

      {/* Series completadas */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {Array.from({ length: ex.sets }).map((_, i) => {
          const log = doneSets[i];
          return (
            <div
              key={i}
              style={{
                minWidth: 46, height: 44, padding: "5px 8px", borderRadius: 11, textAlign: "center",
                display: "flex", flexDirection: "column", justifyContent: "center",
                background: log ? (log.ok ? "rgba(34,255,136,0.10)" : "rgba(255,59,92,0.10)") : i === setNum && phase === "work" ? C.card2 : C.surface,
                border: `1px solid ${log ? (log.ok ? "rgba(34,255,136,0.4)" : "rgba(255,59,92,0.4)") : i === setNum && phase === "work" ? plan.discColor : C.border}`,
              }}
            >
              <div style={{ fontSize: 11, color: C.dim }}>S{i + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: log ? (log.ok ? C.green : C.red) : C.mut }}>
                {log ? (log.ok ? `${log.reps || "✓"}` : "✗") : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {phase === "work" && ex.type === "tiempo" ? (
        <>
          <Stopwatch
            key={`${exIdx}-${setNum}`}
            target={parseTargetSeconds(ex.reps)}
            onStop={(secs) => logSet(true, secs)}
          />
          <button
            className="btn-xl"
            onClick={() => logSet(false, 0)}
            style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 14 }}
          >
            No pude 😤
          </button>
        </>
      ) : phase === "work" ? (
        <>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {ex.type === "peso" && (
              <button
                onClick={() => setField("weight")}
                style={{
                  flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 14,
                  background: field === "weight" ? C.card2 : C.surface,
                  border: `2px solid ${field === "weight" ? plan.discColor : C.border}`,
                  transition: "border-color .2s ease",
                }}
              >
                <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>PESO (KG)</div>
                <div style={{
                  fontSize: 38, fontWeight: 900, marginTop: 2, fontVariantNumeric: "tabular-nums",
                  color: weight === "" ? C.dim : C.text,
                }}>
                  {weight !== "" ? weight : sug ? sug.weight : "kg"}
                </div>
              </button>
            )}
            <button
              onClick={() => setField("reps")}
              className={repsError ? "shake-error" : ""}
              style={{
                flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 14,
                background: field === "reps" ? C.card2 : C.surface,
                border: `2px solid ${field === "reps" ? plan.discColor : C.border}`,
                transition: "border-color .2s ease",
              }}
            >
              <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>
                {ex.type === "tiempo" ? "TIEMPO (SEG)" : "REPS HECHAS"}
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, marginTop: 2, fontVariantNumeric: "tabular-nums", color: reps === "" ? C.dim : C.text }}>
                {reps || "reps"}
              </div>
            </button>
          </div>
          {ex.type === "peso" && (
            <p style={{ fontSize: 12, color: C.mut, marginTop: 8, textAlign: "center" }}>
              {sug
                ? sug.up
                  ? `💪 Completaste todo la última vez: sugerido ${sug.weight} kg (+2.5)`
                  : `Último peso: ${sug.weight} kg — mantén o baja un poco`
                : "Primera vez — empieza ligero"}
            </p>
          )}
          <NumPad onKey={pressKey} />
          <button
            className="btn-xl"
            onClick={attemptComplete}
            style={{ marginTop: 14, background: plan.discColor, color: "#07070C" }}
          >
            ✓ SERIE COMPLETADA
          </button>
          <button
            className="btn-xl"
            onClick={() => logSet(false)}
            style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 14 }}
          >
            No pude 😤
          </button>
        </>
      ) : (
        <button
          className="btn-xl pop"
          onClick={nextExercise}
          style={{
            marginTop: 18, background: `linear-gradient(90deg, ${C.green}, #00CC66)`, color: "#07070C",
            boxShadow: "0 8px 30px rgba(34,255,136,0.3)",
          }}
        >
          {isLastEx ? "FINALIZAR ENTRENAMIENTO 🏁" : "SIGUIENTE EJERCICIO →"}
        </button>
      )}
    </div>
  );
}

/* ─── Exportar historial CSV ─── */
function exportCSV(sessions) {
  const rows = [["Fecha", "Disciplina", "Nivel", "Duración (min)", "Ejercicio", "Series completadas", "Peso promedio (kg)", "Reps promedio"]];
  sessions
    .filter((s) => s.kind === "entreno")
    .forEach((s) => {
      const fecha = new Date(s.ts).toLocaleDateString("es");
      const discLabel = DISCIPLINES[s.disc]?.label || s.disc;
      const nivel = LEVELS[s.levelIdx]?.name || "";
      const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
      const durMin = Math.round(totalSets * 2.5); // estimación: ~2.5 min por serie
      s.exercises.forEach((e) => {
        const ok = e.sets.filter((st) => st.ok).length;
        const conPeso = e.sets.filter((st) => st.weight > 0);
        const avgW = conPeso.length ? (conPeso.reduce((a, st) => a + st.weight, 0) / conPeso.length).toFixed(1) : "";
        const conReps = e.sets.filter((st) => st.reps > 0);
        const avgR = conReps.length ? (conReps.reduce((a, st) => a + st.reps, 0) / conReps.length).toFixed(1) : "";
        rows.push([fecha, discLabel, nivel, durMin, e.name, ok, avgW, avgR]);
      });
    });
  const csv = "﻿" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FASE_historial_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Calculadora de 1RM (fórmula Epley) ─── */
const RM_EXERCISES = ["Sentadilla", "Press banca", "Peso muerto", "Press militar", "Remo con barra"];
const RM_TABLE = [
  { pct: 95, label: "Fuerza máxima", reps: "1-2 reps" },
  { pct: 85, label: "Fuerza", reps: "3-5 reps" },
  { pct: 75, label: "Hipertrofia pesada", reps: "6-8 reps" },
  { pct: 65, label: "Hipertrofia", reps: "10-12 reps" },
  { pct: 55, label: "Resistencia", reps: "15+ reps" },
];
const round2p5 = (x) => Math.round(x / 2.5) * 2.5;

/* ─── Montaña de progreso 3D (CSS transforms, sin WebGL) ─── */
function Mountain3DChart({ sessions }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEntered(true), 50); return () => clearTimeout(t); }, []);

  const weeks = useMemo(() => {
    const now = seedNow();
    const buckets = Array.from({ length: 8 }, () => 0);
    sessions.filter((s) => s.kind === "entreno").forEach((s) => {
      const weeksAgo = Math.floor((now - s.ts) / (7 * 86400000));
      if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += sessionVolume(s);
    });
    return buckets;
  }, [sessions]);

  const max = Math.max(1, ...weeks);
  const hasData = weeks.some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="card" style={{ textAlign: "center", color: C.dim, fontSize: 13, padding: "20px 12px" }}>
        Aún no hay volumen registrado. Completa sesiones con peso para ver tu montaña de progreso.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "20px 10px 10px", overflow: "hidden" }}>
      <div style={{ perspective: 800, height: 140 }}>
        <div
          className="mountain3d-base"
          style={{
            display: "flex", alignItems: "flex-end", gap: 6, height: 120,
            transform: "rotateX(30deg)", transformStyle: "preserve-3d",
          }}
        >
          {weeks.map((v, i) => {
            const h = Math.max(4, Math.round((v / max) * 110));
            const shade = 20 + Math.round((i / 7) * 60); // más oscuro (viejo) a más claro (actual)
            const isNow = i === 7;
            return (
              <div
                key={i}
                style={{
                  flex: 1, height: entered ? h : 0, borderRadius: "3px 3px 0 0",
                  background: isNow ? C.cyan : `hsl(190, 80%, ${shade}%)`,
                  transform: `translateZ(${i * 3}px)`,
                  transition: `height .6s ease ${i * 0.06}s`,
                  boxShadow: isNow ? `0 0 12px ${C.cyan}88` : "none",
                }}
              />
            );
          })}
        </div>
      </div>
      <p style={{ fontSize: 10, color: C.dim, textAlign: "center", marginTop: 6 }}>Volumen semanal · últimas 8 semanas</p>
    </div>
  );
}

/* ─── Wizard de 3 preguntas para generar el plan semanal ─── */
function PlanWizard({ onBack, onGenerate }) {
  const [days, setDays] = useState(4);
  const [goal, setGoal] = useState("musculo");
  const [duration, setDuration] = useState(60);
  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Progreso</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>📅 Mi plan</h2>
      <p className="muted" style={{ marginTop: 2 }}>Responde 3 preguntas y genera tu plan semanal</p>

      <div className="sec-title">¿Cuántos días a la semana entrenas?</div>
      <div className="chip-wrap">
        {[3, 4, 5, 6].map((n) => (
          <button key={n} className={`chip ${days === n ? "on" : ""}`} style={days === n ? { background: C.cyan } : {}} onClick={() => setDays(n)}>{n}</button>
        ))}
      </div>

      <div className="sec-title">¿Tu objetivo principal?</div>
      <div className="chip-wrap">
        {PLAN_GOALS.map((g) => (
          <button key={g.id} className={`chip ${goal === g.id ? "on" : ""}`} style={goal === g.id ? { background: C.cyan } : {}} onClick={() => setGoal(g.id)}>{g.label}</button>
        ))}
      </div>

      <div className="sec-title">¿Cuánto tiempo por sesión?</div>
      <div className="chip-wrap">
        {PLAN_DURATIONS.map((d) => (
          <button key={d} className={`chip ${duration === d ? "on" : ""}`} style={duration === d ? { background: C.cyan } : {}} onClick={() => setDuration(d)}>{d} min</button>
        ))}
      </div>

      <button className="btn-xl" onClick={() => onGenerate(days, goal, duration)} style={{ marginTop: 18, background: C.cyan, color: "#07070C" }}>
        🗓️ GENERAR MI PLAN
      </button>
    </div>
  );
}

/* ─── Pantalla "Mi estilo": temas visuales ─── */
function ThemeScreen({ sessions, freezes, activeThemeId, onSelect, onBack }) {
  const stats = useMemo(() => computeAchievementStats(sessions, freezes), [sessions, freezes]);
  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Volver</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>🎨 Mi estilo</h2>
      <p className="muted" style={{ marginTop: 2 }}>Elige el tema visual de tu app</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {THEMES.map((t) => {
          const unlocked = !t.locked || t.check(stats);
          const active = activeThemeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => unlocked && onSelect(t.id)}
              className="card"
              style={{
                display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                background: t.card, border: `2px solid ${active ? t.accent : t.border}`,
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <span style={{ fontSize: 28 }}>{unlocked ? t.emoji : "🔒"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: unlocked ? t.accent : C.mut }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>
                  {unlocked ? (active ? "Activo" : "Toca para aplicar") : t.unlockDesc}
                </div>
              </div>
              {active && <span style={{ fontSize: 16, color: t.accent }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Código F.A.S.E. único por usuario (2 letras + 4 dígitos) ─── */
function getFaseCode(name) {
  let code = store.get("fase_code_val", null);
  if (!code) {
    const letters = (name || "XX").replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase().padEnd(2, "X");
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    code = `FASE-${letters}${digits}`;
    store.set("fase_code_val", code);
  }
  return code;
}

/* Lazy-load de html2canvas desde CDN solo cuando se necesita exportar la imagen */
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve(window.html2canvas);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/* ─── Tarjeta de perfil pública / exportable ─── */
function ProfileCard({ name, sessions, streak, freezes, onBack }) {
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const code = useMemo(() => getFaseCode(name), [name]);
  const { list: achievements } = useMemo(() => computeAchievements(sessions, freezes), [sessions, freezes]);
  const unlocked = achievements.filter((a) => a.unlocked);
  const globalIdx = levelFromCount(sessions.length, GLOBAL_LEVEL_THRESHOLDS);
  const globalLvl = LEVELS[globalIdx];
  const xpInfo = computeXP(sessions, unlocked.length, Math.max(longestStreakEver(sessions), streak));
  const gStats = computeGlobalStats(sessions);
  const hero = heroForStreak(streak);
  const bestStreak = Math.max(longestStreakEver(sessions), streak);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  };

  const saveImage = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardRef.current, { backgroundColor: C.bg, scale: 2 });
      const link = document.createElement("a");
      link.download = `fase-perfil-${code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("No se pudo generar la imagen. Revisa tu conexión a internet.");
    }
    setSaving(false);
  };

  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Volver</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>Mi perfil F.A.S.E.</h2>

      <div ref={cardRef} className="card" style={{ marginTop: 14, padding: "24px 18px", textAlign: "center", background: C.card, border: `1px solid ${C.cyan}55` }}>
        <div style={{ fontSize: 64 }}>{hero.emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{name}</div>
        <div style={{ fontSize: 12, color: C.cyan, fontWeight: 700, marginTop: 2 }}>Código: {code}</div>
        <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
          <p style={{ fontSize: 13 }}>🔥 Racha: {streak} días</p>
          <p style={{ fontSize: 13 }}>💪 Sesiones: {sessions.length}</p>
          <p style={{ fontSize: 13 }}>🏆 Nivel: {globalLvl.name}</p>
          <p style={{ fontSize: 13 }}>⭐ XP: {xpInfo.xp} (Rango {xpInfo.roman})</p>
        </div>
        <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
          <p style={{ fontSize: 12, color: C.mut }}>Disciplina favorita: {DISCIPLINES[gStats.favDiscId]?.label || "—"}</p>
          <p style={{ fontSize: 12, color: C.mut }}>Ejercicio estrella: {gStats.favExercise || "—"}</p>
          <p style={{ fontSize: 12, color: C.mut }}>Mejor racha: {bestStreak} días</p>
        </div>
        <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
        <p style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>LOGROS</p>
        <div style={{ fontSize: 22 }}>
          {unlocked.length ? unlocked.slice(0, 8).map((a) => a.emoji).join(" ") : "—"}
        </div>
      </div>

      <button className="btn-xl" onClick={saveImage} disabled={saving} style={{ marginTop: 14, background: C.cyan, color: "#07070C" }}>
        {saving ? "Generando..." : "📸 Guardar como imagen"}
      </button>
      <button className="btn-xl" onClick={copyCode} style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
        {copied ? "¡Copiado!" : "📋 Copiar código"}
      </button>
    </div>
  );
}

function OneRM({ onBack }) {
  const [exName, setExName] = useState(RM_EXERCISES[0]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [saved, setSaved] = useState(() => store.get("1rm", {}));

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const valid = w > 0 && r > 0 && r <= 30;
  const rm = valid ? round2p5(w * (1 + r / 30)) : null;
  const stored = saved[exName];
  const shown = rm ?? (stored ? stored.rm : null);

  const save = () => {
    if (!rm) return;
    const next = { ...saved, [exName]: { rm, weight: w, reps: r, ts: Date.now() } };
    setSaved(next);
    store.set("1rm", next);
  };

  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
        ‹ Progreso
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>💪 Mi fuerza</h2>
      <p className="muted" style={{ marginTop: 2 }}>Calcula tu repetición máxima (1RM) con la fórmula Epley</p>

      <div className="sec-title">Ejercicio</div>
      <div className="chip-wrap">
        {RM_EXERCISES.map((e) => (
          <button
            key={e}
            className={`chip ${exName === e ? "on" : ""}`}
            style={exName === e ? { background: C.cyan } : {}}
            onClick={() => setExName(e)}
          >
            {e}
          </button>
        ))}
      </div>

      {stored && (
        <div className="card" style={{ marginTop: 12, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.mut }}>Tu 1RM guardado</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.cyan }}>
            {stored.rm} kg <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>({fmtDate(stored.ts)})</span>
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>PESO USADO (KG)</label>
          <input
            className="input" type="number" inputMode="decimal" placeholder="0"
            value={weight} onChange={(e) => setWeight(e.target.value)} style={{ marginTop: 6 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>REPS REALIZADAS</label>
          <input
            className="input" type="number" inputMode="numeric" placeholder="0"
            value={reps} onChange={(e) => setReps(e.target.value)} style={{ marginTop: 6 }}
          />
        </div>
      </div>

      {shown !== null && (
        <div className="card fade-up" style={{ marginTop: 16, textAlign: "center", padding: "22px 16px", borderColor: `${C.cyan}55` }}>
          <div style={{ fontSize: 12, color: C.mut, fontWeight: 700, letterSpacing: 1.5 }}>1RM ESTIMADO · {exName.toUpperCase()}</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: C.cyan, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {shown} kg
          </div>
          {rm && (
            <button
              className="btn-xl"
              onClick={save}
              style={{ marginTop: 14, background: C.cyan, color: "#07070C", fontSize: 12, padding: 13 }}
            >
              💾 GUARDAR 1RM
            </button>
          )}
        </div>
      )}

      {shown !== null && (
        <>
          <div className="sec-title">Cargas de entrenamiento</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RM_TABLE.map((row) => (
              <div key={row.pct} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>
                <span style={{
                  fontSize: 12, fontWeight: 800, color: C.cyan, background: `${C.cyan}18`,
                  padding: "4px 9px", borderRadius: 99, border: `1px solid ${C.cyan}44`, flexShrink: 0,
                }}>
                  {row.pct}%
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: C.mut }}>{row.reps}</div>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {round2p5((shown * row.pct) / 100)} kg
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="disclaimer">
        Estimación orientativa. El 1RM real depende de tu técnica y experiencia; no lo intentes sin supervisión.
      </p>
    </div>
  );
}

/* ─── PROGRESO ─── */
function Progress({ sessions, freezes = [], streak = 0, onQuickStart }) {
  const [detail, setDetail] = useState(false);
  const [show1rm, setShow1rm] = useState(false);
  const [recordDetail, setRecordDetail] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState(() => store.get("weekly_plan", null));

  const [newAchievement, setNewAchievement] = useState(null);
  const [achConfetti, setAchConfetti] = useState(false);
  const { list: achievements, justUnlocked } = useMemo(() => computeAchievements(sessions, freezes), [sessions, freezes]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  useEffect(() => {
    if (justUnlocked.length === 0) return undefined;
    const t0 = setTimeout(() => {
      setNewAchievement(justUnlocked[0]);
      setAchConfetti(true);
    }, 0);
    const t1 = setTimeout(() => setNewAchievement(null), 3000);
    const t2 = setTimeout(() => setAchConfetti(false), 2500);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justUnlocked.length]);
  const [bestStreak] = useState(() => {
    const best = Math.max(longestStreakEver(sessions), streak, store.get("best_streak", 0));
    store.set("best_streak", best);
    return best;
  });
  const xpInfo = useMemo(() => computeXP(sessions, unlockedCount, bestStreak), [sessions, unlockedCount, bestStreak]);
  const globalStats = useMemo(() => computeGlobalStats(sessions), [sessions]);

  const workouts = sessions.filter((s) => s.kind === "entreno");
  const globalIdx = levelFromCount(sessions.length, GLOBAL_LEVEL_THRESHOLDS);
  const globalLvl = LEVELS[globalIdx];
  const nextThreshold = GLOBAL_LEVEL_THRESHOLDS[globalIdx + 1];

  const allSets = workouts.flatMap((s) => s.exercises.flatMap((e) => e.sets));
  const weighted = allSets.filter((s) => s.weight > 0);
  const avgWeight = weighted.length ? (weighted.reduce((a, s) => a + s.weight, 0) / weighted.length).toFixed(1) : null;
  const repSets = allSets.filter((s) => s.reps > 0);
  const avgReps = repSets.length ? (repSets.reduce((a, s) => a + s.reps, 0) / repSets.length).toFixed(1) : null;
  const maxWeight = weighted.length ? Math.max(...weighted.map((s) => s.weight)) : 0;

  const exStats = useMemo(() => {
    const map = {};
    workouts.forEach((s) => {
      s.exercises.forEach((e) => {
        if (!map[e.name]) map[e.name] = { count: 0, maxW: 0 };
        map[e.name].count += 1;
        e.sets.forEach((st) => { if (st.weight > map[e.name].maxW) map[e.name].maxW = st.weight; });
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 12);
  }, [workouts]);

  /* Volumen (kg) de las últimas 8 sesiones de entreno */
  const volumeChart = useMemo(() => {
    const last8 = workouts.slice(-8);
    const vols = last8.map((s) => ({
      ts: s.ts,
      vol: Math.round(s.exercises.flatMap((e) => e.sets).filter((st) => st.ok).reduce((a, st) => a + st.weight * st.reps, 0)),
    }));
    const max = Math.max(1, ...vols.map((v) => v.vol));
    return { vols, max };
  }, [workouts]);

  const records = useMemo(() => computeRecords(sessions), [sessions]);
  const [now] = useState(() => Date.now());

  const maxPullups = useMemo(() => {
    const vals = workouts
      .flatMap((s) => s.exercises)
      .filter((e) => /domin/i.test(e.name))
      .flatMap((e) => e.sets)
      .filter((st) => st.ok && st.weight === 0)
      .map((st) => st.reps);
    return vals.length ? Math.max(...vals) : 0;
  }, [workouts]);

  const bestSprintSecs = useMemo(() => {
    const vals = workouts
      .filter((s) => s.disc === "atletismo")
      .flatMap((s) => s.exercises)
      .filter((e) => /sprint|velocidad/i.test(e.name))
      .flatMap((e) => e.sets)
      .filter((st) => st.ok && st.reps > 0)
      .map((st) => st.reps);
    return vals.length ? Math.min(...vals) : null;
  }, [workouts]);

  if (show1rm) return <OneRM onBack={() => setShow1rm(false)} />;

  if (showPlan) {
    const globalIdx0 = levelFromCount(sessions.length, GLOBAL_LEVEL_THRESHOLDS);
    const startDay = (item) => {
      if (item.rest || !onQuickStart) return;
      const seed = seedNow();
      if (item.discId === "atletismo") {
        const exercises = genAtletismoRoutine(item.focusId, globalIdx0, seed);
        onQuickStart({ discId: "atletismo", discLabel: "Atletismo", discColor: C.purple, discIcon: "🏃", focusLabel: DISTANCES.find((d) => d.id === item.focusId)?.label, lvlIdx: globalIdx0, exercises });
      } else {
        const disc = DISCIPLINES[item.discId];
        const exercises = genRoutine(item.discId, item.focusId, globalIdx0, seed);
        onQuickStart({ discId: item.discId, discLabel: disc.label, discColor: disc.color, discIcon: disc.icon, focusLabel: disc.focuses.find((f) => f.id === item.focusId)?.label || item.focusId, lvlIdx: globalIdx0, exercises });
      }
    };

    if (!weeklyPlan) {
      return (
        <PlanWizard
          onBack={() => setShowPlan(false)}
          onGenerate={(days, goal, duration) => {
            const p = buildWeeklyPlan(days, goal, duration);
            setWeeklyPlan(p);
            store.set("weekly_plan", p);
          }}
        />
      );
    }
    return (
      <div className="screen">
        <button onClick={() => setShowPlan(false)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Progreso</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>📅 Mi plan semanal</h2>
        <p className="muted" style={{ marginTop: 2 }}>{weeklyPlan.days} días/semana · {PLAN_GOALS.find((g) => g.id === weeklyPlan.goal)?.label} · {weeklyPlan.duration} min</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {weeklyPlan.plan.map((d) => (
            <div key={d.day} className="card" style={{ padding: "12px 14px", borderLeft: `4px solid ${d.rest ? C.border : C.cyan}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{d.day.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{d.label}</div>
                </div>
                {!d.rest && (
                  <button onClick={() => startDay(d)} style={{ fontSize: 11, fontWeight: 800, color: C.cyan, border: `1px solid ${C.cyan}55`, padding: "6px 10px", borderRadius: 99 }}>
                    ▶ Iniciar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          className="btn-xl" onClick={() => { setWeeklyPlan(null); store.set("weekly_plan", null); }}
          style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 13 }}
        >
          Rehacer plan
        </button>
      </div>
    );
  }

  if (showAchievements) {
    return (
      <div className="screen">
        <button onClick={() => setShowAchievements(false)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
          ‹ Progreso
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>🏅 Logros</h2>
        <p className="muted" style={{ marginTop: 2 }}>{unlockedCount} de {achievements.length} desbloqueados</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {achievements.map((a) => {
            const hidden = a.secret && !a.unlocked;
            return (
              <div key={a.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", opacity: a.unlocked ? 1 : 0.5 }}>
                <span style={{ fontSize: 30 }}>{hidden ? "❓" : a.unlocked ? a.emoji : "🔒"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{hidden ? "Logro secreto" : a.name}</div>
                  <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{hidden ? "Sigue entrenando para descubrirlo" : a.desc}</div>
                  {a.unlocked && <div style={{ fontSize: 10, color: C.cyan, marginTop: 2 }}>Desbloqueado {fmtDate(a.ts)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (showStats) {
    const s = globalStats;
    const elephants = (s.totalVolume / 5000).toFixed(1);
    const favDisc = DISCIPLINES[s.favDiscId];
    return (
      <div className="screen">
        <button onClick={() => setShowStats(false)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
          ‹ Progreso
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>📊 Mis estadísticas</h2>

        <div className="card" style={{ marginTop: 12, textAlign: "center", padding: "20px 12px" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: C.cyan }}>{s.totalSets}</div>
          <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>series completadas en total</div>
        </div>

        <div className="card" style={{ marginTop: 10, padding: "16px 14px" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{s.totalVolume} kg</div>
          {s.totalVolume > 0 && (
            <div style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>
              Has levantado el peso de {elephants} elefantes 🐘 (1 elefante ≈ 5,000 kg)
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <StatBox label="Días activos" value={s.activeDays} accent={C.orange} />
          <StatBox label="Racha actual" value={streak} accent={C.red} />
          <StatBox label="Mejor racha" value={bestStreak} accent={C.yellow} />
        </div>

        <div className="sec-title">Montaña de progreso (8 semanas)</div>
        <Mountain3DChart sessions={sessions} />

        <div className="card" style={{ marginTop: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 12, color: C.mut }}>Disciplina favorita</p>
          <p style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{favDisc ? `${favDisc.icon} ${favDisc.label}` : "—"}</p>
        </div>
        <div className="card" style={{ marginTop: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 12, color: C.mut }}>Ejercicio más frecuente</p>
          <p style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{s.favExercise || "—"}</p>
        </div>
        <div className="card" style={{ marginTop: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 12, color: C.mut }}>Semana más activa</p>
          <p style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{s.busiestWeek} sesiones en 7 días</p>
        </div>

        {(s.squatProgress || s.benchProgress) && (
          <>
            <div className="sec-title">Progresión</div>
            {s.squatProgress && (
              <div className="card" style={{ padding: "12px 14px", marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: C.mut }}>Sentadilla: {s.squatProgress.first} kg → {s.squatProgress.last} kg</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginTop: 2 }}>
                  Tu sentadilla {s.squatProgress.diff >= 0 ? "creció" : "bajó"} {Math.abs(s.squatProgress.diff)} kg desde que empezaste 📈
                </p>
              </div>
            )}
            {s.benchProgress && (
              <div className="card" style={{ padding: "12px 14px" }}>
                <p style={{ fontSize: 12, color: C.mut }}>Press banca: {s.benchProgress.first} kg → {s.benchProgress.last} kg</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginTop: 2 }}>
                  Tu press banca {s.benchProgress.diff >= 0 ? "creció" : "bajó"} {Math.abs(s.benchProgress.diff)} kg desde que empezaste 📈
                </p>
              </div>
            )}
          </>
        )}

        {s.projectedDays > 0 && (
          <div className="card" style={{ marginTop: 10, padding: "14px", borderColor: `${C.purple}55` }}>
            <p style={{ fontSize: 13, lineHeight: 1.5 }}>
              Si mantuvieras este ritmo, en 1 año habrías entrenado <strong style={{ color: C.purple }}>{s.projectedDays} días</strong> y
              levantado <strong style={{ color: C.purple }}>{s.projectedTonnes} toneladas</strong> 🚀
            </p>
          </div>
        )}
      </div>
    );
  }

  if (recordDetail) {
    const hist = exerciseHistory(sessions, recordDetail);
    const maxVal = Math.max(1, ...hist.rows.map((r) => (r.weight > 0 ? r.weight : r.reps)));
    const trendLabel = { mejorando: "📈 Mejorando", estable: "📊 Estable", bajando: "📉 Bajando" }[hist.trend];
    return (
      <div className="screen">
        <button onClick={() => setRecordDetail(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
          ‹ Progreso
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{recordDetail}</h2>
        <p style={{ fontSize: 13, color: C.cyan, fontWeight: 700, marginTop: 4 }}>{trendLabel}</p>

        <div className="sec-title">Últimas veces</div>
        <div className="card" style={{ padding: "14px 10px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
            {hist.rows.map((r, i) => {
              const val = r.weight > 0 ? r.weight : r.reps;
              const h = Math.max(4, Math.round((val / maxVal) * 80));
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 80 }}>
                  <div style={{ width: "100%", height: h, borderRadius: 4, background: `linear-gradient(180deg, ${C.cyan}, ${C.green})` }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="sec-title">Historial</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...hist.rows].reverse().map((r, i) => (
            <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px" }}>
              <span style={{ fontSize: 12, color: C.mut }}>{fmtDate(r.ts)}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {r.weight > 0 ? `${r.weight} kg × ${r.reps}` : `${r.reps} reps`}
              </span>
              {hist.isRecordRow(r) && (
                <span style={{ fontSize: 10, fontWeight: 800, color: C.yellow }}>🏆 récord</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="screen">
        <Confetti show={achConfetti} />
        {newAchievement && (
          <div className="card unlock-pop" style={{ position: "fixed", top: 70, left: 12, right: 12, zIndex: 100, borderColor: C.yellow, background: "#13131dee", textAlign: "center", padding: "14px" }}>
            <div style={{ fontSize: 30 }}>{newAchievement.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.yellow, marginTop: 4 }}>¡Logro desbloqueado!</div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{newAchievement.name}</div>
          </div>
        )}
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Progreso</h2>
        <p className="muted" style={{ marginTop: 2 }}>Tu nivel global como atleta</p>

        <button
          className="card fade-up"
          onClick={() => setDetail(true)}
          style={{
            width: "100%", marginTop: 20, textAlign: "center", padding: "34px 16px",
            border: `1px solid ${globalLvl.color}55`, position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at 50% 0%, ${globalLvl.color}22, transparent 70%)`,
          }} />
          <div className="pop" style={{ fontSize: 56 }}>{globalLvl.emoji}</div>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8, color: globalLvl.color, letterSpacing: 1 }}>
            {globalLvl.name}
          </div>
          <div style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>
            {sessions.length} {sessions.length === 1 ? "sesión completada" : "sesiones completadas"}
          </div>
          {nextThreshold && (
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 6, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <div style={{
                  height: "100%", width: `${Math.min(100, (sessions.length / nextThreshold) * 100)}%`,
                  background: globalLvl.color, borderRadius: 99, transition: "width .5s ease",
                }} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                {LEVELS[globalIdx + 1].name} a las {nextThreshold} sesiones
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, color: C.dim, marginTop: 14 }}>Toca para ver el detalle ›</div>
        </button>

        <div className="card" style={{ marginTop: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.mut }}>Rango {xpInfo.roman} · {xpInfo.rankName}</span>
            <span style={{ fontSize: 11, color: C.dim }}>{xpInfo.xp} XP</span>
          </div>
          <div style={{ height: 6, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 6 }}>
            <div style={{ height: "100%", width: `${xpInfo.progress * 100}%`, background: `linear-gradient(90deg, ${C.purple}, ${C.cyan})`, borderRadius: 99 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="card" onClick={() => setShowAchievements(true)} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 20 }}>🏅</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Logros ({unlockedCount})</div>
          </button>
          <button className="card" onClick={() => setShowStats(true)} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 20 }}>📊</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Estadísticas</div>
          </button>
          <button className="card" onClick={() => setShowPlan(true)} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 20 }}>📅</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Mi plan</div>
          </button>
        </div>

        <button
          className="btn-xl"
          onClick={() => setShow1rm(true)}
          style={{ marginTop: 10, background: C.cyan, color: "#07070C", fontSize: 15 }}
        >
          💪 CALCULAR MI 1RM
        </button>
        <button
          className="btn-xl"
          onClick={() => exportCSV(sessions)}
          style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}
        >
          📥 Exportar historial
        </button>

        {volumeChart.vols.length > 0 && (
          <>
            <div className="sec-title">Volumen últimas sesiones</div>
            <div className="card" style={{ padding: "14px 10px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                {volumeChart.vols.map((v, i) => {
                  const h = v.vol > 0 ? Math.max(4, Math.round((v.vol / volumeChart.max) * 80)) : 4;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: 80 }}>
                      <div
                        style={{
                          width: "100%", maxWidth: 22, height: h, borderRadius: 4,
                          background: v.vol > 0 ? `linear-gradient(180deg, ${C.cyan}, ${C.green})` : C.dim,
                          transition: "height .4s ease",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {volumeChart.vols.map((v, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: C.dim }}>
                    {new Date(v.ts).toLocaleDateString("es", { day: "2-digit", month: "2-digit" })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="sec-title">🏆 Mis récords</div>
        {records.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: C.dim, fontSize: 13 }}>
            Completa tu primera sesión para empezar a registrar récords.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map((r) => {
              const isNew = now - r.ts <= 14 * 86400000;
              const d = DISCIPLINES[r.disc];
              return (
                <button
                  key={r.name}
                  className="card"
                  onClick={() => setRecordDetail(r.name)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", textAlign: "left" }}
                >
                  <span style={{ fontSize: 20 }}>{d?.icon || "🏅"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: C.mut }}>
                      {r.weight > 0 ? `${r.weight} kg × ${r.reps} reps` : `${r.reps} reps`} · {fmtDate(r.ts)}
                    </div>
                  </div>
                  {isNew && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.orange, background: "rgba(255,122,47,0.15)", padding: "3px 7px", borderRadius: 99, flexShrink: 0 }}>
                      NUEVO 🔥
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="sec-title">Escalera de niveles</div>
        <div className="card" style={{ display: "flex", justifyContent: "space-between", padding: "14px 12px" }}>
          {LEVELS.map((l, i) => (
            <div key={l.name} style={{ textAlign: "center", opacity: i <= globalIdx ? 1 : 0.3 }}>
              <div style={{ fontSize: 18 }}>{l.emoji}</div>
              <div style={{ fontSize: 8.5, color: i <= globalIdx ? l.color : C.dim, fontWeight: 700, marginTop: 3 }}>
                {l.name}
              </div>
            </div>
          ))}
        </div>

        <p className="disclaimer">
          Contenido informativo y motivacional. No sustituye asesoría profesional de entrenamiento ni nutrición.
        </p>
      </div>
    );
  }

  /* Detalle */
  return (
    <div className="screen">
      <button onClick={() => setDetail(false)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
        ‹ Progreso
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>
        {globalLvl.emoji} Nivel {globalLvl.name} · Detalle
      </h2>

      <div className="sec-title">Por disciplina</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(DISCIPLINES).map(([id, d]) => {
          const count = workouts.filter((s) => s.disc === id).length;
          const li = levelFromCount(count, [0, 5, 12, 25, 45, 75]);
          const l = LEVELS[li];
          return (
            <div key={id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span style={{ fontSize: 22 }}>{d.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: C.mut }}>{count} sesiones</div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 800, color: l.color,
                background: `${l.color}18`, padding: "5px 10px", borderRadius: 99, border: `1px solid ${l.color}44`,
              }}>
                {l.emoji} {l.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sec-title">Estadísticas</div>
      <div style={{ display: "flex", gap: 10 }}>
        <StatBox label="Peso promedio" value={avgWeight ? `${avgWeight} kg` : "—"} accent={C.cyan} />
        <StatBox label="Reps promedio" value={avgReps || "—"} accent={C.green} />
        <StatBox label="Sesiones" value={sessions.length} accent={C.orange} />
      </div>

      <div className="sec-title">El listón mundial</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {COMPARATIVES.map((c) => (
          <div key={c.icon} className="card" style={{ display: "flex", gap: 12, alignItems: "center", padding: "13px 14px" }}>
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, lineHeight: 1.45 }}>{c.text}</p>
              {c.stat === "maxWeight" && maxWeight > 0 && (
                <p style={{ fontSize: 12, color: C.cyan, fontWeight: 700, marginTop: 4 }}>
                  Tu mejor registro: {maxWeight} kg 💪
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {(maxWeight > 0 || maxPullups > 0 || bestSprintSecs !== null) && (
        <>
          <div className="sec-title">Comparativas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {maxWeight > 0 && (() => {
              const s = pickScale(WEIGHT_SCALE, maxWeight);
              return (
                <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", padding: "13px 14px" }}>
                  <span style={{ fontSize: 48 }}>{s.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>En tu mejor levantamiento cargas {maxWeight} kg</p>
                    <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{s.label}</p>
                  </div>
                </div>
              );
            })()}
            {maxPullups > 0 && (() => {
              const s = pickScale(PULLUP_SCALE, maxPullups);
              return (
                <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", padding: "13px 14px" }}>
                  <span style={{ fontSize: 48 }}>{s.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>Tu máximo de dominadas: {maxPullups}</p>
                    <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{s.label}</p>
                  </div>
                </div>
              );
            })()}
            {bestSprintSecs !== null && (() => {
              const s = pickScale(SPRINT_SCALE, bestSprintSecs, "max");
              return (
                <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", padding: "13px 14px" }}>
                  <span style={{ fontSize: 48 }}>{s.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>Tu mejor sprint: {bestSprintSecs}s</p>
                    <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{s.label}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      <div className="sec-title">Tus ejercicios</div>
      {exStats.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: C.dim, fontSize: 13 }}>
          Completa entrenamientos para ver tu nivel por ejercicio.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {exStats.map(([name, st]) => {
            const rank = EXRANKS.find((r) => st.count >= r.min);
            return (
              <div key={name} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                  <div style={{ fontSize: 11, color: C.mut }}>
                    {st.count} {st.count === 1 ? "vez" : "veces"}{st.maxW > 0 ? ` · máx ${st.maxW} kg` : ""}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: rank.color, flexShrink: 0,
                  background: `${rank.color}18`, padding: "4px 9px", borderRadius: 99, border: `1px solid ${rank.color}44`,
                }}>
                  {rank.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="disclaimer">
        Marcas mundiales aproximadas, solo como referencia motivacional. Contenido informativo: no sustituye asesoría profesional.
      </p>
    </div>
  );
}

/* ─── COMUNIDAD ─── */
function getISOWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

const MONTHLY_CHALLENGES = [
  "Reto Año Nuevo: 20 sesiones este mes",
  "Reto Fuerza: Bate tu récord de press banca",
  "Reto Velocidad: 10 sesiones de atletismo",
  "Reto Primavera: 15 sesiones este mes",
  "Reto Resistencia: 5 sesiones de cardio o fútbol parque",
  "Reto Verano: Mantén tu racha 20 días",
  "Reto Mitad de Año: 25 sesiones este mes",
  "Reto Fuerza Bruta: Bate tu récord de sentadilla",
  "Reto Constancia: 18 sesiones este mes",
  "Reto Otoño: Prueba las 4 disciplinas",
  "Reto Volumen: 40,000 kg este mes",
  "Reto Cierre de Año: 22 sesiones este mes",
];

function exportStatsCode(name, sessions, streak) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const volume = Math.round(workouts.reduce((a, s) => a + sessionVolume(s), 0));
  const globalIdx = levelFromCount(sessions.length, GLOBAL_LEVEL_THRESHOLDS);
  const payload = {
    code: getFaseCode(name), name, streak, sessions: sessions.length, volume,
    level: LEVELS[globalIdx].name, ts: Date.now(),
  };
  try {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch {
    return "";
  }
}

function Community({ name, sessions, streak, freezes }) {
  const [tab, setTab] = useState("clasificacion");
  const [importValue, setImportValue] = useState("");
  const [exportStr, setExportStr] = useState("");
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState(() => store.get("friends", []));

  const myCode = useMemo(() => getFaseCode(name), [name]);
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const myVolume = Math.round(workouts.reduce((a, s) => a + sessionVolume(s), 0));
  const globalIdx = levelFromCount(sessions.length, GLOBAL_LEVEL_THRESHOLDS);

  const doExport = () => setExportStr(exportStatsCode(name, sessions, streak));
  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* sin portapapeles */ }
  };
  const doImport = () => {
    try {
      const data = JSON.parse(decodeURIComponent(atob(importValue.trim())));
      if (!data.code) throw new Error("formato inválido");
      const next = [...friends.filter((f) => f.code !== data.code), data];
      setFriends(next);
      store.set("friends", next);
      setImportValue("");
    } catch {
      alert("Código inválido. Pídele a tu amigo que exporte de nuevo.");
    }
  };

  const board = [
    { code: myCode, name: `${name} (tú)`, streak, sessions: sessions.length, volume: myVolume, level: LEVELS[globalIdx].name, isMe: true },
    ...friends,
  ].sort((a, b) => b.streak - a.streak);

  /* Retos globales simulados por semana/mes */
  const now = new Date();
  const week = getISOWeek(now);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0, 0, 0, 0);
  const weekSessions = sessions.filter((s) => s.ts >= weekStart.getTime());
  const weekVolume = Math.round(weekSessions.filter((s) => s.kind === "entreno").reduce((a, s) => a + sessionVolume(s), 0));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthSessions = sessions.filter((s) => s.ts >= monthStart);
  const monthlyText = MONTHLY_CHALLENGES[now.getMonth()];
  const monthlyTarget = parseInt(monthlyText.match(/\d[\d,]*/)?.[0]?.replace(/,/g, "") || "20", 10);
  const monthlyIsVolume = /kg/i.test(monthlyText);
  const monthlyIsDiscip = /prueba las 4/i.test(monthlyText);
  const monthlyProgress = monthlyIsDiscip
    ? new Set(monthSessions.filter((s) => s.kind === "entreno").map((s) => (s.disc?.startsWith("futbol") ? "futbol" : s.disc))).size
    : monthlyIsVolume
    ? Math.round(monthSessions.filter((s) => s.kind === "entreno").reduce((a, s) => a + sessionVolume(s), 0))
    : monthSessions.length;
  const monthlyMax = monthlyIsDiscip ? 4 : monthlyTarget;

  const challenges = [
    { icon: "🏋️", label: `Esta semana: ${5000} kg de volumen`, current: weekVolume, target: 5000 },
    { icon: "📅", label: "Esta semana: 5 sesiones", current: weekSessions.length, target: 5 },
    { icon: "🌟", label: monthlyText, current: Math.min(monthlyProgress, monthlyMax), target: monthlyMax },
  ];

  /* Feed de actividad personal */
  const feed = useMemo(() => {
    return sessions.filter((s) => s.kind === "entreno").reverse().slice(0, 15).map((s) => {
      const priorSessions = sessions.filter((x) => x.ts <= s.ts);
      const streakAtTime = calcStreak(priorSessions, freezes);
      const hero = heroForStreak(streakAtTime);
      const okSets = s.exercises.flatMap((e) => e.sets).filter((st) => st.ok).length;
      const durMin = s.durationMin || Math.round(okSets * 2.5);
      const discLabel = DISCIPLINES[s.disc]?.label || s.focusLabel || "Entreno";
      const lvlName = LEVELS[s.levelIdx]?.name || "";
      return {
        id: s.id, hero, text: `${name} completó ${okSets} series de ${discLabel} nivel ${lvlName} en ${durMin} minutos 💪`,
        ts: s.ts,
      };
    });
  }, [sessions, freezes, name]);

  const shareFeed = async (text) => {
    try { await navigator.clipboard.writeText(`${text} — F.A.S.E. f-a-s-e.vercel.app`); } catch { /* sin portapapeles */ }
  };

  return (
    <div className="screen">
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>👥 Comunidad</h2>
      <p className="muted" style={{ marginTop: 2 }}>Comparte tu código F.A.S.E. y compara con amigos</p>

      <div className="chip-wrap" style={{ marginTop: 12 }}>
        {[{ id: "clasificacion", label: "Clasificación" }, { id: "retos", label: "Retos" }, { id: "feed", label: "Feed" }].map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? "on" : ""}`} style={tab === t.id ? { background: C.cyan } : {}} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "clasificacion" && (
        <>
          <div className="card" style={{ marginTop: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: 12, color: C.mut }}>Tu código F.A.S.E.</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: C.cyan, marginTop: 2 }}>{myCode}</p>
          </div>

          <div className="sec-title">Importar amigo</div>
          <textarea
            className="input" placeholder="Pega aquí el código exportado de tu amigo" value={importValue}
            onChange={(e) => setImportValue(e.target.value)} rows={2} style={{ resize: "none", fontSize: 12 }}
          />
          <button className="btn-xl" onClick={doImport} disabled={!importValue.trim()} style={{ marginTop: 8, background: C.cyan, color: "#07070C", fontSize: 13 }}>
            Importar
          </button>

          <div className="sec-title">Exportar mis stats</div>
          <button className="btn-xl" onClick={doExport} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
            Generar código para compartir
          </button>
          {exportStr && (
            <div className="card" style={{ marginTop: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, color: C.mut, wordBreak: "break-all" }}>{exportStr}</p>
              <button onClick={copyExport} style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginTop: 6 }}>
                {copied ? "¡Copiado!" : "📋 Copiar"}
              </button>
            </div>
          )}

          <div className="sec-title">Tabla de clasificación</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {board.map((f, i) => (
              <div key={f.code} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                <span style={{ fontSize: 16 }}>{i === 0 ? "👑" : `#${i + 1}`}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: f.isMe ? 900 : 700, color: f.isMe ? C.cyan : C.text }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: C.mut }}>{f.sessions} sesiones · {f.volume} kg · {f.level}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>🔥{f.streak}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "retos" && (
        <>
          <p className="muted" style={{ marginTop: 10 }}>Semana ISO #{week} · {now.toLocaleDateString("es", { month: "long" })}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {challenges.map((c) => {
              const pct = Math.min(1, c.current / c.target);
              const done = c.current >= c.target;
              return (
                <div key={c.label} className="card" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.icon} {c.label}</span>
                    {done && <span style={{ fontSize: 11, color: C.green, fontWeight: 800 }}>✅</span>}
                  </div>
                  <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 8 }}>
                    <div style={{ height: "100%", width: `${pct * 100}%`, background: done ? C.green : C.cyan, borderRadius: 99, transition: "width .5s ease" }} />
                  </div>
                  <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{c.current} / {c.target}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {feed.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: C.dim, fontSize: 13 }}>
              Completa sesiones para ver tu feed de actividad.
            </div>
          ) : feed.map((post) => (
            <div key={post.id} className="card" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 26 }}>{post.hero.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, lineHeight: 1.4 }}>{post.text}</p>
                  <p style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{fmtDate(post.ts)}</p>
                </div>
              </div>
              <button
                onClick={() => shareFeed(post.text)}
                style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginTop: 8 }}
              >
                📤 Compartir este logro
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CUERPO (Acondicionamiento) ─── */
const PAIN_FACES = [
  { n: 1, emoji: "😊", label: "Genial" },
  { n: 2, emoji: "😐", label: "Normal" },
  { n: 3, emoji: "😕", label: "Regular" },
  { n: 4, emoji: "😣", label: "Dolorido" },
  { n: 5, emoji: "😫", label: "Muy mal" },
];
const GENTLE_SECTIONS = ["movilidad", "flex"];

function Body({ onComplete }) {
  const [openId, setOpenId] = useState(null);
  const [justDone, setJustDone] = useState(false);
  const [pain, setPain] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [blockedId, setBlockedId] = useState(null);
  const section = BODY_SECTIONS.find((b) => b.id === openId);

  const tryOpen = (id) => {
    if (pain === null) {
      setPendingId(id);
    } else if (pain >= 4 && !GENTLE_SECTIONS.includes(id)) {
      setBlockedId(id);
    } else {
      setOpenId(id);
    }
  };

  const selectPain = (n) => {
    setPain(n);
    if (n >= 4 && !GENTLE_SECTIONS.includes(pendingId)) {
      setBlockedId(pendingId);
    } else {
      setOpenId(pendingId);
    }
    setPendingId(null);
  };

  /* Pantalla: ¿cómo te sientes hoy? */
  if (pendingId) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 44 }}>🩺</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>¿Cómo te sientes hoy?</h2>
        <p className="muted" style={{ marginTop: 6 }}>Sé honesto: tu cuerpo lo agradece</p>
        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "center" }}>
          {PAIN_FACES.map((f) => (
            <button
              key={f.n}
              onClick={() => selectPain(f.n)}
              className="card"
              style={{ flex: 1, padding: "14px 4px", maxWidth: 74 }}
            >
              <div style={{ fontSize: 28 }}>{f.emoji}</div>
              <div style={{ fontSize: 10, color: C.mut, marginTop: 6, fontWeight: 700 }}>{f.label}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setPendingId(null)} style={{ color: C.dim, fontSize: 13, marginTop: 24, fontWeight: 600 }}>
          ‹ Volver
        </button>
      </div>
    );
  }

  /* Pantalla: rutina bloqueada por dolor alto */
  if (blockedId) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 50 }}>🛌</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>Hoy mejor descansa activamente</h2>
        <p style={{ color: C.mut, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          Solo movilidad suave. Tu cuerpo necesita recuperarse para volver más fuerte.
        </p>
        <button
          className="btn-xl"
          onClick={() => { setBlockedId(null); setOpenId("movilidad"); }}
          style={{ marginTop: 24, background: C.cyan, color: "#07070C" }}
        >
          🔄 IR A MOVILIDAD SUAVE
        </button>
        <button onClick={() => setBlockedId(null)} style={{ color: C.dim, fontSize: 13, marginTop: 16, fontWeight: 600 }}>
          ‹ Volver
        </button>
        <p className="disclaimer">
          Contenido informativo. Para lesiones graves consulta un especialista.
        </p>
      </div>
    );
  }

  if (section) {
    return (
      <div className="screen" key={section.id}>
        <button onClick={() => { setOpenId(null); setJustDone(false); }} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
          ‹ Cuerpo
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 32 }}>{section.icon}</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: section.color }}>{section.name}</h2>
            <p style={{ fontSize: 12, color: C.mut }}>{section.desc} · ~{section.mins} min</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {section.items.map((it, i) => (
            <div key={it.n} className="card fade-up" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: section.color, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{it.n}</div>
              <span style={{ fontSize: 12, color: C.mut, fontWeight: 700, flexShrink: 0 }}>{it.d}</span>
            </div>
          ))}
        </div>

        {justDone ? (
          <div className="card pop" style={{ marginTop: 16, textAlign: "center", borderColor: `${C.green}66`, background: "rgba(34,255,136,0.06)" }}>
            <div style={{ fontSize: 30 }}>✅</div>
            <div style={{ fontWeight: 800, color: C.green, marginTop: 4 }}>¡Sesión registrada!</div>
            <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>Cuenta para tu racha 🔥</div>
          </div>
        ) : (
          <button
            className="btn-xl"
            onClick={() => { onComplete(section.id); setJustDone(true); }}
            style={{ marginTop: 16, background: section.color, color: "#07070C" }}
          >
            ✓ COMPLETAR SESIÓN
          </button>
        )}

        <p className="disclaimer">
          Contenido informativo. Para lesiones graves consulta un especialista.
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>Cuerpo</h2>
      <p className="muted" style={{ marginTop: 2 }}>
        Movilidad, prevención y rehabilitación · Cada sesión suma a tu racha 🔥
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {BODY_SECTIONS.map((b) => (
          <button
            key={b.id}
            className="card fade-up"
            onClick={() => tryOpen(b.id)}
            style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", borderLeft: `4px solid ${b.color}` }}
          >
            <span style={{ fontSize: 26 }}>{b.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{b.name}</div>
              <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{b.desc} · ~{b.mins} min</div>
            </div>
            <span style={{ color: b.color, fontSize: 20 }}>›</span>
          </button>
        ))}
      </div>
      <p className="disclaimer">
        Contenido informativo. Para lesiones graves consulta un especialista.
      </p>
    </div>
  );
}

/* ═══════════════════ APP RAÍZ ═══════════════════ */

const TABS = [
  { id: "inicio", label: "Inicio", icon: "🏠" },
  { id: "entrenar", label: "Entrenar", icon: "💪" },
  { id: "progreso", label: "Progreso", icon: "📈" },
  { id: "cuerpo", label: "Cuerpo", icon: "🧘" },
  { id: "comunidad", label: "Comunidad", icon: "👥" },
];

/* Función (no objeto estático) para que refleje el tema activo al vuelo */
function getTabAccent(tabId) {
  return { inicio: C.cyan, entrenar: C.green, progreso: C.purple, cuerpo: "#60A5FA", comunidad: C.orange }[tabId];
}

export default function App() {
  const [name, setName] = useState(() => store.get("name", ""));
  const [mode, setMode] = useState(() => store.get("mode", "guiado"));
  const [sessions, setSessions] = useState(() => store.get("sessions", []));
  const [heroes, setHeroes] = useState(() => store.get("heroes", []));
  const [tab, setTab] = useState("inicio");
  const [live, setLive] = useState(null);
  const [accent, setAccent] = useState(() => getTabAccent("inicio"));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [freezes, setFreezes] = useState(() => store.get("freezes", []));
  const [weeklyGoal, setWeeklyGoal] = useState(() => store.get("weekly_goal", 4));
  const [editingGoal, setEditingGoal] = useState(false);
  const [highContrast, setHighContrast] = useState(() => store.get("high_contrast", false));
  const [noEquipment, setNoEquipment] = useState(() => store.get("no_equipment", false));
  const [toast, setToast] = useState(null);
  const [storageFull, setStorageFull] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => store.get("voice", false));

  useEffect(() => {
    store.onError = () => setStorageFull(true);
    return () => { store.onError = null; };
  }, []);

  const cleanOldSessions = () => {
    const cutoff = Date.now() - 180 * 86400000;
    const next = sessions.filter((s) => s.ts >= cutoff);
    setSessions(next);
    try {
      store.set("sessions", next);
      setStorageFull(false);
    } catch { /* sigue lleno */ }
  };
  const [challenge, setChallenge] = useState(() => store.get("challenge", null));
  const [themeId, setThemeId] = useState(() => {
    const id = store.get("theme", "sombra");
    applyTheme(THEMES.find((t) => t.id === id) || THEMES[0]);
    return id;
  });
  const [showTheme, setShowTheme] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);

  const saveChallenge = (c) => {
    setChallenge(c);
    store.set("challenge", c);
  };

  const selectTheme = (id) => {
    const t = THEMES.find((th) => th.id === id);
    if (!t) return;
    applyTheme(t);
    setThemeId(id);
    store.set("theme", id);
  };

  useEffect(() => {
    document.body.classList.toggle("hc", highContrast);
  }, [highContrast]);

  const toggleContrast = () => {
    setHighContrast((v) => {
      const next = !v;
      store.set("high_contrast", next);
      return next;
    });
  };

  const toggleEquipment = () => {
    setNoEquipment((v) => {
      const next = !v;
      store.set("no_equipment", next);
      if (next) {
        setToast("Modo sin equipo activado. Las rutinas se adaptarán.");
        setTimeout(() => setToast(null), 2500);
      }
      return next;
    });
  };

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const changeTab = (t) => {
    setTab(t);
    setAccent(getTabAccent(t));
  };

  const streak = useMemo(() => calcStreak(sessions, freezes), [sessions, freezes]);

  /* Recordatorio diario: mejor esfuerzo del lado del cliente (revisa mientras la
     app está abierta; no es un push real en segundo plano sin servidor). */
  useEffect(() => {
    const hourId = store.get("notif_hour", null);
    if (!hourId || !window.Notification || Notification.permission !== "granted") return undefined;
    const hourMap = { morning: 7, afternoon: 17, night: 20 };
    const targetHour = hourMap[hourId];
    const check = () => {
      const now = new Date();
      const today = dayKey(now.getTime());
      const lastShown = store.get("notif_last_shown", null);
      if (now.getHours() === targetHour && lastShown !== today) {
        const msg = streak === 0
          ? `💪 ${name}, hoy es un buen día para empezar`
          : streak < 7
          ? `🔥 ${name}, llevas ${streak} días. No rompas la racha`
          : `⚡ ${name}, ${streak} días seguidos. Eres una máquina`;
        try {
          new Notification("F.A.S.E.", { body: msg, icon: "/favicon.svg" });
        } catch {
          /* silencioso */
        }
        store.set("notif_last_shown", today);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [streak, name]);

  /* Streak freeze: disponible si la cadena terminó anteayer y no se usó este mes */
  const freezeInfo = useMemo(() => computeFreezeInfo(sessions, freezes), [sessions, freezes]);

  const useFreeze = () => {
    const now = new Date();
    const used = store.get("freezes_used", null);
    if (used && used.month === now.getMonth() && used.year === now.getFullYear() && used.count >= 1) return;
    const yestK = dayKey(Date.now() - 86400000);
    const next = [...freezes, yestK];
    setFreezes(next);
    store.set("freezes", next);
    store.set("freezes_used", { month: now.getMonth(), year: now.getFullYear(), count: 1 });
  };

  /* Los héroes se desbloquean y se quedan aunque la racha baje */
  const unlockedHeroes = useMemo(() => {
    const earned = HEROES.filter((h) => streak >= h.days).map((h) => h.id);
    return [...new Set([...heroes, ...earned])];
  }, [heroes, streak]);

  const saveName = (n, m) => {
    setName(n);
    store.set("name", n);
    setMode(m);
    store.set("mode", m);
  };

  const saveSession = (record) => {
    const next = [...sessions, record];
    setSessions(next);
    store.set("sessions", next);
    const s = calcStreak(next, freezes);
    const earned = HEROES.filter((h) => s >= h.days).map((h) => h.id);
    const merged = [...new Set([...heroes, ...earned])];
    if (merged.length !== heroes.length) {
      setHeroes(merged);
      store.set("heroes", merged);
    }
  };

  const completeBody = (sectionId) => {
    saveSession({ id: Date.now(), ts: Date.now(), kind: "cuerpo", section: sectionId });
  };

  const deleteSession = (id) => {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    store.set("sessions", next);
  };

  const touchStartX = useRef(null);

  if (!name) return <Welcome onDone={saveName} />;

  if (showTheme) {
    return (
      <ThemeScreen
        sessions={sessions} freezes={freezes} activeThemeId={themeId}
        onSelect={selectTheme} onBack={() => setShowTheme(false)}
      />
    );
  }

  if (showProfileCard) {
    return (
      <ProfileCard
        name={name} sessions={sessions} streak={streak} freezes={freezes}
        onBack={() => setShowProfileCard(false)}
      />
    );
  }

  if (live) {
    return (
      <ActiveSession
        plan={live}
        streak={streak}
        sessions={sessions}
        onSave={saveSession}
        onClose={() => { setLive(null); setTab("inicio"); }}
        onViewStats={() => { setLive(null); setTab("progreso"); }}
        voiceOn={voiceOn}
        onToggleVoice={() => setVoiceOn((v) => { const next = !v; store.set("voice", next); return next; })}
      />
    );
  }

  const weekCount = sessions.filter((s) => s.ts >= startOfWeek()).length;

  return (
    <>
      {storageFull && (
        <div style={{
          position: "sticky", top: 0, zIndex: 60, textAlign: "center", padding: "10px 14px",
          background: "rgba(255,59,92,0.15)", borderBottom: "1px solid rgba(255,59,92,0.4)",
          color: C.red, fontSize: 12, fontWeight: 700,
        }}>
          <p>Almacenamiento lleno. Exporta tu historial y limpia datos antiguos.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
            <button
              onClick={() => exportCSV(sessions)} aria-label="Exportar historial a CSV"
              style={{ fontSize: 11, fontWeight: 800, color: C.text, background: C.surface, padding: "6px 10px", borderRadius: 8 }}
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={cleanOldSessions} aria-label="Eliminar sesiones de hace más de 6 meses"
              style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: C.red, padding: "6px 10px", borderRadius: 8 }}
            >
              🗑 Limpiar +6 meses
            </button>
          </div>
        </div>
      )}
      {!online && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50, textAlign: "center", padding: "6px 10px",
          background: "rgba(255,122,47,0.15)", borderBottom: "1px solid rgba(255,122,47,0.4)",
          color: C.orange, fontSize: 12, fontWeight: 700,
        }}>
          📵 Sin conexión — tus datos se guardan localmente
        </div>
      )}
      {toast && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50, textAlign: "center", padding: "6px 10px",
          background: "rgba(0,229,255,0.15)", borderBottom: "1px solid rgba(0,229,255,0.4)",
          color: C.cyan, fontSize: 12, fontWeight: 700,
        }}>
          {toast}
        </div>
      )}
      <header className="header" style={{ borderBottomColor: `${accent}55`, transition: "border-color .3s ease" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: accent, transition: "color .3s ease" }}>
            F.A.S.E.
          </div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            Hola, {name}
            {noEquipment && (
              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: C.cyan, background: "rgba(0,229,255,0.12)", padding: "2px 6px", borderRadius: 99 }}>
                Sin equipo
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <WeekRing done={weekCount} goal={weeklyGoal} accent={accent} />
            <button
              onClick={() => setEditingGoal((v) => !v)}
              style={{ fontSize: 12, color: C.dim, padding: 4 }}
              aria-label="Editar meta semanal"
            >
              ✏️
            </button>
            {editingGoal && (
              <div
                className="card fade-up"
                style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 50,
                  display: "flex", gap: 4, padding: 8,
                }}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setWeeklyGoal(n); store.set("weekly_goal", n); setEditingGoal(false); }}
                    style={{
                      width: 28, height: 28, borderRadius: 8, fontSize: 12, fontWeight: 800,
                      background: n === weeklyGoal ? C.cyan : C.surface,
                      color: n === weeklyGoal ? "#07070C" : C.text,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, background: "rgba(255,122,47,0.12)",
            border: "1px solid rgba(255,122,47,0.35)", borderRadius: 99, padding: "6px 12px",
          }}>
            <span className="flame" style={{ fontSize: 15 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.orange }}>{streak}</span>
          </div>
          <button
            onClick={toggleEquipment}
            aria-label="Alternar modo sin equipo"
            style={{ fontSize: 16, padding: 4 }}
          >
            {noEquipment ? "🎒" : "🏋️"}
          </button>
          <button
            onClick={toggleContrast}
            aria-label="Alternar modo alto contraste"
            style={{ fontSize: 16, padding: 4 }}
          >
            {highContrast ? "🌙" : "☀️"}
          </button>
          <button onClick={() => setShowTheme(true)} aria-label="Mi estilo" style={{ fontSize: 16, padding: 4 }}>🎨</button>
          <button onClick={() => setShowProfileCard(true)} aria-label="Mi perfil" style={{ fontSize: 16, padding: 4 }}>
            {heroForStreak(streak).emoji}
          </button>
        </div>
      </header>

      <div
        key={tab}
        className="tab-slide"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) < 50) return;
          const idx = TABS.findIndex((t) => t.id === tab);
          const nextIdx = dx < 0 ? idx + 1 : idx - 1;
          if (nextIdx >= 0 && nextIdx < TABS.length) changeTab(TABS[nextIdx].id);
        }}
      >
        {tab === "inicio" && (
          <Home
            name={name} sessions={sessions} streak={streak} unlockedHeroes={unlockedHeroes}
            onTrain={() => changeTab("entrenar")} mode={mode}
            onRepeat={(session) => { const plan = planFromSession(session); if (plan) setLive(plan); }}
            broken={freezeInfo.broken} canFreeze={freezeInfo.canFreeze} onFreeze={useFreeze}
            challenge={challenge} onDeleteSession={deleteSession} freezes={freezes}
          />
        )}
        {tab === "entrenar" && (
          <Train
            onStart={setLive} onAccent={(c) => setAccent(c || getTabAccent("entrenar"))} totalSessions={sessions.length}
            noEquipment={noEquipment} onSaveSpecial={saveSession}
            sessions={sessions} streak={streak} challenge={challenge} onSaveChallenge={saveChallenge}
          />
        )}
        {tab === "progreso" && <Progress sessions={sessions} freezes={freezes} streak={streak} onQuickStart={setLive} />}
        {tab === "cuerpo" && <Body onComplete={completeBody} />}
        {tab === "comunidad" && <Community name={name} sessions={sessions} streak={streak} freezes={freezes} />}
      </div>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => changeTab(t.id)}>
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
