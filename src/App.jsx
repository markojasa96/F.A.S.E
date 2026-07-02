import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════
   F.A.S.E. v2 — Formación Atlética y Sistemas de Entrenamiento
   ══════════════════════════════════════════════════ */

const C = {
  bg: "#07070C",
  surface: "#101018",
  card: "#181822",
  cardHover: "#1F1F2C",
  border: "#26263A",
  cyan: "#00E5FF",
  green: "#22FF88",
  orange: "#FF7A2F",
  red: "#FF3B5C",
  yellow: "#FFD600",
  purple: "#A855F7",
  text: "#F2F2F8",
  mut: "#8A8AAD",
  dim: "#4E4E70",
};

/* ─── STORAGE (seguro: funciona en Vercel, no rompe en previews) ─── */
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
    } catch {}
  },
};

/* ─── DATOS DE ENTRENAMIENTOS ─── */
const WORKOUTS = {
  calistenia: {
    label: "Calistenia",
    icon: "🤸",
    color: C.green,
    desc: "Parque o casa · Peso corporal",
    levels: {
      principiante: [
        { name: "Flexiones (rodillas si es necesario)", sets: 3, reps: "8-12", rest: 60, type: "reps" },
        { name: "Sentadillas con peso corporal", sets: 3, reps: "15", rest: 60, type: "reps" },
        { name: "Plancha", sets: 3, reps: "20-30s", rest: 45, type: "reps" },
        { name: "Remo invertido en barra baja", sets: 3, reps: "6-10", rest: 90, type: "reps" },
        { name: "Zancadas alternadas", sets: 3, reps: "10 c/pierna", rest: 60, type: "reps" },
      ],
      intermedio: [
        { name: "Flexiones", sets: 4, reps: "15-20", rest: 60, type: "reps" },
        { name: "Dominadas", sets: 4, reps: "5-8", rest: 120, type: "reps" },
        { name: "Fondos en paralelas", sets: 4, reps: "8-12", rest: 90, type: "reps" },
        { name: "Sentadilla búlgara", sets: 3, reps: "10 c/pierna", rest: 90, type: "reps" },
        { name: "Plancha con toque de hombro", sets: 3, reps: "30-45s", rest: 60, type: "reps" },
        { name: "Elevaciones de piernas colgado", sets: 3, reps: "8-12", rest: 60, type: "reps" },
      ],
      avanzado: [
        { name: "Flexiones arqueras", sets: 4, reps: "8 c/lado", rest: 90, type: "reps" },
        { name: "Dominadas lastradas o explosivas", sets: 5, reps: "5-6", rest: 150, type: "peso" },
        { name: "Fondos lastrados", sets: 4, reps: "8-10", rest: 120, type: "peso" },
        { name: "Pistol squats", sets: 4, reps: "5 c/pierna", rest: 120, type: "reps" },
        { name: "Muscle-up (progresión)", sets: 4, reps: "3-5", rest: 180, type: "reps" },
        { name: "L-sit", sets: 3, reps: "15-20s", rest: 90, type: "reps" },
      ],
    },
  },
  gimnasio: {
    label: "Gimnasio",
    icon: "🏋️",
    color: C.cyan,
    desc: "Fuerza · Barras y mancuernas",
    levels: {
      principiante: [
        { name: "Sentadilla con barra (o goblet)", sets: 3, reps: "8-10", rest: 120, type: "peso" },
        { name: "Press banca (o mancuernas)", sets: 3, reps: "8-10", rest: 120, type: "peso" },
        { name: "Jalón al pecho", sets: 3, reps: "10-12", rest: 90, type: "peso" },
        { name: "Press militar con mancuernas", sets: 3, reps: "10", rest: 90, type: "peso" },
        { name: "Curl de bíceps", sets: 2, reps: "12", rest: 60, type: "peso" },
        { name: "Extensión de tríceps en polea", sets: 2, reps: "12", rest: 60, type: "peso" },
      ],
      intermedio: [
        { name: "Sentadilla con barra", sets: 4, reps: "6-8", rest: 150, type: "peso" },
        { name: "Press banca", sets: 4, reps: "6-8", rest: 150, type: "peso" },
        { name: "Peso muerto rumano", sets: 3, reps: "8", rest: 150, type: "peso" },
        { name: "Remo con barra", sets: 4, reps: "8-10", rest: 120, type: "peso" },
        { name: "Press militar de pie", sets: 3, reps: "8", rest: 120, type: "peso" },
        { name: "Hip thrust", sets: 3, reps: "10", rest: 90, type: "peso" },
      ],
      avanzado: [
        { name: "Sentadilla con barra (pesada)", sets: 5, reps: "3-5", rest: 210, type: "peso" },
        { name: "Press banca (pesado)", sets: 5, reps: "3-5", rest: 210, type: "peso" },
        { name: "Peso muerto convencional", sets: 4, reps: "3-5", rest: 240, type: "peso" },
        { name: "Remo Pendlay", sets: 4, reps: "6", rest: 150, type: "peso" },
        { name: "Push press", sets: 4, reps: "5", rest: 150, type: "peso" },
        { name: "Zancada con barra", sets: 3, reps: "8 c/pierna", rest: 120, type: "peso" },
      ],
    },
  },
  futbolGym: {
    label: "Fútbol — Gimnasio",
    icon: "⚽",
    color: C.orange,
    desc: "1 hora · Fuerza aplicada al campo",
    levels: {
      principiante: [
        { name: "Sentadilla goblet", sets: 3, reps: "10", rest: 90, type: "peso" },
        { name: "Zancada caminando con mancuernas", sets: 3, reps: "8 c/pierna", rest: 90, type: "peso" },
        { name: "Curl femoral (o nórdico asistido)", sets: 3, reps: "10", rest: 90, type: "peso" },
        { name: "Elevación de talones (pantorrilla)", sets: 3, reps: "15", rest: 60, type: "peso" },
        { name: "Plancha lateral", sets: 3, reps: "20s c/lado", rest: 45, type: "reps" },
      ],
      intermedio: [
        { name: "Sentadilla con salto (con barra ligera)", sets: 4, reps: "6", rest: 120, type: "peso" },
        { name: "Hip thrust", sets: 4, reps: "8", rest: 120, type: "peso" },
        { name: "Curl nórdico", sets: 3, reps: "6", rest: 120, type: "reps" },
        { name: "Peso muerto a una pierna", sets: 3, reps: "8 c/pierna", rest: 90, type: "peso" },
        { name: "Press Pallof (anti-rotación)", sets: 3, reps: "10 c/lado", rest: 60, type: "peso" },
        { name: "Salto al cajón", sets: 4, reps: "5", rest: 90, type: "reps" },
      ],
      avanzado: [
        { name: "Sentadilla pesada (velocidad en subida)", sets: 5, reps: "4", rest: 180, type: "peso" },
        { name: "Trap bar jump (o salto cargado)", sets: 4, reps: "4", rest: 150, type: "peso" },
        { name: "Hip thrust pesado", sets: 4, reps: "6", rest: 150, type: "peso" },
        { name: "Curl nórdico completo", sets: 4, reps: "6", rest: 120, type: "reps" },
        { name: "Aductores en polea o copenhagen", sets: 3, reps: "10 c/lado", rest: 90, type: "reps" },
        { name: "Pliometría lateral (skater jumps)", sets: 4, reps: "6 c/lado", rest: 90, type: "reps" },
      ],
    },
  },
  futbolParque: {
    label: "Fútbol — Parque",
    icon: "🏃",
    color: C.yellow,
    desc: "1 hora · Velocidad, técnica y calistenia",
    levels: {
      principiante: [
        { name: "Trote suave + movilidad", sets: 1, reps: "10 min", rest: 0, type: "reps" },
        { name: "Sprint al 70% — 20m", sets: 6, reps: "1", rest: 60, type: "reps" },
        { name: "Control de balón contra pared", sets: 4, reps: "2 min", rest: 45, type: "reps" },
        { name: "Skipping alto", sets: 3, reps: "20m", rest: 45, type: "reps" },
        { name: "Flexiones + sentadillas (circuito)", sets: 3, reps: "10+15", rest: 60, type: "reps" },
      ],
      intermedio: [
        { name: "Sprint máximo — 30m", sets: 6, reps: "1", rest: 90, type: "reps" },
        { name: "Cambios de dirección 5-10-5", sets: 5, reps: "1", rest: 75, type: "reps" },
        { name: "Pase a un toque contra pared", sets: 4, reps: "3 min", rest: 45, type: "reps" },
        { name: "Dominadas en barras del parque", sets: 3, reps: "6-10", rest: 90, type: "reps" },
        { name: "Saltos de valla imaginaria laterales", sets: 4, reps: "8", rest: 60, type: "reps" },
        { name: "Conducción con cambios de ritmo", sets: 4, reps: "30m", rest: 60, type: "reps" },
      ],
      avanzado: [
        { name: "Sprint máximo — 40m (cronometrado)", sets: 6, reps: "1", rest: 120, type: "reps" },
        { name: "Repeated Sprint Ability: 7x30m", sets: 1, reps: "7 sprints/20s", rest: 240, type: "reps" },
        { name: "Tiro a portería tras conducción", sets: 5, reps: "4 tiros", rest: 90, type: "reps" },
        { name: "Muscle-up o dominadas explosivas", sets: 4, reps: "4-6", rest: 120, type: "reps" },
        { name: "Pliometría: triple salto horizontal", sets: 4, reps: "3", rest: 90, type: "reps" },
        { name: "Juego de pies en escalera + sprint", sets: 5, reps: "1", rest: 75, type: "reps" },
      ],
    },
  },
};

/* ─── ACONDICIONAMIENTO ─── */
const COND = {
  movilidad: {
    label: "Movilidad diaria",
    icon: "🧘",
    color: C.purple,
    items: [
      { name: "Círculos de tobillo", detail: "10 por dirección, cada pie. Despacio y controlado." },
      { name: "Rotaciones de cadera 90/90", detail: "8 por lado. Mantén la espalda recta." },
      { name: "Gato-camello", detail: "10 repeticiones lentas. Sincroniza con respiración." },
      { name: "Sentadilla profunda sostenida", detail: "30-60 segundos. Talones al piso." },
      { name: "Apertura torácica contra pared", detail: "8 por lado. Brazo a 90 grados." },
    ],
  },
  tobillos: {
    label: "Tobillos — Rehabilitación",
    icon: "🦶",
    color: C.orange,
    items: [
      { name: "Fase 1 (dolor en reposo): bombeos de tobillo", detail: "3x15, sin dolor. Activa circulación sentado." },
      { name: "Fase 1: letras del alfabeto con el pie", detail: "2 sets completos. Control fino, parar ante dolor agudo." },
      { name: "Fase 2 (sin dolor en reposo): equilibrio a una pierna", detail: "4x30s. Progresa a ojos cerrados." },
      { name: "Fase 2: elevación de talones excéntrica", detail: "3x12. Sube con dos piernas, baja con una en 3 segundos." },
      { name: "Fase 3 (estable): saltos suaves a una pierna", detail: "3x8. Solo cuando no haya dolor en fases anteriores." },
    ],
  },
  prevencion: {
    label: "Prevención de lesiones",
    icon: "🛡️",
    color: C.cyan,
    items: [
      { name: "Curl nórdico (isquios)", detail: "Reduce lesión de isquiotibiales. 2x6 dos veces por semana." },
      { name: "Copenhagen plank (aductores)", detail: "Clave para futbolistas. 2x20s por lado." },
      { name: "Equilibrio monopodal con perturbación", detail: "Lanza un balón contra pared parado en una pierna." },
      { name: "Aterrizajes controlados", detail: "Salta y aterriza suave, rodillas alineadas. 3x5." },
    ],
  },
};

/* ─── TIPS DE NUTRICIÓN ─── */
const NUTRI = {
  musculo: {
    label: "Ganar músculo",
    icon: "💪",
    color: C.cyan,
    tips: [
      "Come en ligero superávit: 300-500 kcal sobre tu mantenimiento.",
      "Proteína: 1.6-2.2g por kg de peso corporal al día (huevo, pollo, atún, frijoles, leche).",
      "Desayuno con proteína siempre: huevos con avena es de lo más eficiente y barato.",
      "Come carbohidratos alrededor del entrenamiento: arroz, papa, tortilla, fruta.",
      "Duerme 7-9 horas: el músculo crece durmiendo, no entrenando.",
    ],
  },
  grasa: {
    label: "Perder grasa",
    icon: "🔥",
    color: C.orange,
    tips: [
      "Déficit moderado: 300-500 kcal bajo mantenimiento. Agresivo = rebote.",
      "Mantén proteína alta (2g/kg) para no perder músculo mientras bajas.",
      "Llena la mitad del plato con verduras: volumen y saciedad con pocas calorías.",
      "Evita calorías líquidas: refrescos y jugos son el enemigo silencioso.",
      "No elimines grupos completos de comida: ajusta cantidades, no prohibas.",
    ],
  },
  rendimiento: {
    label: "Rendimiento deportivo",
    icon: "⚡",
    color: C.green,
    tips: [
      "Hidratación: 35ml por kg de peso al día, más en días de entrenamiento intenso.",
      "Comida pre-entreno 1-2h antes: carbohidrato + algo de proteína (plátano + yogur).",
      "Post-entreno dentro de 2 horas: proteína + carbohidrato para recuperar.",
      "El día antes de partido: carga de carbohidratos (pasta, arroz), cena normal.",
      "Cafeína 30-45 min antes de entrenar puede mejorar rendimiento (si la toleras).",
    ],
  },
  general: {
    label: "Salud general",
    icon: "🥗",
    color: C.purple,
    tips: [
      "Regla simple de plato: 1/2 verduras, 1/4 proteína, 1/4 carbohidrato.",
      "Come fruta entera en lugar de jugo: fibra y saciedad reales.",
      "Cocina en casa lo más posible: control total de lo que entra.",
      "Un día flexible a la semana no arruina nada: la constancia semanal es lo que cuenta.",
      "Si un producto tiene más de 5 ingredientes que no reconoces, piénsalo dos veces.",
    ],
  },
};

/* ─── COMPARATIVAS DE NIVEL ─── */
const BENCHMARKS = [
  {
    exercise: "Press banca",
    match: ["press banca"],
    unit: "kg",
    icon: "🏋️",
    levels: [
      { label: "Principiante", value: 40 },
      { label: "Promedio gym", value: 80 },
      { label: "Avanzado", value: 130 },
      { label: "Élite nacional", value: 180 },
      { label: "Bilbo García (leyenda)", value: 232 },
    ],
  },
  {
    exercise: "Sentadilla",
    match: ["sentadilla con barra", "sentadilla pesada", "sentadilla goblet"],
    unit: "kg",
    icon: "🦵",
    levels: [
      { label: "Principiante", value: 50 },
      { label: "Promedio gym", value: 100 },
      { label: "Avanzado", value: 160 },
      { label: "Élite nacional", value: 250 },
      { label: "Récord mundial raw", value: 490 },
    ],
  },
  {
    exercise: "Peso muerto",
    match: ["peso muerto"],
    unit: "kg",
    icon: "⛓️",
    levels: [
      { label: "Principiante", value: 60 },
      { label: "Promedio gym", value: 120 },
      { label: "Avanzado", value: 190 },
      { label: "Élite nacional", value: 300 },
      { label: "Hafthor (récord)", value: 501 },
    ],
  },
  {
    exercise: "Dominadas",
    match: ["dominadas"],
    unit: "reps",
    icon: "🦍",
    levels: [
      { label: "Principiante", value: 3 },
      { label: "Nivel gato 🐈 (ágil)", value: 8 },
      { label: "Nivel lobo 🐺 (fuerte)", value: 15 },
      { label: "Nivel pantera 🐆", value: 25 },
      { label: "Nivel gorila 🦍 (élite)", value: 40 },
    ],
  },
  {
    exercise: "Flexiones",
    match: ["flexiones"],
    unit: "reps",
    icon: "💥",
    levels: [
      { label: "Principiante", value: 10 },
      { label: "Promedio", value: 25 },
      { label: "Atleta", value: 45 },
      { label: "Calistenia avanzada", value: 70 },
      { label: "Bestia total", value: 100 },
    ],
  },
  {
    exercise: "Sprint 30m",
    match: ["sprint máximo — 30m", "sprint máximo — 40m"],
    unit: "nivel",
    icon: "🚀",
    levels: [
      { label: "Amateur (~4.8s)", value: 1 },
      { label: "Semi-pro (~4.3s)", value: 2 },
      { label: "Profesional (~4.0s)", value: 3 },
      { label: "CR7 en su prime (~3.7s)", value: 4 },
      { label: "Usain Bolt (~3.6s)", value: 5 },
    ],
  },
];

/* ─── MASCOTA ─── */
function getMascot(streak) {
  if (streak === 0) return { emoji: "😴", name: "FASE está dormido", msg: "Entrena hoy para despertarlo", color: C.dim };
  if (streak < 3) return { emoji: "🐺", name: "FASE despertó", msg: `${streak} día${streak > 1 ? "s" : ""} de racha — no lo abandones`, color: C.cyan };
  if (streak < 7) return { emoji: "🐺🔥", name: "FASE está encendido", msg: `${streak} días seguidos — se empieza a formar el hábito`, color: C.orange };
  if (streak < 14) return { emoji: "🔥🐺🔥", name: "FASE está imparable", msg: `${streak} días — esto ya es disciplina`, color: C.orange };
  return { emoji: "⚡🐺⚡", name: "FASE es leyenda", msg: `${streak} días — nivel élite de constancia`, color: C.yellow };
}

/* ─── HELPERS ─── */
const todayKey = () => new Date().toISOString().slice(0, 10);

function calcStreak(history) {
  if (!history.length) return 0;
  const days = [...new Set(history.map((h) => h.date))].sort().reverse();
  const today = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    const d1 = new Date(days[i]);
    const d2 = new Date(days[i + 1]);
    if ((d1 - d2) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

function getPRs(history) {
  const prs = {};
  history.forEach((session) => {
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (!s.done) return;
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        if (!prs[ex.name] || w > prs[ex.name].weight || (w === prs[ex.name].weight && r > prs[ex.name].reps)) {
          prs[ex.name] = { weight: w, reps: r };
        }
      });
    });
  });
  return prs;
}

/* ══════════════ COMPONENTES BASE ══════════════ */

function Btn({ children, onClick, color = C.cyan, filled = false, style = {}, small = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "8px 14px" : "13px 18px",
        borderRadius: 12,
        border: `1px solid ${filled ? "transparent" : color + "55"}`,
        background: filled ? color : color + "18",
        color: filled ? "#000" : color,
        fontWeight: 700,
        fontSize: small ? 12 : 14,
        cursor: "pointer",
        transition: "transform 0.1s, opacity 0.15s",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Disclaimer({ text }) {
  return (
    <div
      style={{
        background: C.yellow + "10",
        border: `1px solid ${C.yellow}30`,
        borderRadius: 12,
        padding: "10px 14px",
        marginBottom: 16,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span style={{ color: C.mut, fontSize: 12, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

/* ══════════════ TEMPORIZADOR DE DESCANSO ══════════════ */
function RestTimer({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = (left / seconds) * 100;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 400,
        background: C.surface,
        border: `1px solid ${C.cyan}55`,
        borderRadius: 16,
        padding: 16,
        zIndex: 50,
        boxShadow: "0 8px 40px rgba(0,229,255,0.15)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: C.mut, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>⏱ DESCANSO</span>
        <span style={{ color: C.cyan, fontSize: 28, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </span>
      </div>
      <div style={{ background: C.border, borderRadius: 99, height: 6, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: C.cyan, transition: "width 1s linear" }} />
      </div>
      <Btn onClick={onDone} color={C.cyan} small style={{ width: "100%" }}>
        Saltar descanso →
      </Btn>
    </div>
  );
}

/* ══════════════ SESIÓN ACTIVA ══════════════ */
function ActiveSession({ workout, level, category, onFinish, onCancel, prs }) {
  const exercises = workout.levels[level];
  const [log, setLog] = useState(
    exercises.map((ex) => ({
      name: ex.name,
      target: ex,
      sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false, failed: false })),
    }))
  );
  const [restTimer, setRestTimer] = useState(null);
  const startTime = useRef(Date.now());

  const updateSet = (exIdx, setIdx, field, value) => {
    setLog((prev) => {
      const next = prev.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }));
      next[exIdx].sets[setIdx][field] = value;
      return next;
    });
  };

  const completeSet = (exIdx, setIdx, failed = false) => {
    setLog((prev) => {
      const next = prev.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }));
      next[exIdx].sets[setIdx].done = !failed;
      next[exIdx].sets[setIdx].failed = failed;
      return next;
    });
    const rest = exercises[exIdx].rest;
    if (rest > 0 && !failed) setRestTimer(rest);
  };

  const totalSets = log.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = log.reduce((s, e) => s + e.sets.filter((x) => x.done || x.failed).length, 0);

  const finish = () => {
    const durationMin = Math.max(1, Math.round((Date.now() - startTime.current) / 60000));
    onFinish({
      date: todayKey(),
      timestamp: Date.now(),
      workoutName: workout.label,
      category,
      level,
      durationMin,
      exercises: log.map((e) => ({ name: e.name, sets: e.sets.filter((s) => s.done || s.failed) })),
    });
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header sesión */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ color: workout.color, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            {workout.icon} SESIÓN ACTIVA
          </div>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>{workout.label}</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: C.dim, fontSize: 13, cursor: "pointer" }}>
          ✕ Salir
        </button>
      </div>

      {/* Progreso */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: C.mut, fontSize: 11 }}>
            {doneSets} de {totalSets} series
          </span>
          <span style={{ color: workout.color, fontSize: 11, fontWeight: 700 }}>{Math.round((doneSets / totalSets) * 100)}%</span>
        </div>
        <div style={{ background: C.border, borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div
            style={{ width: `${(doneSets / totalSets) * 100}%`, height: "100%", background: workout.color, transition: "width 0.4s" }}
          />
        </div>
      </div>

      {/* Ejercicios */}
      {log.map((ex, exIdx) => {
        const pr = prs[ex.name];
        const isWeight = ex.target.type === "peso";
        return (
          <Card key={exIdx}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{ex.name}</div>
              <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>
                Meta: {ex.target.sets} series × {ex.target.reps}
                {ex.target.rest > 0 && ` · ${ex.target.rest}s descanso`}
              </div>
              {pr && (
                <div style={{ color: C.yellow, fontSize: 11, marginTop: 3 }}>
                  🏆 Tu récord: {pr.weight > 0 ? `${pr.weight}kg × ` : ""}{pr.reps} reps
                </div>
              )}
            </div>

            {ex.sets.map((set, setIdx) => (
              <div
                key={setIdx}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 10,
                  opacity: set.done || set.failed ? 0.85 : 1,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: set.done ? C.green + "25" : set.failed ? C.red + "25" : C.border,
                    color: set.done ? C.green : set.failed ? C.red : C.mut,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {set.done ? "✓" : set.failed ? "✗" : setIdx + 1}
                </div>

                {isWeight && (
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={set.weight}
                    onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                    style={{
                      width: 64,
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  />
                )}

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={set.reps}
                  onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                  style={{
                    width: 64,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                    color: C.text,
                    fontSize: 14,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                />

                {!set.done && !set.failed ? (
                  <>
                    <Btn small color={C.green} onClick={() => completeSet(exIdx, setIdx)} style={{ flex: 1 }}>
                      ✓ Hecha
                    </Btn>
                    <Btn small color={C.red} onClick={() => completeSet(exIdx, setIdx, true)}>
                      Fallé
                    </Btn>
                  </>
                ) : (
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      color: set.done ? C.green : C.red,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {set.done ? "Completada" : "No completada"}
                  </span>
                )}
              </div>
            ))}
          </Card>
        );
      })}

      {/* Terminar */}
      <Btn filled color={workout.color} onClick={finish} style={{ width: "100%", padding: 16, fontSize: 16 }}>
        🏁 TERMINAR SESIÓN
      </Btn>

      {restTimer && <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />}
    </div>
  );
}

/* ══════════════ PANTALLA: INICIO ══════════════ */
function HomeScreen({ history, streak, goTrain }) {
  const mascot = getMascot(streak);
  const thisWeek = history.filter((h) => {
    const d = new Date(h.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  });
  const totalVolume = history.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (es, e) => es + e.sets.reduce((ss, set) => ss + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0),
        0
      ),
    0
  );
  const recent = [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div>
      {/* Mascota + Racha */}
      <div
        style={{
          background: `linear-gradient(135deg, ${mascot.color}18 0%, transparent 70%)`,
          border: `1px solid ${mascot.color}33`,
          borderRadius: 20,
          padding: 20,
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 6, filter: streak === 0 ? "grayscale(0.8)" : "none" }}>{mascot.emoji}</div>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 17 }}>{mascot.name}</div>
        <div style={{ color: C.mut, fontSize: 13, marginTop: 4 }}>{mascot.msg}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const key = d.toISOString().slice(0, 10);
            const trained = history.some((h) => h.date === key);
            return (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: trained ? C.orange + "30" : C.surface,
                  border: `1px solid ${trained ? C.orange : C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {trained ? "🔥" : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { label: "RACHA", value: streak, unit: "días", color: C.orange },
          { label: "SEMANA", value: thisWeek.length, unit: "sesiones", color: C.green },
          { label: "TOTAL", value: history.length, unit: "entrenos", color: C.cyan },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "12px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ color: s.color, fontSize: 24, fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: C.mut, fontSize: 10, letterSpacing: 1, marginTop: 2 }}>
              {s.label} <span style={{ color: C.dim }}>({s.unit})</span>
            </div>
          </div>
        ))}
      </div>

      {totalVolume > 0 && (
        <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.mut, fontSize: 13 }}>💪 Peso total levantado</span>
          <span style={{ color: C.cyan, fontWeight: 800, fontSize: 16 }}>{Math.round(totalVolume).toLocaleString()} kg</span>
        </Card>
      )}

      {/* CTA */}
      <Btn filled color={C.cyan} onClick={goTrain} style={{ width: "100%", padding: 16, fontSize: 16, marginBottom: 18 }}>
        ⚡ ENTRENAR AHORA
      </Btn>

      {/* Historial reciente */}
      <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Historial reciente</div>
      {recent.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ color: C.mut, fontSize: 13 }}>
            Aún no tienes entrenamientos registrados.
            <br />
            Tu primera sesión aparecerá aquí.
          </div>
        </Card>
      ) : (
        recent.map((s, i) => {
          const w = Object.values(WORKOUTS).find((x) => x.label === s.workoutName);
          return (
            <Card key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 24 }}>{w?.icon || "🏋️"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{s.workoutName}</div>
                <div style={{ color: C.mut, fontSize: 11 }}>
                  {s.date} · {s.level} · {s.durationMin} min
                </div>
              </div>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>
                {s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)} series ✓
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

/* ══════════════ PANTALLA: ENTRENAR ══════════════ */
function TrainScreen({ onStart }) {
  const [selected, setSelected] = useState(null);

  if (selected) {
    const w = WORKOUTS[selected];
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{ background: "none", border: "none", color: C.cyan, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}
        >
          ← Volver
        </button>
        <div style={{ fontSize: 40, marginBottom: 6 }}>{w.icon}</div>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 22 }}>{w.label}</div>
        <div style={{ color: C.mut, fontSize: 13, marginBottom: 20 }}>{w.desc}</div>

        <div style={{ color: C.mut, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>ELIGE TU NIVEL</div>
        {Object.entries(w.levels).map(([lvl, exercises]) => {
          const diffColor = lvl === "principiante" ? C.green : lvl === "intermedio" ? C.yellow : C.red;
          const diffEmoji = lvl === "principiante" ? "🟢" : lvl === "intermedio" ? "🟡" : "🔴";
          return (
            <Card key={lvl} onClick={() => onStart(selected, lvl)} style={{ borderColor: diffColor + "33" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>
                    {diffEmoji} {lvl}
                  </div>
                  <div style={{ color: C.mut, fontSize: 12, marginTop: 3 }}>
                    {exercises.length} ejercicios · ~{exercises.reduce((a, e) => a + e.sets, 0)} series
                  </div>
                </div>
                <div style={{ color: diffColor, fontSize: 20 }}>▶</div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Entrenar</div>
      <div style={{ color: C.mut, fontSize: 13, marginBottom: 20 }}>Elige tu disciplina de hoy</div>

      {Object.entries(WORKOUTS).map(([key, w]) => (
        <Card
          key={key}
          onClick={() => setSelected(key)}
          style={{
            background: `linear-gradient(135deg, ${w.color}12 0%, ${C.card} 60%)`,
            borderColor: w.color + "33",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: w.color + "20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              {w.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{w.label}</div>
              <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>{w.desc}</div>
            </div>
            <div style={{ color: w.color, fontSize: 18 }}>→</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ══════════════ PANTALLA: PROGRESO ══════════════ */
function ProgressScreen({ history }) {
  const prs = getPRs(history);

  return (
    <div>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Progreso</div>
      <div style={{ color: C.mut, fontSize: 13, marginBottom: 20 }}>Tus récords vs los mejores del mundo</div>

      {BENCHMARKS.map((bench, i) => {
        // Buscar el PR del usuario en ejercicios que coincidan
        let userValue = 0;
        Object.entries(prs).forEach(([name, pr]) => {
          const lower = name.toLowerCase();
          if (bench.match.some((m) => lower.includes(m))) {
            const val = bench.unit === "kg" ? pr.weight : pr.reps;
            if (val > userValue) userValue = val;
          }
        });

        const maxVal = bench.levels[bench.levels.length - 1].value;
        // Nivel alcanzado
        let reachedIdx = -1;
        bench.levels.forEach((l, idx) => {
          if (userValue >= l.value) reachedIdx = idx;
        });

        return (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>
                {bench.icon} {bench.exercise}
              </div>
              <div style={{ color: userValue > 0 ? C.cyan : C.dim, fontWeight: 800, fontSize: 14 }}>
                {userValue > 0 ? `Tú: ${userValue}${bench.unit === "kg" ? "kg" : bench.unit === "reps" ? " reps" : ""}` : "Sin datos"}
              </div>
            </div>

            {bench.levels.map((lvl, li) => {
              const reached = li <= reachedIdx;
              const isNext = li === reachedIdx + 1;
              const pct = bench.unit === "nivel" ? ((li + 1) / bench.levels.length) * 100 : (lvl.value / maxVal) * 100;
              return (
                <div key={li} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span
                      style={{
                        color: reached ? C.green : isNext ? C.yellow : C.dim,
                        fontSize: 12,
                        fontWeight: reached || isNext ? 700 : 500,
                      }}
                    >
                      {reached ? "✓ " : isNext ? "→ " : ""}
                      {lvl.label}
                    </span>
                    <span style={{ color: reached ? C.green : C.dim, fontSize: 12, fontWeight: 700 }}>
                      {bench.unit === "nivel" ? "" : `${lvl.value}${bench.unit === "kg" ? "kg" : ""}`}
                    </span>
                  </div>
                  <div style={{ background: C.surface, borderRadius: 99, height: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: reached ? C.green : isNext ? C.yellow + "66" : C.border,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        );
      })}

      <Disclaimer text="Las comparativas son aproximadas y motivacionales. Los récords de élite se logran con años de entrenamiento, genética favorable y supervisión profesional." />
    </div>
  );
}

/* ══════════════ PANTALLA: CUERPO (Acondicionamiento) ══════════════ */
function BodyScreen() {
  const [open, setOpen] = useState("movilidad");

  return (
    <div>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Acondicionamiento</div>
      <div style={{ color: C.mut, fontSize: 13, marginBottom: 14 }}>Movilidad, rehabilitación y prevención</div>

      <Disclaimer text="Esta es orientación general de calidad, pero no sustituye atención médica. En lesiones graves, dolor persistente o de preferencia siempre, acude con un fisioterapeuta o especialista en persona." />

      {Object.entries(COND).map(([key, section]) => {
        const isOpen = open === key;
        return (
          <Card
            key={key}
            onClick={() => setOpen(isOpen ? null : key)}
            style={{ borderColor: isOpen ? section.color + "44" : C.border }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: isOpen ? section.color : C.text, fontWeight: 800, fontSize: 15 }}>
                {section.icon} {section.label}
              </div>
              <span style={{ color: C.dim }}>{isOpen ? "▲" : "▼"}</span>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12 }}>
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      background: C.surface,
                      borderRadius: 10,
                      marginBottom: 8,
                      borderLeft: `3px solid ${section.color}`,
                    }}
                  >
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                    <div style={{ color: C.mut, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ══════════════ PANTALLA: TIPS (Nutrición) ══════════════ */
function TipsScreen() {
  const [goal, setGoal] = useState("musculo");
  const active = NUTRI[goal];

  return (
    <div>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Nutrición</div>
      <div style={{ color: C.mut, fontSize: 13, marginBottom: 14 }}>Consejos según tu meta</div>

      <Disclaimer text="Son consejos generales de nutrición deportiva. Para un plan personalizado a tu cuerpo y objetivos, lo ideal es acudir con un nutriólogo." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {Object.entries(NUTRI).map(([key, n]) => (
          <button
            key={key}
            onClick={() => setGoal(key)}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              border: `1px solid ${goal === key ? n.color : C.border}`,
              background: goal === key ? n.color + "20" : C.card,
              color: goal === key ? n.color : C.mut,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      {active.tips.map((tip, i) => (
        <Card key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${active.color}` }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              background: active.color + "20",
              color: active.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </div>
          <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{tip}</div>
        </Card>
      ))}
    </div>
  );
}

/* ══════════════ CELEBRACIÓN POST-SESIÓN ══════════════ */
function CelebrationScreen({ session, streak, onClose }) {
  const doneSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const volume = session.exercises.reduce(
    (a, e) => a + e.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0),
    0
  );
  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontSize: 72, marginBottom: 10 }}>🏆</div>
      <div style={{ color: C.text, fontWeight: 900, fontSize: 26 }}>¡Sesión completada!</div>
      <div style={{ color: C.mut, fontSize: 14, marginTop: 6, marginBottom: 24 }}>
        {session.workoutName} · nivel {session.level}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {[
          { label: "SERIES", value: doneSets, color: C.green },
          { label: "MINUTOS", value: session.durationMin, color: C.cyan },
          { label: "RACHA", value: `${streak}🔥`, color: C.orange },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: C.card,
              border: `1px solid ${s.color}33`,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ color: s.color, fontSize: 26, fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: C.mut, fontSize: 10, letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {volume > 0 && (
        <div style={{ color: C.mut, fontSize: 13, marginBottom: 24 }}>
          Levantaste <span style={{ color: C.cyan, fontWeight: 800 }}>{Math.round(volume).toLocaleString()} kg</span> en total 💪
        </div>
      )}

      <Btn filled color={C.cyan} onClick={onClose} style={{ width: "100%", padding: 16, fontSize: 15 }}>
        Continuar →
      </Btn>
    </div>
  );
}

/* ══════════════ APP PRINCIPAL ══════════════ */
export default function App() {
  const [tab, setTab] = useState("home");
  const [session, setSession] = useState(null); // {category, level}
  const [celebration, setCelebration] = useState(null);
  const [history, setHistory] = useState(() => store.get("history", []));

  useEffect(() => {
    store.set("history", history);
  }, [history]);

  const streak = calcStreak(history);
  const prs = getPRs(history);

  const startSession = (category, level) => setSession({ category, level });

  const finishSession = (record) => {
    setHistory((prev) => [...prev, record]);
    setSession(null);
    setCelebration(record);
  };

  const NAV = [
    { id: "home", icon: "🏠", label: "Inicio" },
    { id: "train", icon: "⚡", label: "Entrenar" },
    { id: "progress", icon: "📈", label: "Progreso" },
    { id: "body", icon: "🧘", label: "Cuerpo" },
    { id: "tips", icon: "🥗", label: "Tips" },
  ];

  const renderScreen = () => {
    if (celebration)
      return (
        <CelebrationScreen
          session={celebration}
          streak={streak}
          onClose={() => {
            setCelebration(null);
            setTab("home");
          }}
        />
      );
    if (session)
      return (
        <ActiveSession
          workout={WORKOUTS[session.category]}
          level={session.level}
          category={session.category}
          prs={prs}
          onFinish={finishSession}
          onCancel={() => setSession(null)}
        />
      );
    switch (tab) {
      case "home":
        return <HomeScreen history={history} streak={streak} goTrain={() => setTab("train")} />;
      case "train":
        return <TrainScreen onStart={startSession} />;
      case "progress":
        return <ProgressScreen history={history} />;
      case "body":
        return <BodyScreen />;
      case "tips":
        return <TipsScreen />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 84,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 18px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: C.bg + "F0",
          backdropFilter: "blur(14px)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            F
          </div>
          <div>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 900, letterSpacing: 2 }}>F.A.S.E.</div>
            <div style={{ color: C.dim, fontSize: 9, letterSpacing: 0.5 }}>FORMACIÓN ATLÉTICA Y SISTEMAS DE ENTRENAMIENTO</div>
          </div>
        </div>
        {streak > 0 && (
          <div
            style={{
              background: C.orange + "20",
              border: `1px solid ${C.orange}44`,
              borderRadius: 20,
              padding: "4px 12px",
              color: C.orange,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            🔥 {streak}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: "16px 16px 0" }}>{renderScreen()}</div>

      {/* Navegación inferior */}
      {!session && !celebration && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 430,
            background: C.surface + "F8",
            backdropFilter: "blur(18px)",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            zIndex: 20,
          }}
        >
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                flex: 1,
                padding: "10px 0 12px",
                border: "none",
                background: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                position: "relative",
              }}
            >
              <span style={{ fontSize: 20, filter: tab === item.id ? "none" : "grayscale(0.7) opacity(0.6)" }}>{item.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: tab === item.id ? C.cyan : C.dim,
                }}
              >
                {item.label}
              </span>
              {tab === item.id && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 28,
                    height: 3,
                    background: C.cyan,
                    borderRadius: "0 0 4px 4px",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}