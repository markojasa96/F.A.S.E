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

/* ─── Modo oscuro / claro (data-theme + variables CSS) ─── */
const THEME_VARS = {
  dark: { bg: "#07070C", surface: "#101018", card: "#181822", border: "#26263A", text: "#F2F2F8", mut: "#6B7280", dim: "#374151", accent: "#00E5FF" },
  light: { bg: "#F0F4F8", surface: "#FFFFFF", card: "#F8FAFC", border: "#E2E8F0", text: "#1A202C", mut: "#64748B", dim: "#94A3B8", accent: "#0099CC" },
};

function applyDarkMode(isDark) {
  const mode = isDark ? "dark" : "light";
  const vars = THEME_VARS[mode];
  C.bg = vars.bg; C.surface = vars.surface; C.card = vars.card; C.border = vars.border; C.text = vars.text; C.mut = vars.mut; C.dim = vars.dim; C.cyan = vars.accent;
  try {
    document.documentElement.setAttribute("data-theme", mode);
    document.body.style.background = vars.bg;
  } catch {
    /* SSR o entorno sin document */
  }
}

/* ─── Storage seguro (prefijo fase_) ─── */
const STORE_MAX_READ = 5_000_000; // 5MB por key: si se supera, se asume corrupto
const STORE_MAX_WRITE = 4_000_000; // 4MB por key: no se guarda si es más grande

const store = {
  get(key, fallback) {
    const fullKey = "fase_" + key;
    try {
      const v = window.localStorage.getItem(fullKey);
      if (v === null) return fallback;
      if (v.length > STORE_MAX_READ) {
        window.localStorage.removeItem(fullKey);
        return fallback;
      }
      return JSON.parse(v);
    } catch {
      try { window.localStorage.removeItem(fullKey); } catch { /* nada más que hacer */ }
      return fallback;
    }
  },
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > STORE_MAX_WRITE) {
        console.warn("Dato demasiado grande para guardar:", key);
        return false;
      }
      window.localStorage.setItem("fase_" + key, serialized);
      return true;
    } catch (e) {
      if (store.onError) store.onError(e);
      return false;
    }
  },
  onError: null,
};

/* ─── Sanitización de texto ingresado por el usuario (nombre, rutinas, etc.) ─── */
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>"']/g, "") // eliminar HTML
    .replace(/javascript:/gi, "") // XSS
    .replace(/on\w+=/gi, "") // event handlers
    .trim()
    .slice(0, 100); // máximo 100 caracteres
}

/* Igual que sanitize() pero para texto libre más largo (notas de sesión) */
function sanitizeNote(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>"']/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .slice(0, 300);
}

/* ─── Sistema tipográfico (v8: diseño premium) ─── */
const TYPOGRAPHY = {
  display: { fontSize: 36, fontWeight: 900, letterSpacing: -1, fontVariantNumeric: "tabular-nums" },
  h1: { fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  h2: { fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" },
  body: { fontSize: 13, fontWeight: 500, lineHeight: 1.5 },
  caption: { fontSize: 11, fontWeight: 400 },
  label: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" },
};

/* ─── Count-up animado para números que cambian ─── */
function useCountUp(target, duration = 800) {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return undefined;
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();
    let raf;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setCurrent(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevTarget.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

/* ─── Formato inteligente de unidades y fechas ─── */
function formatVolume(kg) {
  if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M kg`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}

function volumeEquivalent(kg) {
  if (kg >= 50000) return `${(kg / 5000).toFixed(1)} elefantes 🐘`;
  if (kg >= 5000) return `${(kg / 80).toFixed(0)} personas 🧑`;
  if (kg >= 1000) return `${(kg / 450).toFixed(1)} pianos 🎹`;
  if (kg >= 200) return `${(kg / 80).toFixed(1)} personas 🧑`;
  return `${Math.round(kg)} kg`;
}

function timeAgo(dateInput) {
  const diff = Date.now() - new Date(dateInput).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins < 60) return "Hace poco";
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (weeks === 1) return "Hace 1 semana";
  if (weeks < 4) return `Hace ${weeks} semanas`;
  if (months === 1) return "Hace 1 mes";
  return `Hace ${months} meses`;
}

function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/* ─── Tips del día (rotan uno por día) ─── */
const DAILY_TIPS = [
  "El músculo crece en el descanso, no en el gym.",
  "Progresión de carga: añade 2.5kg cuando completes todas las series con buena técnica.",
  "La técnica primero, el peso después. Siempre.",
  "3 sesiones consistentes superan a 6 sesiones irregulares.",
  "El calentamiento no es opcional si quieres durar años entrenando.",
  "Los isquiotibiales son el músculo más lesionado en el fútbol. Entrena el curl nórdico.",
  "La velocidad se entrena descansado. Sprints con CNS fresco.",
  "En gimnasio: los últimos 2 reps de cada serie son los que generan adaptación.",
  "Fuerza + velocidad = potencia. Entrena las dos.",
  "El dolor muscular al día siguiente (agujetas) no indica un buen entrenamiento.",
  "Duerme 7-9 horas. Es el mejor suplemento que existe.",
  "El estrés crónico eleva el cortisol y dificulta ganar músculo.",
  "Hidratación: orina amarillo claro = bien hidratado.",
  "Un día de descanso no te hace perder músculo. Te hace crecer.",
  "El foam roller antes de entrenar mejora el rango de movimiento.",
  "La constancia supera al talento. Siempre.",
  "Un entrenamiento malo es mejor que ningún entrenamiento.",
  "No compares tu capítulo 1 con el capítulo 20 de otro.",
  "La motivación te arranca. El hábito te mantiene.",
  "Visualiza la sesión antes de empezarla. Los atletas de élite lo hacen.",
  "El mayor atleta es el que sigue cuando no tiene ganas.",
  "Come proteína en cada comida principal.",
  "Los carbohidratos son el combustible del entrenamiento, no el enemigo.",
  "El ayuno antes de entrenar reduce la intensidad que puedes aplicar.",
  "Post-entreno: proteína + carbohidrato en las primeras 2 horas.",
  "La creatina monohidratada es el suplemento más estudiado y seguro.",
  "Calienta las articulaciones antes de cargar peso, no solo los músculos.",
  "La respiración correcta en cada rep mejora tu estabilidad y tu fuerza.",
  "Entrenar al fallo en cada serie no es necesario para progresar.",
  "El core no son solo abdominales: es todo el cilindro de presión.",
  "Registra tus pesos. Lo que no mides, no mejora.",
  "La movilidad de tobillo es la base de una buena sentadilla.",
  "No hay músculo débil, hay músculo poco entrenado.",
  "El descanso entre series importa tanto como el ejercicio mismo.",
  "Cambia de rutina cada 6-8 semanas para seguir progresando.",
  "El calzado plano ayuda a la estabilidad en sentadilla y peso muerto.",
  "Estirar en frío no previene lesiones; el calentamiento activo sí ayuda.",
  "La postura frente a la pantalla afecta tu técnica en el gimnasio.",
  "Escuchar a tu cuerpo no es debilidad, es inteligencia de entrenamiento.",
  "Un buen calentamiento reduce el riesgo de lesión más que cualquier estiramiento.",
  "La fuerza de agarre predice más de lo que crees sobre tu progreso general.",
  "Entrena primero lo que más te cuesta, cuando tienes más energía.",
  "El sueño de mala calidad reduce tu fuerza al día siguiente más que el cansancio muscular.",
  "La regla del 10%: no aumentes el volumen semanal más de un 10% de golpe.",
  "El calentamiento específico (con el propio movimiento) es mejor que solo cardio general.",
  "Beber agua durante el entrenamiento mantiene tu rendimiento en sesiones largas.",
  "La simetría entre lados del cuerpo se entrena, no se asume.",
  "Un plan de entrenamiento sin objetivo claro rara vez se sostiene en el tiempo.",
  "El sobreentrenamiento se nota primero en el ánimo, no en el cuerpo.",
  "Cuenta tempos: bajar controlado también construye fuerza.",
  "La flexibilidad y la movilidad no son lo mismo; entrena ambas.",
  "Celebra los pequeños progresos: son la prueba de que el sistema funciona.",
  "El calentamiento mental cuenta: llega con la cabeza puesta en la sesión.",
  "La consistencia mensual importa más que la intensidad de un solo día.",
  "Entrena el lado no dominante un poco más para equilibrar tu cuerpo.",
  "El café antes de entrenar puede mejorar tu rendimiento si lo toleras bien.",
  "No hay atajos para la resistencia cardiovascular: se construye con tiempo.",
  "Anota cómo te sentiste en cada sesión; los patrones te dirán mucho.",
  "La recuperación activa (caminar, movilidad suave) acelera la siguiente sesión.",
  "El objetivo no es entrenar más, es entrenar mejor y con más frecuencia sostenible.",
  "Cada atleta de élite empezó exactamente donde tú estás ahora.",
];

/* Día del año (1-366), usado para rotar el tip diario */
function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

/* Otorga XP de bonificación acumulada (agua, enfriamiento) de forma persistente y sin duplicar */
function awardBonusXpOnce(guardKey, amount) {
  if (store.get(guardKey, false)) return;
  store.set(guardKey, true);
  store.set("bonus_xp", store.get("bonus_xp", 0) + amount);
}

/* ─── Análisis de fatiga acumulada ─── */
function analyzeFatigue(sessions) {
  const cutoff = Date.now() - 7 * 86400000;
  const last7 = sessions.filter((s) => s.kind === "entreno" && s.ts >= cutoff);

  const completionRates = last7.map((s) => {
    const total = s.exercises.reduce((a, e) => a + e.sets.length, 0);
    const done = s.exercises.reduce((a, e) => a + e.sets.filter((st) => st.ok).length, 0);
    return total > 0 ? done / total : 1;
  });
  const avgCompletion = completionRates.length ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length : 1;
  const activeDays = new Set(last7.map((s) => dayKey(s.ts))).size;

  if (activeDays >= 6 && avgCompletion < 0.7) return "critical";
  if (activeDays >= 5 || avgCompletion < 0.75) return "warning";
  if (activeDays >= 4 && avgCompletion < 0.85) return "caution";
  return "optimal";
}

const FATIGUE_INFO = {
  optimal: { emoji: "🟢", label: "Óptimo", color: C.green, title: "Cuerpo en estado ideal 💪", desc: "Hoy es un buen día para dar el máximo." },
  caution: { emoji: "🟡", label: "Precaución", color: C.yellow, title: "Acercándote al límite", desc: "Buen momento para una sesión más ligera." },
  warning: { emoji: "🟠", label: "Alerta", color: C.orange, title: "Rendimiento bajando", desc: "Considera bajar la intensidad hoy." },
  critical: { emoji: "🔴", label: "Crítico", color: C.red, title: "⚠️ Signos de sobreentrenamiento", desc: "Tu rendimiento bajó y llevas muchos días seguidos. Tu cuerpo está pidiendo descanso. Recomendación: 2 días de descanso completo, luego Cuerpo/Movilidad suave." },
};

/* ─── Mentores virtuales ─── */
const MENTORS = {
  maestro: { name: "El Maestro", color: "#FFD700" },
  guerrero: { name: "El Guerrero", color: "#FF3B5C" },
  medico: { name: "El Médico", color: "#60A5FA" },
  coach: { name: "El Coach", color: "#22FF88" },
};

function canShowMentorToday() {
  return store.get("mentor_shown_today", null) !== todayKey();
}
function markMentorShown() {
  store.set("mentor_shown_today", todayKey());
}

function MentorToast({ mentorId, message, onClose }) {
  const mentor = MENTORS[mentorId];
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!mentor) return null;
  return (
    <div
      role="button" tabIndex={0} onClick={onClose}
      className="card fade-up"
      style={{
        position: "fixed", left: 12, right: 12, bottom: 90, zIndex: 400, maxWidth: 430, margin: "0 auto",
        padding: "14px 16px", borderLeft: `3px solid ${mentor.color}`,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 900, color: mentor.color }}>{mentor.name}</p>
      <p style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>{message}</p>
    </div>
  );
}

/* ─── Periodización automática de 12 semanas ─── */
const PERIODIZATION = {
  foundation: { desc: "Construyendo la base", focus: "Técnica perfecta y adaptación", setsModifier: -1, restModifier: 30, color: C.blue },
  accumulation: { desc: "Acumulando volumen", focus: "Más series, más trabajo", setsModifier: 1, restModifier: 0, color: C.green },
  intensification: { desc: "Aumentando intensidad", focus: "Más peso, menos reps", setsModifier: 0, restModifier: 20, color: C.orange },
  deload: { desc: "Semana de recuperación", focus: "Dejar que el cuerpo asimile", setsModifier: -2, restModifier: -15, color: C.purple },
};

function getPlanWeekNumber() {
  const start = store.get("plan_start", null);
  if (!start) return null;
  return Math.floor((Date.now() - new Date(start).getTime()) / (7 * 86400000)) + 1;
}

function getPlanPhase(weekNumber) {
  if (weekNumber <= 3) return "foundation";
  if (weekNumber === 4) return "deload";
  if (weekNumber <= 7) return "accumulation";
  if (weekNumber === 8) return "deload";
  if (weekNumber <= 11) return "intensification";
  return "deload";
}

const PERIODIZATION_LABELS = { foundation: "Base", accumulation: "Acumulación", intensification: "Intensificación", deload: "Deload" };

/* ─── Test de activación del SNC (tap test) ─── */
function tapTestAverage() {
  const history = store.get("tap_test_history", []);
  const last5 = history.slice(-5);
  if (!last5.length) return null;
  return last5.reduce((a, t) => a + t.score, 0) / last5.length;
}
function tapTestResult(score) {
  const avg = tapTestAverage();
  if (avg === null) return { color: C.cyan, label: "🎯 Primer registro guardado", note: "A partir de la próxima prueba veremos tu tendencia." };
  const pct = (score / avg) * 100;
  if (pct >= 90) return { color: C.green, label: "🟢 SNC fresco — da todo", note: null };
  if (pct >= 75) return { color: C.yellow, label: "🟡 SNC normal — sesión estándar", note: null };
  return { color: C.red, label: "🔴 SNC fatigado — evita velocidad y fuerza máxima hoy", note: "Hoy: movilidad o técnica, no fuerza pesada." };
}

/* ─── Combine mensual: batería de tests una vez al mes ─── */
function daysSinceLastCombine() {
  const last = store.get("last_combine", null);
  if (!last) return null;
  return Math.floor((Date.now() - last) / 86400000);
}
function persistentPainZones() {
  const map = store.get("body_pain_map", {});
  const today = dayKey(Date.now());
  return Object.entries(map)
    .filter(([, v]) => v.consecutiveDays >= 3 && (dayKey(v.lastDate) === today || dayKey(v.lastDate) === dayKey(Date.now() - 86400000)))
    .map(([zone]) => zone);
}

function CombineScreen({ onClose }) {
  const [step, setStep] = useState(0); // 0 sprint, 1 jump, 2 1rm, 3 tap, 4 resistencia, 5 resultados
  const [sprintTime, setSprintTime] = useState("");
  const [jumpHeight, setJumpHeight] = useState("");
  const [runMinutes, setRunMinutes] = useState("");
  const [showTapTest, setShowTapTest] = useState(false);
  const prevBest = store.get("sprint_tests", []).slice(-1)[0]?.time || null;
  const prevJump = bestJump();

  const finish = () => {
    if (sprintTime) {
      const next = [...store.get("sprint_tests", []), { date: Date.now(), time: parseFloat(sprintTime), distance: 30 }].slice(-12);
      store.set("sprint_tests", next);
    }
    if (jumpHeight) {
      const next = [...store.get("jump_history", []), { date: Date.now(), height: parseFloat(jumpHeight) }].slice(-30);
      store.set("jump_history", next);
    }
    if (runMinutes) {
      store.set("resistance_tests", [...store.get("resistance_tests", []), { date: Date.now(), minutes: parseFloat(runMinutes) }].slice(-12));
    }
    store.set("last_combine", Date.now());
    setStep(5);
  };

  const squat1RM = store.get("1rm", {})["Sentadilla"]?.rm || null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflowY: "auto", padding: 24 }}>
      {step < 5 && <button onClick={onClose} style={{ color: C.mut, fontSize: 14 }}>✕ Cerrar</button>}
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10, textAlign: "center" }}>🧪 Combine mensual</h2>

      {step === 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Test 1 — Sprint 30m</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Cronometra tu sprint de 30m. Necesitas un compañero o usa el timer manual.</p>
          {prevBest && <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Anterior: {prevBest}s</p>}
          <input className="input" type="number" placeholder="Tiempo en segundos (ej. 4.2)" value={sprintTime} onChange={(e) => setSprintTime(e.target.value)} style={{ marginTop: 10, padding: 10 }} />
          <button className="btn-xl" onClick={() => setStep(1)} style={{ marginTop: 12, background: C.cyan, color: "#07070C" }}>Siguiente</button>
        </div>
      )}
      {step === 1 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Test 2 — Salto vertical</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Párate junto a una pared. Marca hasta donde alcanzas parado, luego salta y marca el punto más alto.</p>
          {prevJump && <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Récord anterior: {prevJump}cm</p>}
          <input className="input" type="number" placeholder="Altura en cm" value={jumpHeight} onChange={(e) => setJumpHeight(e.target.value)} style={{ marginTop: 10, padding: 10 }} />
          <button className="btn-xl" onClick={() => setStep(2)} style={{ marginTop: 12, background: C.cyan, color: "#07070C" }}>Siguiente</button>
        </div>
      )}
      {step === 2 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Test 3 — 1RM estimado</p>
          {squat1RM ? (
            <p style={{ fontSize: 22, fontWeight: 900, color: C.cyan, marginTop: 8 }}>{squat1RM}kg</p>
          ) : (
            <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Sin 1RM registrado todavía. Regístralo en Progreso → Calculadora 1RM.</p>
          )}
          <button className="btn-xl" onClick={() => setStep(3)} style={{ marginTop: 12, background: C.cyan, color: "#07070C" }}>Siguiente</button>
        </div>
      )}
      {step === 3 && (
        <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Test 4 — Tap Test SNC</p>
          <button className="btn-xl" onClick={() => setShowTapTest(true)} style={{ marginTop: 12, background: C.cyan, color: "#07070C" }}>Hacer test</button>
          <button onClick={() => setStep(4)} style={{ marginTop: 10, color: C.mut, fontSize: 12 }}>Saltar este test →</button>
        </div>
      )}
      {showTapTest && <TapTestScreen onClose={() => { setShowTapTest(false); setStep(4); }} />}
      {step === 4 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Test 5 — Resistencia (opcional)</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>¿Cuántos minutos puedes correr a ritmo moderado sin parar?</p>
          <input className="input" type="number" placeholder="Minutos" value={runMinutes} onChange={(e) => setRunMinutes(e.target.value)} style={{ marginTop: 10, padding: 10 }} />
          <button className="btn-xl" onClick={finish} style={{ marginTop: 12, background: C.green, color: "#07070C" }}>Terminar Combine</button>
        </div>
      )}
      {step === 5 && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 40 }}>📊</div>
          <p style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>Combine completado</p>
          <div className="card" style={{ marginTop: 16, textAlign: "left" }}>
            {sprintTime && (
              <p style={{ fontSize: 13, marginTop: 4 }}>
                Velocidad: {prevBest ? `${prevBest}s → ${sprintTime}s ${parseFloat(sprintTime) < prevBest ? "↑" : "↓"}` : `${sprintTime}s`}
              </p>
            )}
            {jumpHeight && (
              <p style={{ fontSize: 13, marginTop: 4 }}>
                Salto: {prevJump ? `${prevJump}cm → ${jumpHeight}cm ${parseFloat(jumpHeight) > prevJump ? "↑" : "↓"}` : `${jumpHeight}cm`}
              </p>
            )}
            {runMinutes && <p style={{ fontSize: 13, marginTop: 4 }}>Resistencia: {runMinutes} min</p>}
          </div>
          <button className="btn-xl" onClick={onClose} style={{ marginTop: 20, background: C.cyan, color: "#07070C" }}>Ver mi radar actualizado</button>
        </div>
      )}
    </div>
  );
}

function TapTestScreen({ onClose }) {
  const [phase, setPhase] = useState("ready"); // ready | running | done
  const [taps, setTaps] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (phase !== "running") return undefined;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) {
        setTaps((score) => {
          const history = store.get("tap_test_history", []);
          const tapAvg = tapTestAverage();
          const next = [...history, { date: Date.now(), score }].slice(-30);
          store.set("tap_test_history", next);
          setResult(tapTestResult(score));
          const tapRatio = tapAvg > 0 ? score / tapAvg : 1;
          if (tapRatio < 0.75) {
            store.set("snc_fatigued_today", { date: new Date().toDateString(), ratio: tapRatio });
          } else {
            store.set("snc_fatigued_today", null);
          }
          return score;
        });
        setPhase("done");
      } else {
        setSecondsLeft((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  const start = () => { setTaps(0); setSecondsLeft(10); setPhase("running"); };
  const tap = () => { if (phase === "running") { setTaps((t) => t + 1); if (navigator.vibrate) navigator.vibrate(10); } };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, left: 20, color: C.mut, fontSize: 14 }}>✕ Cerrar</button>
      {phase === "ready" && (
        <>
          <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center" }}>Test de activación</p>
          <p style={{ color: C.mut, fontSize: 13, textAlign: "center", marginTop: 8 }}>Toca el botón el máximo de veces en 10 segundos</p>
          <button className="btn-xl btn-physics" onClick={start} style={{ marginTop: 24, background: C.cyan, color: "#07070C" }}>Empezar</button>
        </>
      )}
      {phase === "running" && (
        <>
          <p style={{ color: "#fff", fontSize: 32, fontWeight: 900 }}>{secondsLeft}s</p>
          <button
            onTouchStart={tap} onMouseDown={tap}
            style={{ width: 140, height: 140, borderRadius: "50%", background: C.cyan, marginTop: 20, border: "none" }}
          />
          <p style={{ color: C.mut, fontSize: 20, fontWeight: 900, marginTop: 20 }}>{taps}</p>
        </>
      )}
      {phase === "done" && result && (
        <>
          <p style={{ color: result.color, fontSize: 18, fontWeight: 900, textAlign: "center" }}>{result.label}</p>
          <p style={{ color: "#fff", fontSize: 32, fontWeight: 900, marginTop: 10 }}>{taps} toques</p>
          {result.note && <p style={{ color: C.mut, fontSize: 13, marginTop: 10, textAlign: "center" }}>{result.note}</p>}
          <button className="btn-xl" onClick={onClose} style={{ marginTop: 24, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>Cerrar</button>
        </>
      )}
    </div>
  );
}

/* ─── Debriefing post-partido: registro rápido de 4 datos ─── */
function MatchDebriefScreen({ onSave, onClose }) {
  const [duelos, setDuelos] = useState(5);
  const [perdidas, setPerdidas] = useState(3);
  const [rpe, setRpe] = useState(6);
  const [minutos, setMinutos] = useState(90);
  const rpeColor = (v) => (v <= 3 ? C.green : v <= 6 ? C.yellow : C.red);

  const save = () => {
    onSave({
      id: Date.now(), ts: Date.now(), kind: "partido",
      duelos, perdidasBalon: perdidas, rpe, minutosJugados: minutos,
      load: minutos * rpe,
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflowY: "auto", padding: 24 }}>
      <button onClick={onClose} style={{ color: C.mut, fontSize: 14 }}>✕ Cerrar</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10, textAlign: "center" }}>Post-partido</h2>
      <p style={{ fontSize: 12, color: C.mut, textAlign: "center" }}>30 segundos · Datos puros</p>

      <div className="card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>¿Cuántos duelos físicos ganaste?</p>
        <input type="range" min="0" max="10" value={duelos} onChange={(e) => setDuelos(Number(e.target.value))} style={{ width: "100%", marginTop: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim }}><span>Ninguno</span><b style={{ color: C.text }}>{duelos}</b><span>Todos</span></div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>¿Cuántos balones perdiste bajo presión?</p>
        <input type="range" min="0" max="10" value={perdidas} onChange={(e) => setPerdidas(Number(e.target.value))} style={{ width: "100%", marginTop: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim }}><span>Ninguno</span><b style={{ color: C.text }}>{perdidas}</b><span>Muchos</span></div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>¿Qué tan duro fue físicamente?</p>
        <input type="range" min="1" max="10" value={rpe} onChange={(e) => setRpe(Number(e.target.value))} style={{ width: "100%", marginTop: 10 }} />
        <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: rpeColor(rpe) }}>{rpe}/10</div>
      </div>

      <div className="card" style={{ marginTop: 12, textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>Minutos jugados</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10 }}>
          <button onClick={() => setMinutos((m) => Math.max(0, m - 5))} style={{ width: 40, height: 40, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, fontSize: 18, color: C.text }}>−</button>
          <span style={{ fontSize: 32, fontWeight: 900 }}>{minutos}</span>
          <button onClick={() => setMinutos((m) => Math.min(120, m + 5))} style={{ width: 40, height: 40, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, fontSize: 18, color: C.text }}>+</button>
        </div>
      </div>

      <button className="btn-xl btn-physics" onClick={save} style={{ marginTop: 20, background: C.cyan, color: "#07070C" }}>Guardar partido</button>
    </div>
  );
}

/* ─── Mi semana: vista de calendario de la semana actual ─── */
// eslint-disable-next-line no-unused-vars -- ya no tiene acceso desde Progreso; se deja el componente sin eliminar
function MyWeekScreen({ sessions, onBack }) {
  const [detailDay, setDetailDay] = useState(null);
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - dow);
  const matchDay = store.get("match_day", null);
  const structure = getWeeklyStructure();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayKey(d.getTime());
    const daySessions = sessions.filter((s) => s.kind === "entreno" && dayKey(s.ts) === key);
    const nowTs = today.getTime();
    const isFuture = d.getTime() > nowTs && dayKey(d.getTime()) !== dayKey(nowTs);
    const isToday = dayKey(d.getTime()) === dayKey(nowTs);
    const isMatch = matchDay !== null && d.getDay() === matchDay;
    const structIdx = structure.days.indexOf(dayNames[d.getDay()]);
    return { date: d, sessions: daySessions, isFuture, isToday, isMatch, plannedLabel: structIdx >= 0 ? structure.sessions[structIdx] : null };
  });

  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Progreso</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>📅 Mi semana</h2>
      <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDetailDay(d)}
            className="my-week-day card"
            style={{
              flex: 1, minWidth: 0, padding: "8px 4px", textAlign: "center", minHeight: 90,
              border: `1px solid ${d.isToday ? C.cyan : C.border}`,
              background: d.isFuture ? C.surface : C.card,
            }}
          >
            <div style={{ fontSize: 10, color: C.mut, fontWeight: 700 }}>{["L", "M", "X", "J", "V", "S", "D"][i]}</div>
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {d.isMatch && <span style={{ fontSize: 12 }}>⚽</span>}
              {d.sessions.length > 0 ? (
                <>
                  {d.sessions.slice(0, 3).map((s, j) => (
                    <span key={j} style={{ fontSize: 14 }}>{exerciseTypeIcon(s.exercises?.[0]?.name || "")}</span>
                  ))}
                  {d.sessions.length > 3 && <span style={{ fontSize: 10, color: C.mut, fontWeight: 700 }}>+{d.sessions.length - 3}</span>}
                </>
              ) : (
                <span style={{ color: C.dim, fontSize: 12 }}>—</span>
              )}
            </div>
          </button>
        ))}
      </div>
      {detailDay && (
        <div
          onClick={() => setDetailDay(null)}
          style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 430, padding: 20, borderRadius: "20px 20px 0 0" }}>
            <p style={{ fontSize: 15, fontWeight: 800 }}>{detailDay.date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</p>
            {detailDay.sessions.length > 0 ? (
              detailDay.sessions.map((s, i) => {
                const okSets = (s.exercises || []).flatMap((e) => e.sets || []).filter((st) => st.ok);
                const vol = Math.round(okSets.reduce((a, st) => a + st.weight * st.reps, 0));
                return (
                  <div key={i} style={{ marginTop: 10, fontSize: 13 }}>
                    <b>{DISCIPLINES[s.disc]?.label || s.disc}</b>
                    <p style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>{(s.exercises || []).length} ejercicios · {vol}kg volumen · {s.durationMin || 0} min</p>
                  </div>
                );
              })
            ) : detailDay.isFuture ? (
              <p style={{ fontSize: 13, color: C.mut, marginTop: 8 }}>
                Plan sugerido: {detailDay.plannedLabel || "Descanso"}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: C.mut, marginTop: 8 }}>Sin sesión ese día.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Test de salto vertical semanal ─── */
function jumpBaseline() {
  const history = store.get("jump_history", []);
  const last3 = history.slice(-3);
  if (!last3.length) return null;
  return last3.reduce((a, j) => a + j.height, 0) / last3.length;
}
function bestJump() {
  const history = store.get("jump_history", []);
  return history.length ? Math.max(...history.map((j) => j.height)) : null;
}

function JumpTestCard() {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState("");
  const [justRecord, setJustRecord] = useState(false);
  const [, setTick] = useState(0);
  const history = store.get("jump_history", []);
  const baseline = jumpBaseline();
  const best = bestJump();

  const save = () => {
    const height = parseFloat(value);
    if (!(height > 0)) return;
    const isRecord = best !== null && height > best;
    const next = [...history, { date: Date.now(), height }].slice(-30);
    store.set("jump_history", next);
    setValue("");
    setShowInput(false);
    setTick((n) => n + 1);
    setJustRecord(isRecord);
  };

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 800 }}>🦘 Test de salto vertical</p>
      {best !== null && <p style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>Récord: {best}cm{baseline ? ` · Promedio reciente: ${Math.round(baseline)}cm` : ""}</p>}
      {justRecord && <p className="pop" style={{ fontSize: 13, fontWeight: 800, color: C.yellow, marginTop: 6 }}>🏆 ¡Nuevo récord de salto!</p>}
      {showInput ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input className="input" type="number" placeholder="cm" value={value} onChange={(e) => setValue(e.target.value)} style={{ padding: 10, fontSize: 16 }} />
          <button className="btn-xl" onClick={save} style={{ width: 100, minHeight: 44, background: C.cyan, color: "#07070C" }}>Guardar</button>
        </div>
      ) : (
        <button className="btn-xl btn-physics" onClick={() => setShowInput(true)} style={{ marginTop: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
          Registrar salto de hoy
        </button>
      )}
    </div>
  );
}

function acwrRecommendation(ratio) {
  if (ratio > 1.5) {
    return {
      action: "Sesión ligera o descanso activo hoy",
      detail: "Tu carga de esta semana supera mucho tu promedio. Entrenar duro hoy aumenta el riesgo de lesión. Considera movilidad o descanso.",
    };
  }
  if (ratio > 1.3) {
    return {
      action: "Reduce intensidad un 20% hoy",
      detail: "Carga alta pero manejable. Mismo entrenamiento, menos peso o menos series.",
    };
  }
  if (ratio < 0.8) {
    return {
      action: "Puedes aumentar la carga esta semana",
      detail: "Tu cuerpo está entrenando menos de lo habitual. Buen momento para añadir una sesión o subir la intensidad.",
    };
  }
  return {
    action: "Carga óptima — sigue igual",
    detail: "Estás en la zona de progreso sin riesgo de sobreentrenamiento.",
  };
}

// eslint-disable-next-line no-unused-vars -- ya no se usa en Home; se deja disponible para Progreso
function AcwrCard({ sessions }) {
  const [expanded, setExpanded] = useState(false);
  const ratio = useMemo(() => calcACWR(sessions), [sessions]);
  if (ratio === null) return null;
  const info = acwrInfo(ratio);
  const rec = acwrRecommendation(ratio);
  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="card"
      style={{
        marginTop: 12, width: "100%", textAlign: "left", padding: "12px 14px",
        border: `1px solid ${info.color}55`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>📊 Carga semanal</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: info.color }}>{info.label}</span>
      </div>
      <p style={{ fontSize: 12, color: C.text, fontWeight: 700, marginTop: 6 }}>→ {rec.action}</p>
      {expanded && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{rec.detail}</p>
          <p style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
            Ratio Agudo/Crónico: compara lo que entrenaste esta semana vs tu promedio de 4 semanas.
          </p>
          <p style={{ fontSize: 10, color: C.dim, marginTop: 6, fontStyle: "italic" }}>
            ACWR {ratio.toFixed(2)} · Zona óptima: 0.8 — 1.3
          </p>
        </div>
      )}
    </button>
  );
}

function PlanPeriodizationCard({ sessions }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const weekNumber = getPlanWeekNumber();
  if (!weekNumber) return null;

  if (weekNumber > 12) {
    const start = new Date(store.get("plan_start"));
    const cycleSessions = sessions.filter((s) => s.kind === "entreno" && s.ts >= start.getTime());
    const records = computeRecords(sessions).filter((r) => r.ts >= start.getTime());
    const volume = Math.round(cycleSessions.reduce((a, s) => a + sessionVolume(s), 0));
    return (
      <div className="card pop" style={{ marginTop: 12, textAlign: "center", borderColor: C.yellow, background: "rgba(255,214,0,0.06)" }}>
        <div style={{ fontSize: 34 }}>🏆</div>
        <p style={{ fontSize: 15, fontWeight: 900, color: C.yellow, marginTop: 4 }}>CICLO COMPLETO</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, textAlign: "left" }}>
          <p style={{ fontSize: 12, color: C.mut }}>Sesiones completadas: <strong style={{ color: C.text }}>{cycleSessions.length}</strong></p>
          <p style={{ fontSize: 12, color: C.mut }}>Récords batidos: <strong style={{ color: C.text }}>{records.length}</strong></p>
          <p style={{ fontSize: 12, color: C.mut }}>Volumen total acumulado: <strong style={{ color: C.text }}>{formatVolume(volume)}</strong></p>
        </div>
        <p style={{ fontSize: 12, color: C.text, marginTop: 12, fontWeight: 700 }}>¿Empezar nuevo ciclo de 12 semanas?</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            className="btn-xl" onClick={() => { store.set("plan_start", new Date().toISOString()); store.set("plan_last_phase", null); refresh(); }}
            style={{ background: C.yellow, color: "#07070C", fontSize: 13 }}
          >
            Empezar nuevo ciclo
          </button>
          <button
            className="btn-xl" onClick={() => { store.set("plan_start", null); refresh(); }}
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 13 }}
          >
            No por ahora
          </button>
        </div>
      </div>
    );
  }

  const phaseId = getPlanPhase(weekNumber);
  const phase = PERIODIZATION[phaseId];
  return (
    <div className="card" style={{ marginTop: 12, borderColor: `${phase.color}66` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p style={{ fontSize: 13, fontWeight: 800 }}>📅 Tu Plan — Semana {weekNumber}/12</p>
        <span style={{ fontSize: 11, fontWeight: 800, color: phase.color }}>{PERIODIZATION_LABELS[phaseId]}</span>
      </div>
      <div style={{ height: 6, background: C.surface, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 8 }}>
        <div style={{ height: "100%", width: `${Math.min(100, (weekNumber / 12) * 100)}%`, background: phase.color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
      <p style={{ fontSize: 12, color: C.mut, marginTop: 8 }}>{phase.desc}</p>
      <p style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Foco: {phase.focus}</p>
    </div>
  );
}

/* ─── Splash screen inicial ─── */
const MOTIVATIONAL_QUOTES = [
  "El límite solo existe en tu cabeza.",
  "Hoy entrenas. Mañana dominas.",
  "Cada rep te acerca más al tope.",
  "La disciplina supera al talento.",
  "No hay atajos. Solo trabajo.",
  "Tu único competidor eres tú de ayer.",
  "Los campeones entrenan cuando nadie los ve.",
  "La grandeza se construye en silencio.",
];

function Splash({ onDone }) {
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const hasName = !!store.get("name", "");
    const duration = hasName ? 800 : 1500;
    const fadeTimer = setTimeout(() => setFadingOut(true), Math.max(duration - 300, 0));
    const doneTimer = setTimeout(onDone, duration);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`splash-bg ${fadingOut ? "splash-out" : ""}`}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
      }}
    >
      <div
        style={{
          position: "absolute", width: 120, height: 120, borderRadius: "50%",
          background: "#00E5FF", filter: "blur(40px)", opacity: 0.15,
          animation: "particleFloat 3s ease-in-out infinite",
        }}
      />
      <div className="splash-f" style={{ fontSize: 80, fontWeight: 900, color: "#00E5FF", lineHeight: 1 }}>F</div>
      <div className="splash-fade" style={{ fontSize: 14, letterSpacing: 8, color: "#00E5FF", animationDelay: "300ms" }}>
        F.A.S.E.
      </div>
      <p className="splash-fade" style={{ fontSize: 12, color: C.mut, textAlign: "center", padding: "0 30px", animationDelay: "600ms" }}>
        {quote}
      </p>
      <div style={{ position: "absolute", bottom: 40, width: 120, height: 3, background: "#1a1a2e", borderRadius: 99, overflow: "hidden" }}>
        <div className="splash-bar-fill" style={{ height: "100%", background: "#00E5FF", borderRadius: 99 }} />
      </div>
    </div>
  );
}

/* ─── Estado vacío diseñado, con ilustración SVG ─── */
function EmptyState({ icon, title, subtitle, color = C.cyan }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, filter: `drop-shadow(0 0 12px ${color}25)` }}>
        {icon}
      </div>
      <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{title}</div>
      {subtitle && <div style={{ color: C.mut, fontSize: 13, marginTop: 8 }}>{subtitle}</div>}
    </div>
  );
}

function EmptyHistoryIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <rect x="8" y="52" width="12" height="20" rx="3" fill="#00E5FF" opacity="0.3" />
      <rect x="26" y="38" width="12" height="34" rx="3" fill="#00E5FF" opacity="0.5" />
      <rect x="44" y="24" width="12" height="48" rx="3" fill="#00E5FF" opacity="0.7" />
      <rect x="62" y="10" width="12" height="62" rx="3" fill="#00E5FF" opacity="1" />
      <line x1="4" y1="74" x2="76" y2="74" stroke="#2a2a3e" strokeWidth="2" />
      <text x="68" y="8" fontSize="10" textAnchor="middle" opacity="0.8">⭐</text>
    </svg>
  );
}

function EmptyRecordsIllustration() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100">
      <path d="M20,10 h40 v30 a20,20 0 0,1 -40,0 z" fill="none" stroke="#4E4E70" strokeWidth="2" />
      <line x1="40" y1="60" x2="40" y2="75" stroke="#4E4E70" strokeWidth="2" />
      <rect x="25" y="75" width="30" height="8" rx="4" fill="#4E4E70" />
      <rect x="32" y="30" width="16" height="12" rx="3" fill="#FFD600" opacity="0.8" />
      <path d="M35,30 a5,5 0 0,1 10,0" fill="none" stroke="#FFD600" strokeWidth="2" opacity="0.8" />
    </svg>
  );
}

function EmptyProgressIllustration() {
  return (
    <svg width="140" height="90" viewBox="0 0 140 90">
      <polygon points="70,10 10,85 130,85" fill="none" stroke="#2a2a3e" strokeWidth="2" />
      <polygon points="70,10 40,55 100,55" fill="#1a1a2e" />
      <line x1="70" y1="10" x2="70" y2="30" stroke="#00E5FF" strokeWidth="2" />
      <polygon points="70,10 90,18 70,26" fill="#00E5FF" />
      <text x="70" y="72" fontSize="20" textAnchor="middle" opacity="0.4">⭐</text>
    </svg>
  );
}

/* ─── Skeleton loader ─── */
function SkeletonCard({ lines = 2, height = 60 }) {
  return (
    <div className="card" style={{ position: "relative", height, overflow: "hidden" }}>
      <div className="skeleton" />
      <div style={{ position: "relative", opacity: 0 }}>
        {Array.from({ length: lines }).map((_, i) => <div key={i}>&nbsp;</div>)}
      </div>
    </div>
  );
}

/* ─── Iconos SVG de navegación (reemplazan emojis) ─── */
function IconHome({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 200ms ease" }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}
function IconTrain({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 200ms ease" }}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  );
}
function IconProgress({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 200ms ease" }}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
/* ─── Ripple + glow táctil, aplicado por delegación a .card/.btn-xl/.chip/.tab ─── */
function createRipple(target, clientX, clientY, color) {
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = clientX - rect.left - size / 2;
  const y = clientY - rect.top - size / 2;
  const ripple = document.createElement("span");
  ripple.className = "ripple-el";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.background = color;
  ripple.style.opacity = "0.15";
  if (!target.style.position) target.style.position = "relative";
  target.style.overflow = "hidden";
  target.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

function useGlobalTouchEffects() {
  useEffect(() => {
    const onPointerDown = (e) => {
      const rippleTarget = e.target.closest(".card, .btn-xl, .chip, .tab");
      if (!rippleTarget) return;
      createRipple(rippleTarget, e.clientX, e.clientY, C.cyan);
      const glowTarget = e.target.closest(".card, .btn-xl, .chip");
      if (!glowTarget) return;
      glowTarget.style.transition = "border-color 150ms ease, box-shadow 150ms ease";
      glowTarget.style.borderColor = `${C.cyan}80`;
      glowTarget.style.boxShadow = `0 0 12px ${C.cyan}30`;
      clearTimeout(glowTarget._glowTimer);
      glowTarget._glowTimer = setTimeout(() => {
        glowTarget.style.transition = "border-color 300ms ease, box-shadow 300ms ease";
        glowTarget.style.borderColor = "";
        glowTarget.style.boxShadow = "";
      }, 150);
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
}

/* ─── Fondo de partículas sutiles (solo pantalla Inicio) ─── */
function ParticleBackground() {
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1.5,
      opacity: Math.random() * 0.05 + 0.03,
      duration: Math.random() * 15 + 20,
      delay: Math.random() * -20,
      variant: i % 6,
    }))
  );
  return (
    <div className="particle-field" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity,
            animation: `float-${p.variant} ${p.duration}s ease-in-out infinite`, animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Calentamiento y enfriamiento (no se registran en el historial) ─── */
function warmupKeyFor(discId) {
  if (discId === "gimnasio") return "gimnasio";
  if (discId === "calistenia") return "calistenia";
  if (discId?.startsWith("futbol")) return "futbol";
  if (discId?.startsWith("basquet")) return "basquet";
  if (discId === "atletismo") return "atletismo";
  if (discId === "cuerpo") return "cuerpo";
  return "calistenia";
}

const WARMUP_ROUTINES = {
  gimnasio: [
    { name: "Movilidad de hombros (círculos adelante y atrás)", mode: "tiempo", duration: 30 },
    { name: "Sentadilla de calentamiento con peso corporal", mode: "reps", reps: 20 },
    { name: "Rotaciones de cadera (cada lado)", mode: "tiempo", duration: 30 },
    { name: "Puente de glúteos", mode: "reps", reps: 15 },
    { name: "Jumping jacks o saltos suaves", mode: "tiempo", duration: 45 },
  ],
  calistenia: [
    { name: "Rotaciones de muñeca y hombro", mode: "tiempo", duration: 30 },
    { name: "Circles de hombro en barra o sin barra", mode: "reps", reps: 20 },
    { name: "Sentadilla profunda sostenida", mode: "tiempo", duration: 30 },
    { name: "Flexiones lentas de calentamiento (muy despacio)", mode: "reps", reps: 5 },
    { name: "Skipping en el lugar", mode: "tiempo", duration: 45 },
  ],
  futbol: [
    { name: "Trote suave en el lugar", mode: "tiempo", duration: 45 },
    { name: "Rotaciones de tobillo (20 por pie)", mode: "reps", reps: 20 },
    { name: "Skipping alto", mode: "tiempo", duration: 30 },
    { name: "Apertura y cierre de cadera lateral (cada lado)", mode: "reps", reps: 15 },
    { name: "Sprint al 50% — 20m x 3", mode: "reps", reps: 3 },
  ],
  atletismo: [
    { name: "Trote muy suave", mode: "tiempo", duration: 180 },
    { name: "Skipping A (rodillas al frente)", mode: "tiempo", duration: 30 },
    { name: "Skipping B (talones atrás)", mode: "tiempo", duration: 30 },
    { name: "Zancadas dinámicas caminando (cada pierna)", mode: "reps", reps: 10 },
    { name: "Aceleraciones progresivas al 60% (20m)", mode: "reps", reps: 3 },
  ],
  basquet: [
    { name: "Trote suave en el lugar", mode: "tiempo", duration: 45 },
    { name: "Rotaciones de tobillo (20 por pie)", mode: "reps", reps: 20 },
    { name: "Deslizamientos defensivos suaves", mode: "tiempo", duration: 30 },
    { name: "Círculos de hombro (para el tiro)", mode: "reps", reps: 15 },
    { name: "Saltos suaves de tobillo", mode: "tiempo", duration: 30 },
  ],
  cuerpo: [
    { name: "Respiración diafragmática", mode: "reps", reps: 5 },
    { name: "Gato-camello en cuadrupedia", mode: "reps", reps: 10 },
    { name: "Apertura torácica en el suelo (cada lado)", mode: "reps", reps: 8 },
    { name: "Rotaciones de cuello suaves (cada lado)", mode: "reps", reps: 10 },
    { name: "Estiramiento de cadena posterior", mode: "tiempo", duration: 30 },
  ],
};

const COOLDOWN_ROUTINES = {
  gimnasio: [
    { name: "Estiramiento de pecho (marco de puerta o brazos abiertos)", mode: "tiempo", duration: 45 },
    { name: "Estiramiento de espalda (abrazo de rodillas al pecho)", mode: "tiempo", duration: 45 },
    { name: "Estiramiento de cuádriceps de pie (cada pierna)", mode: "tiempo", duration: 30 },
  ],
  calistenia: [
    { name: "Estiramiento de hombros cruzado al pecho (cada lado)", mode: "tiempo", duration: 30 },
    { name: "Flexión hacia adelante — tocar puntas de pies", mode: "tiempo", duration: 45 },
    { name: "Postura del niño (child's pose)", mode: "tiempo", duration: 60 },
  ],
  futbol: [
    { name: "Estiramiento de isquiotibiales sentado", mode: "tiempo", duration: 45 },
    { name: "Estiramiento de cadera — figura 4 (cada lado)", mode: "tiempo", duration: 30 },
    { name: "Pantorrilla contra pared (cada pierna)", mode: "tiempo", duration: 30 },
  ],
  atletismo: [
    { name: "Estiramiento de isquiotibiales sentado", mode: "tiempo", duration: 45 },
    { name: "Estiramiento de cadera — figura 4 (cada lado)", mode: "tiempo", duration: 30 },
    { name: "Pantorrilla contra pared (cada pierna)", mode: "tiempo", duration: 30 },
  ],
  basquet: [
    { name: "Estiramiento de hombros y muñecas", mode: "tiempo", duration: 30 },
    { name: "Estiramiento de isquiotibiales sentado", mode: "tiempo", duration: 45 },
    { name: "Pantorrilla contra pared (cada pierna)", mode: "tiempo", duration: 30 },
  ],
  cuerpo: [
    { name: "Savasana — tumbado relajado", mode: "tiempo", duration: 60 },
    { name: "Respiración 4-7-8", mode: "reps", reps: 4 },
    { name: "Estiramiento suave de cuello (cada lado)", mode: "tiempo", duration: 30 },
  ],
};

/* Flujo guiado genérico (un ejercicio a la vez): usado por calentamiento y enfriamiento */
/* ─── Respiración guiada pre-sesión (2 ciclos de 14s: inhala/mantén/exhala/descansa) ─── */
const BREATH_PHASES = [
  { key: "inhala", label: "Inhala", duration: 4000, color: "#00E5FF", fontSize: 18 },
  { key: "manten", label: "Mantén", duration: 4000, color: "#F2F2F8", fontSize: 16 },
  { key: "exhala", label: "Exhala", duration: 4000, color: "#60A5FA", fontSize: 18 },
  { key: "descansa", label: "Descansa", duration: 2000, color: "#8A8AAD", fontSize: 14 },
];

function BreathingScreen({ onDone, voiceOn }) {
  const [step, setStep] = useState(0);
  const totalSteps = BREATH_PHASES.length * 2;
  const showReady = step >= totalSteps;
  const phase = BREATH_PHASES[step % BREATH_PHASES.length];
  const cycle = Math.min(2, Math.floor(step / BREATH_PHASES.length) + 1);

  useEffect(() => {
    if (showReady) {
      const t = setTimeout(onDone, 1000);
      return () => clearTimeout(t);
    }
    if (voiceOn) {
      try {
        const u = new SpeechSynthesisUtterance(`${phase.label.toLowerCase()}...`);
        u.lang = "es-ES"; u.rate = 0.7; u.pitch = 0.9;
        window.speechSynthesis.speak(u);
      } catch { /* voz no disponible */ }
    }
    const t = setTimeout(() => setStep((s) => s + 1), phase.duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (showReady) {
    return (
      <div className="fade-up" style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", background: "#07070C" }}>
        <p style={{ fontSize: 20, fontWeight: 900, color: C.green }}>Sistema nervioso listo ⚡</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", background: "#07070C" }}>
      <button onClick={onDone} style={{ position: "absolute", top: 16, right: 16, fontSize: 12, color: C.dim, fontWeight: 700 }}>Saltar →</button>
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle
          cx="100" cy="100" r="60" fill="none" stroke="#00E5FF" strokeWidth="2"
          style={{ animation: "breathe 14s ease-in-out infinite", filter: "drop-shadow(0 0 20px #00E5FF40)" }}
        />
        <circle cx="100" cy="100" r="40" fill="#00E5FF08" style={{ animation: "breatheInner 14s ease-in-out infinite" }} />
        <text x="100" y="95" textAnchor="middle" fontSize={phase.fontSize} fontWeight="800" fill={phase.color}>{phase.label}</text>
      </svg>
      <p style={{ fontSize: 12, color: C.dim, marginTop: 20 }}>Ciclo {cycle} de 2</p>
    </div>
  );
}

/* Overlay compacto de 10s al iniciar la primera serie (alternativa ligera a BreathingScreen completa) */
function QuickBreath({ onDone }) {
  const [secs, setSecs] = useState(10);

  useEffect(() => {
    if (secs <= 0) { onDone(); return undefined; }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, onDone]);

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "rgba(7,7,12,0.85)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 50, borderRadius: 16,
      }}
    >
      <div
        style={{
          width: 80, height: 80, borderRadius: "50%", border: `3px solid ${C.cyan}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "breathe 4s ease-in-out infinite",
        }}
      >
        <span style={{ fontSize: 28 }}>💨</span>
      </div>
      <p style={{ color: C.cyan, fontWeight: 800, fontSize: 16, marginTop: 16 }}>Respira profundo</p>
      <p style={{ color: C.mut, fontSize: 13, marginTop: 6 }}>Empieza en {secs}s</p>
      <button onClick={onDone} style={{ marginTop: 16, color: C.dim, fontSize: 12, fontWeight: 600 }}>Saltar →</button>
    </div>
  );
}

/* ─── Selector rápido de RPE tras cada serie exitosa ─── */
const RPE_COLORS = { 6: C.green, 7: "#8BC34A", 8: C.yellow, 9: C.orange, 10: C.red };

// eslint-disable-next-line no-unused-vars -- ya no se usa en RpeOverlay; se deja disponible para uso interno
const TECHNIQUE_CHIPS = [
  { id: 3, emoji: "✅", label: "Perfecta", color: C.green },
  { id: 2, emoji: "⚡", label: "Bien", color: C.cyan },
  { id: 1, emoji: "⚠️", label: "Fallo", color: C.yellow },
];

function RpeOverlay({ rpeFor, onPick }) {
  if (!rpeFor) return null;
  return (
    <div className="card fade-up" style={{ position: "fixed", left: 12, right: 12, bottom: 90, zIndex: 150, maxWidth: 430, margin: "0 auto" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.mut, textAlign: "center" }}>¿Qué tan difícil fue?</p>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {[6, 7, 8, 9, 10].map((v) => (
          <button
            key={v} onClick={() => onPick(rpeFor.exIdx, rpeFor.setIdx, v)}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontWeight: 800, fontSize: 13, background: RPE_COLORS[v], color: "#07070C" }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function GuidedMiniFlow({ title, subtitle, color, exercises, onDone }) {
  const [idx, setIdx] = useState(0);

  const advance = () => {
    if (idx + 1 >= exercises.length) onDone();
    else setIdx((i) => i + 1);
  };

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 24 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>{title}</p>
      <p className="muted" style={{ marginTop: 2 }}>{subtitle}</p>
      <GuidedStep key={idx} ex={exercises[idx]} index={idx} total={exercises.length} color={color} onAdvance={advance} />
      <button onClick={onDone} style={{ marginTop: 16, color: C.dim, fontSize: 12, fontWeight: 600 }}>Saltar el resto</button>
    </div>
  );
}

/* Un paso del flujo guiado; se remonta (key={idx}) al cambiar de ejercicio para reiniciar su propio timer */
function GuidedStep({ ex, index, total, color, onAdvance }) {
  const [secondsLeft, setSecondsLeft] = useState(ex.mode === "tiempo" ? ex.duration : 0);
  const [running, setRunning] = useState(false);
  const secRef = useRef(secondsLeft);

  useEffect(() => {
    if (!running || ex.mode !== "tiempo") return undefined;
    const t = setInterval(() => {
      secRef.current -= 1;
      if (secRef.current <= 0) {
        tripleBeep();
        setRunning(false);
        setSecondsLeft(0);
        onAdvance();
      } else {
        setSecondsLeft(secRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return (
    <div className="card" style={{ marginTop: 20, padding: "26px 16px" }}>
      <p style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{index + 1} / {total}</p>
      <p style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{ex.name}</p>
      {ex.mode === "tiempo" ? (
        <>
          <div style={{ fontSize: 42, fontWeight: 900, marginTop: 14, color, fontVariantNumeric: "tabular-nums" }}>{secondsLeft}s</div>
          {!running ? (
            <button className="btn-xl" onClick={() => setRunning(true)} style={{ marginTop: 14, background: color, color: "#07070C" }}>▶ Empezar</button>
          ) : (
            <button className="btn-xl" onClick={onAdvance} style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>Siguiente ›</button>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 14, color }}>{ex.reps} reps</div>
          <button className="btn-xl" onClick={onAdvance} style={{ marginTop: 14, background: color, color: "#07070C" }}>✓ Listo</button>
        </>
      )}
    </div>
  );
}

/* ─── Celebración específica por disciplina (pantalla de felicitaciones) ─── */
function DisciplineCelebration({ discId }) {
  const style = { margin: "8px auto 0", display: "block" };
  if (discId === "gimnasio") {
    return (
      <svg width="120" height="60" viewBox="0 0 120 60" className="celebrate-gimnasio" style={style}>
        <rect x="20" y="28" width="80" height="4" rx="2" fill="#00E5FF" />
        <rect x="10" y="18" width="12" height="24" rx="3" fill="#4E4E70" />
        <rect x="98" y="18" width="12" height="24" rx="3" fill="#4E4E70" />
      </svg>
    );
  }
  if (discId === "atletismo") {
    return (
      <svg width="120" height="70" viewBox="0 0 120 70" className="celebrate-atletismo" style={style}>
        <line x1="100" y1="10" x2="100" y2="65" stroke="#FFD600" strokeWidth="2" strokeDasharray="4,3" />
        <circle cx="60" cy="20" r="7" fill="none" stroke="#00E5FF" strokeWidth="2" />
        <line x1="60" y1="27" x2="60" y2="45" stroke="#00E5FF" strokeWidth="2" />
        <line x1="60" y1="33" x2="50" y2="28" stroke="#00E5FF" strokeWidth="2" />
        <line x1="60" y1="33" x2="72" y2="40" stroke="#00E5FF" strokeWidth="2" />
        <line x1="60" y1="45" x2="48" y2="60" stroke="#00E5FF" strokeWidth="2" />
        <line x1="60" y1="45" x2="70" y2="58" stroke="#00E5FF" strokeWidth="2" />
      </svg>
    );
  }
  if (discId === "calistenia") {
    return (
      <svg width="80" height="70" viewBox="0 0 80 70" className="celebrate-calistenia" style={style}>
        <line x1="15" y1="10" x2="65" y2="10" stroke="#4E4E70" strokeWidth="3" />
        <circle cx="40" cy="24" r="6" fill="none" stroke="#22FF88" strokeWidth="2" />
        <line x1="40" y1="10" x2="40" y2="30" stroke="#22FF88" strokeWidth="2" />
        <line x1="40" y1="18" x2="28" y2="12" stroke="#22FF88" strokeWidth="2" />
        <line x1="40" y1="18" x2="52" y2="12" stroke="#22FF88" strokeWidth="2" />
        <line x1="40" y1="30" x2="32" y2="45" stroke="#22FF88" strokeWidth="2" />
        <line x1="40" y1="30" x2="48" y2="45" stroke="#22FF88" strokeWidth="2" />
      </svg>
    );
  }
  if (discId?.startsWith("futbol")) {
    return (
      <svg width="100" height="60" viewBox="0 0 100 60" className="celebrate-futbol" style={style}>
        <path d="M75,10 v40 h20 M75,20 h15 M75,35 h15" fill="none" stroke="#4E4E70" strokeWidth="2" />
        <circle cx="35" cy="30" r="10" fill="none" stroke="#FF7A2F" strokeWidth="2" />
        <path d="M35,22 l4,6 -4,6 -4,-6z" fill="#FF7A2F" opacity="0.6" />
      </svg>
    );
  }
  if (discId?.startsWith("basquet")) {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" className="celebrate-basquet" style={style}>
        <circle cx="40" cy="40" r="18" fill="none" stroke="#A855F7" strokeWidth="2.5" />
        <line x1="22" y1="40" x2="58" y2="40" stroke="#A855F7" strokeWidth="1.5" />
        <path d="M40,22 v36 M26,26 q14,14 0,28 M54,26 q-14,14 0,28" fill="none" stroke="#A855F7" strokeWidth="1.5" />
      </svg>
    );
  }
  if (discId === "cuerpo") {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" className="celebrate-cuerpo" style={style}>
        <circle cx="40" cy="40" r="30" fill="none" stroke="#B084FF" strokeWidth="2" opacity="0.5" />
        <circle cx="40" cy="22" r="6" fill="none" stroke="#B084FF" strokeWidth="2" />
        <path d="M28,55 q12,-14 24,0" fill="none" stroke="#B084FF" strokeWidth="2" />
      </svg>
    );
  }
  return null;
}

/* ─── Objetivos de entrenamiento (afectan volumen, descansos y copy) ─── */
const TRAINING_GOALS = [
  { id: "muscle", emoji: "💪", name: "Ganar músculo", subtitle: "Hipertrofia máxima", desc: "Más volumen, reps moderadas, superávit calórico recomendado.", color: "#22FF88", params: { repsRange: [8, 12], setsMultiplier: 1.2, restSeconds: 75 } },
  { id: "strength", emoji: "🏋️", name: "Ganar fuerza", subtitle: "Fuerza máxima", desc: "Pocas reps, mucho peso, descansos largos. Los básicos.", color: "#FF6B2B", params: { repsRange: [3, 6], setsMultiplier: 1.0, restSeconds: 180 } },
  { id: "recomposition", emoji: "⚖️", name: "Recomposición", subtitle: "Músculo + perder grasa", desc: "Mantener o ganar músculo mientras pierdes grasa. Proceso más lento pero sostenible.", color: "#00E5FF", params: { repsRange: [8, 15], setsMultiplier: 1.0, restSeconds: 60 } },
  { id: "fat_loss", emoji: "🔥", name: "Perder grasa", subtitle: "Definición y quema", desc: "Alta frecuencia, circuitos, menos descanso. Mantener músculo mientras se pierde grasa.", color: "#FF3B5C", params: { repsRange: [12, 20], setsMultiplier: 0.9, restSeconds: 45 } },
  { id: "athletic", emoji: "⚡", name: "Rendimiento atlético", subtitle: "Velocidad, potencia, agilidad", desc: "Para deportistas. Fuerza explosiva, velocidad y resistencia específica.", color: "#FFD600", params: { repsRange: [3, 8], setsMultiplier: 1.0, restSeconds: 120 } },
  { id: "health", emoji: "🌱", name: "Salud general", subtitle: "Bienestar y longevidad", desc: "Ejercicio moderado, movilidad, consistencia. Para sentirse bien a largo plazo.", color: "#86EFAC", params: { repsRange: [10, 15], setsMultiplier: 0.8, restSeconds: 90 } },
  { id: "endurance", emoji: "🏃", name: "Resistencia", subtitle: "Cardio y aguante", desc: "Para corredores y deportes de fondo. Resistencia cardiovascular y muscular.", color: "#FDE68A", params: { repsRange: [15, 25], setsMultiplier: 0.9, restSeconds: 45 } },
  { id: "aesthetics", emoji: "🎨", name: "Estética / Físico", subtitle: "Forma, proporción y definición", desc: "Entrenar para verse bien. Zonas específicas, proporción y definición muscular.", color: "#A855F7", params: { repsRange: [10, 15], setsMultiplier: 1.1, restSeconds: 60 } },
];

/* ─── Enfoques estéticos de Gimnasio (prioridades de rutina) ─── */
const GYM_WORKOUT_TYPES = [
  { id: "push", name: "Push", emoji: "💪", desc: "Pecho, hombros y tríceps", muscles: ["Pecho", "Hombros", "Tríceps"] },
  { id: "pull", name: "Pull", emoji: "🏋️", desc: "Espalda y bíceps", muscles: ["Espalda", "Bíceps"] },
  { id: "legs", name: "Legs", emoji: "🦵", desc: "Piernas y glúteos", muscles: ["Cuádriceps", "Isquiotibiales", "Glúteos", "Gemelos"] },
  { id: "upper", name: "Upper Body", emoji: "🔝", desc: "Todo el tren superior", muscles: ["Pecho", "Espalda", "Hombros", "Brazos"] },
  { id: "lower", name: "Lower Body", emoji: "⬇️", desc: "Todo el tren inferior", muscles: ["Piernas", "Glúteos", "Core"] },
  { id: "full_body", name: "Full Body", emoji: "🔄", desc: "Todo el cuerpo en una sesión", muscles: ["Pecho", "Espalda", "Piernas", "Hombros", "Core"] },
  { id: "glutes_focus", name: "Glúteos y forma", emoji: "🍑", desc: "Hip thrust, sentadilla búlgara, abducción", muscles: ["Glúteos", "Isquiotibiales", "Aductores"] },
  { id: "v_shape", name: "Forma en V", emoji: "🔺", desc: "Espalda ancha y hombros", muscles: ["Espalda", "Hombros", "Core"] },
  { id: "arms", name: "Brazos", emoji: "💪", desc: "Bíceps y tríceps (sesión dedicada)", muscles: ["Bíceps", "Tríceps", "Antebrazos"], minLevel: "campeon" },
  { id: "core", name: "Core y abdomen", emoji: "🔥", desc: "Abdomen, oblicuos y estabilidad", muscles: ["Core", "Oblicuos", "Lumbar"] },
];

/* Chips de trabajo extra disponibles según el tipo de rutina elegido (músculos no cubiertos) */
const EXTRA_MUSCLE_OPTIONS = {
  push: [{ id: "core", label: "Core" }, { id: "brazos", label: "Bíceps" }, { id: "espalda", label: "Trapecio" }],
  pull: [{ id: "core", label: "Core" }, { id: "pecho", label: "Pecho" }],
  legs: [{ id: "core", label: "Core" }, { id: "espalda", label: "Espalda baja" }],
  upper: [{ id: "core", label: "Core" }],
  lower: [{ id: "espalda", label: "Espalda baja" }],
  full_body: [],
  glutes_focus: [{ id: "core", label: "Core" }],
  v_shape: [{ id: "brazos", label: "Brazos" }],
  arms: [{ id: "core", label: "Core" }],
  core: [{ id: "espalda", label: "Espalda baja" }],
};

/* Reordena/ajusta la rutina de gimnasio según el enfoque estético elegido (ya no configurable desde la UI; queda inactivo mientras "gym_focus" no se setee) */
function applyGymFocusToExercises(exercises, focusId) {
  if (!focusId) return exercises;
  let out = [...exercises];
  const findByName = (needle) => out.find((e) => e.name.toLowerCase().includes(needle));
  const bringFirst = (needles) => {
    for (const needle of needles) {
      const ex = findByName(needle);
      if (ex) { out = [ex, ...out.filter((e) => e !== ex)]; return true; }
    }
    return false;
  };
  if (focusId === "v_shape") {
    bringFirst(["jalón al pecho agarre ancho", "dominadas agarre ancho", "jalón al pecho", "dominadas"]);
  } else if (focusId === "glutes" || focusId === "glutes_focus") {
    bringFirst(["hip thrust"]);
  } else if (focusId === "definition") {
    out = out.map((e) => ({ ...e, rest: Math.min(e.rest, 45) }));
  } else if (focusId === "strength_focus") {
    const compounds = out.filter((e) => classifyExerciseOrder(e.name).startsWith("compound"));
    out = (compounds.length >= 3 ? compounds : out).map((e) => ({ ...e, sets: Math.max(4, e.sets), rest: Math.max(180, e.rest) }));
  }
  return out;
}

function getTrainingGoal() {
  const id = store.get("training_goal", null);
  return TRAINING_GOALS.find((g) => g.id === id) || null;
}

/* Copy contextual según el objetivo activo (plan del día y banner de inicio de sesión) */
const GOAL_CONTEXT_COPY = {
  fat_loss: "Alta intensidad. Pocos descansos. 🔥",
  strength: "Pesado y técnico. Descansa bien. 💀",
  muscle: "Siente el músculo en cada rep. 💪",
  athletic: "Velocidad y potencia. CNS activo. ⚡",
  health: "Movimiento como medicina. 🌱",
  endurance: "Ritmo sostenido. Respira. 🏃",
  aesthetics: "Contracción consciente. Forma. 🎨",
  recomposition: "Músculo en, grasa fuera. ⚖️",
};
function goalContextCopy() {
  const goal = getTrainingGoal();
  if (!goal) return null;
  if (goal.id === "aesthetics" && store.get("gym_focus", null) === "glutes") return "Activa glúteo en cada ejercicio. 🍑";
  if (goal.id === "aesthetics" && store.get("gym_focus", null) === "v_shape") return "Dorsales anchos, hombros grandes. 🔺";
  return GOAL_CONTEXT_COPY[goal.id] || null;
}

/* Principio de especificidad: rango de reps/descanso/intensidad según el objetivo (no solo series/descanso) */
const GOAL_REP_RANGES = {
  strength: { compound: { reps: "4", rest: 180 }, assistance: { reps: "6", rest: 120 }, setsMultiplier: 0.85, intensityLabel: "85-95% 1RM" },
  hypertrophy: { compound: { reps: "8", rest: 90 }, assistance: { reps: "12", rest: 60 }, setsMultiplier: 1.0, intensityLabel: "65-85% 1RM" },
  endurance: { compound: { reps: "15", rest: 45 }, assistance: { reps: "20", rest: 30 }, setsMultiplier: 1.1, intensityLabel: "40-60% 1RM" },
  fat_loss: { compound: { reps: "12", rest: 45 }, assistance: { reps: "15", rest: 30 }, setsMultiplier: 0.9, intensityLabel: "Circuito — descanso mínimo" },
  athletic: { compound: { reps: "5", rest: 150 }, assistance: { reps: "8", rest: 90 }, setsMultiplier: 1.0, intensityLabel: "Potencia — explosivo" },
  recomposition: { compound: { reps: "10", rest: 75 }, assistance: { reps: "12", rest: 60 }, setsMultiplier: 1.0, intensityLabel: "60-75% 1RM" },
};
/* Los objetivos reales de TRAINING_GOALS se mapean a las 6 categorías científicas de arriba */
const GOAL_ID_TO_REP_RANGE = {
  strength: "strength", muscle: "hypertrophy", recomposition: "recomposition", fat_loss: "fat_loss",
  athletic: "athletic", health: "endurance", endurance: "endurance", aesthetics: "hypertrophy",
};

/* Ajusta series, reps, descanso e intensidad de una rutina de gimnasio según el objetivo activo */
function applyGoalToExercises(exercises, goalId) {
  const goalRange = GOAL_REP_RANGES[GOAL_ID_TO_REP_RANGE[goalId]];
  if (!goalRange) return exercises;
  return exercises.map((e) => {
    const isCompound = classifyExerciseOrder(e.name).startsWith("compound");
    const params = isCompound ? goalRange.compound : goalRange.assistance;
    return {
      ...e,
      sets: Math.max(1, Math.min(6, Math.round(e.sets * goalRange.setsMultiplier))),
      reps: e.type === "peso" ? params.reps : e.reps,
      rest: params.rest,
      intensity: goalRange.intensityLabel,
    };
  });
}

/* ─── Niveles de entrenamiento ─── */
const LEVELS = [
  { name: "Iniciado", emoji: "🔵", color: C.blue, desc: "Estoy comenzando" },
  { name: "Guerrero", emoji: "🟢", color: C.green, desc: "Entreno regularmente" },
  { name: "Campeón", emoji: "🟡", color: C.yellow, desc: "6+ meses de base" },
  { name: "Élite", emoji: "🟠", color: C.orange, desc: "Es mi estilo de vida" },
  { name: "Leyenda", emoji: "🔴", color: C.red, desc: "Nivel competitivo" },
  { name: "THE ONE", emoji: "⚡", color: C.purple, desc: "Sin límites" },
];

const LEVEL_POWER_COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#F97316", "#EF4444", "#A855F7"];
function PowerBar({ levelIdx }) {
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= levelIdx ? LEVEL_POWER_COLORS[levelIdx] : C.border, transition: "background 0.3s ease" }} />
      ))}
    </div>
  );
}

/* Umbrales de sesiones totales para el nivel global (Iniciado 0-4, Guerrero 5-14, Campeón 15-29, Élite 30-59, Leyenda 60-99, THE ONE 100+) */
const GLOBAL_LEVEL_THRESHOLDS = [0, 5, 15, 30, 60, 100];

/* ─── Héroes por racha (escala histórica, 12 niveles desde 0 días) ─── */
const HEROES = [
  { id: "recluta", days: 0, emoji: "🌱", name: "Recluta", quote: "El primer paso es el más difícil. Ya lo diste.", color: C.mut },
  { id: "atleta", days: 7, emoji: "🏃", name: "Atleta", quote: "Una semana de consistencia. El hábito empieza aquí.", color: C.green },
  { id: "competidor", days: 21, emoji: "💪", name: "Competidor", quote: "21 días. Tu cuerpo ya cambió aunque no lo veas.", color: C.cyan },
  { id: "avanzado", days: 45, emoji: "⚡", name: "Avanzado", quote: "45 días. Lo que era esfuerzo ahora es rutina.", color: C.yellow },
  { id: "elite", days: 90, emoji: "🔥", name: "Élite", quote: "3 meses. Estás en el 5% que sí lo hace.", color: C.orange },
  { id: "profesional", days: 180, emoji: "🏆", name: "Profesional", quote: "6 meses. Esto ya no es disciplina — es quién eres.", color: C.red },
  { id: "leyenda", days: 365, emoji: "⭐", name: "Leyenda", quote: "Un año completo. Muy pocos llegan aquí. Tú sí.", color: C.purple },
];
/* Mapa de compatibilidad para IDs de héroes guardados en localStorage antes de v30 */
const LEGACY_HERO_ID_MAP = {
  esclavo: "recluta", arquero: "atleta", legionario: "atleta", caballero: "competidor",
  ninja: "competidor", vikingo: "avanzado", espartano: "avanzado", samurai: "elite",
  gladiador: "elite", conquistador: "profesional", general: "profesional", leyenda: "leyenda",
};

/* Devuelve el héroe con days más alto que sea <= streak */
function getMascot(streak) {
  let hero = HEROES[0];
  for (const h of HEROES) if (streak >= h.days) hero = h;
  return hero;
}

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
      { id: "push", label: "Push", tags: ["pecho", "hombros", "brazos"] },
      { id: "pull", label: "Pull", tags: ["espalda", "brazos"] },
      { id: "legs", label: "Legs", tags: ["piernas", "cuadriceps", "isquios", "gemelos"] },
      { id: "upper", label: "Upper Body", tags: ["pecho", "espalda", "hombros", "brazos"] },
      { id: "lower", label: "Lower Body", tags: ["piernas", "gluteos", "core"] },
      { id: "full_body", label: "Full Body", tags: null },
      { id: "glutes_focus", label: "Glúteos y forma", tags: ["gluteos", "gluteo", "cadena_posterior"] },
      { id: "v_shape", label: "Forma en V", tags: ["espalda", "hombros"] },
      { id: "arms", label: "Brazos", tags: ["brazos"] },
      { id: "core", label: "Core y abdomen", tags: ["core"] },
    ],
  },
  futbolGym: {
    label: "Fútbol — Gimnasio",
    icon: "⚽",
    color: C.orange,
    desc: "1 hora · Fuerza aplicada al campo, por posición",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "portero", label: "🧤 Portero", tags: ["estabilidad", "salto"], desc: "Reflejos y dominio del área" },
      { id: "defensaCentral", label: "🛡️ Defensa Central", tags: ["fuerza", "salto"], desc: "Fuerza y anticipación" },
      { id: "lateral", label: "↔️ Lateral", tags: ["velocidad", "resistencia"], desc: "Velocidad y resistencia" },
      { id: "pivote", label: "⚓ Pivote/Contención", tags: ["fuerza", "estabilidad"], desc: "Control y recuperación" },
      { id: "mediocampista", label: "🎯 Mediocampista", tags: ["resistencia", "estabilidad"], desc: "Motor del equipo" },
      { id: "extremo", label: "🏃 Extremo", tags: ["velocidad", "salto"], desc: "Velocidad y 1vs1" },
      { id: "delantero", label: "⚡ Delantero", tags: ["velocidad", "fuerza"], desc: "Finalización y movimiento" },
    ],
  },
  futbolParque: {
    label: "Fútbol — Parque",
    icon: "🥅",
    color: C.yellow,
    desc: "1 hora · Velocidad y técnica con balón, por posición",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "portero", label: "🧤 Portero", tags: ["velocidad", "ritmo"], desc: "Reflejos y dominio del área" },
      { id: "defensaCentral", label: "🛡️ Defensa Central", tags: ["velocidad", "resistencia"], desc: "Fuerza y anticipación" },
      { id: "lateral", label: "↔️ Lateral", tags: ["regate", "ritmo", "velocidad"], desc: "Velocidad y resistencia" },
      { id: "pivote", label: "⚓ Pivote/Contención", tags: ["resistencia", "ritmo"], desc: "Control y recuperación" },
      { id: "mediocampista", label: "🎯 Mediocampista", tags: ["regate", "resistencia"], desc: "Motor del equipo" },
      { id: "extremo", label: "🏃 Extremo", tags: ["regate", "ritmo", "velocidad"], desc: "Velocidad y 1vs1" },
      { id: "delantero", label: "⚡ Delantero", tags: ["tiro", "regate"], desc: "Finalización y movimiento" },
    ],
  },
  basquetCancha: {
    label: "Básquetbol — Con cancha",
    icon: "🏀",
    color: "#A855F7",
    desc: "Técnica + físico completo",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "tiro", label: "Tiro", tags: ["tiro"] },
      { id: "dribleo", label: "Dribleo", tags: ["dribleo"] },
      { id: "defensa", label: "Defensa", tags: ["defensa"] },
      { id: "salto", label: "Salto", tags: ["salto"] },
      { id: "resistencia", label: "Resistencia", tags: ["resistencia"] },
    ],
  },
  basquetSinCancha: {
    label: "Básquetbol — Sin cancha",
    icon: "🏀",
    color: "#A855F7",
    desc: "Físico puro para el juego",
    focuses: [
      { id: "todo", label: "Todo", tags: null },
      { id: "fuerza", label: "Fuerza de piernas", tags: ["fuerza"] },
      { id: "salto", label: "Salto vertical", tags: ["salto"] },
      { id: "agilidad", label: "Agilidad", tags: ["agilidad"] },
      { id: "core", label: "Core", tags: ["core"] },
      { id: "resistencia", label: "Resistencia", tags: ["resistencia"] },
    ],
  },
};

/* Fútbol se presenta como una sola disciplina; internamente usa futbolGym/futbolParque */
const FUTBOL_META = { label: "Fútbol", icon: "⚽", color: C.orange, desc: "Gimnasio o parque, tú eliges" };
const FUTBOL_LOCATIONS = [
  { id: "futbolGym", emoji: "🏋️", label: "Gimnasio", desc: "Fuerza aplicada al campo" },
  { id: "futbolParque", emoji: "🌳", label: "Parque", desc: "Velocidad y técnica" },
];

/* Básquetbol se presenta como una sola disciplina; internamente usa basquetCancha/basquetSinCancha */
const BASQUET_META = { label: "Básquetbol", icon: "🏀", color: "#A855F7", desc: "Con cancha o sin cancha, tú eliges" };
const BASQUET_LOCATIONS = [
  { id: "basquetCancha", emoji: "🏀", label: "Con cancha", desc: "Tiro, dribleo y juego" },
  { id: "basquetSinCancha", emoji: "💪", label: "Sin cancha", desc: "Fuerza y explosividad" },
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
    { l: "Iniciado", t: ">14.0s" }, { l: "Guerrero", t: "13.0-14.0s" }, { l: "Campeón", t: "11.5-13.0s" },
    { l: "Élite", t: "10.8-11.5s" }, { l: "Leyenda", t: "10.2-10.8s" }, { l: "THE ONE", t: "<10.2s" },
  ],
  "1000m": [
    { l: "Iniciado", t: ">6:00 /km" }, { l: "Guerrero", t: "5:00-6:00 /km" }, { l: "Campeón", t: "4:15-5:00 /km" },
    { l: "Élite", t: "3:45-4:15 /km" }, { l: "Leyenda", t: "3:15-3:45 /km" }, { l: "THE ONE", t: "<3:15 /km" },
  ],
  "5km": [
    { l: "Iniciado", t: ">35 min" }, { l: "Guerrero", t: "28-35 min" }, { l: "Campeón", t: "22-28 min" },
    { l: "Élite", t: "18-22 min" }, { l: "Leyenda", t: "15-18 min" }, { l: "THE ONE", t: "<15 min" },
  ],
  "10km": [
    { l: "Iniciado", t: ">70 min" }, { l: "Guerrero", t: "55-70 min" }, { l: "Campeón", t: "45-55 min" },
    { l: "Élite", t: "38-45 min" }, { l: "Leyenda", t: "32-38 min" }, { l: "THE ONE", t: "<32 min" },
  ],
  maraton: [
    { l: "Iniciado", t: ">5h" }, { l: "Guerrero", t: "4-5h" }, { l: "Campeón", t: "3:30-4h" },
    { l: "Élite", t: "3-3:30h" }, { l: "Leyenda", t: "2:45-3h" }, { l: "THE ONE", t: "<2:45h" },
  ],
};

const ATLETISMO_EXDB = {
  "100m": [
    { n: "Skipping A técnico", t: "tiempo", s: 3, r: "20 m", rest: 60, lv: [0, 3], tip: "Rodilla sube a 90°. Brazos en 90°. Ritmo lento y controlado." },
    { n: "Skipping B técnico", t: "tiempo", s: 3, r: "20 m", rest: 60, lv: [0, 3], tip: "Talón al glúteo. Mismo ritmo que el A." },
    { n: "Aceleración progresiva", t: "tiempo", s: 4, r: "30 m", rest: 120, lv: [0, 2], tip: "Empieza al 50%, llega al 80% al final. Sin llegar al máximo." },
    { n: "Sprint técnico 60m", t: "tiempo", s: 3, r: "60 m", rest: 180, lv: [0, 2], tip: "Recuperación 3 min entre sprints. Técnica antes que velocidad." },
    { n: "Frecuencia de zancada en el sitio", t: "tiempo", s: 3, r: "15s", rest: 60, lv: [0, 5], tip: "Pasos muy rápidos y cortos, casi sin desplazarte." },
    { n: "Salidas de bloque (o posición baja)", t: "tiempo", s: 6, r: "10 m", rest: 150, lv: [3, 5], tip: "Inclinación 45°. Empuja el suelo. Los primeros 10m son la carrera." },
    { n: "Aceleraciones máximas", t: "tiempo", s: 5, r: "30 m", rest: 300, lv: [3, 5], tip: "Recuperación COMPLETA (5 min). Cada rep al 100% o no vale." },
    { n: "Sprint máximo", t: "tiempo", s: 4, r: "60 m", rest: 180, lv: [3, 5], tip: "Inclinación de 45° al salir. Brazos en 90° que se mueven adelante-atrás sin cruzar el centro. Fase de máxima velocidad entre 40-60m." },
    { n: "Sprint resistido (cuesta o banda)", t: "tiempo", s: 4, r: "20 m", rest: 150, lv: [4, 5], tip: "Mayor resistencia = mayor fuerza en la salida." },
    { n: "Pliometría: saltos horizontales", t: "reps", s: 4, r: "6", rest: 120, lv: [3, 5], tip: "Distancia máxima. Simula la zancada explosiva." },
    { n: "Marcha atlética básica", t: "tiempo", s: 2, r: "50 m", rest: 60, lv: [0, 0], tip: "Un pie siempre en contacto con el suelo. Caderas activas. Movilidad y técnica base." },
    { n: "Salida parado reacción", t: "tiempo", s: 4, r: "20 m", rest: 90, lv: [0, 0], tip: "Posición baja, primera zancada explosiva. Aplica a cualquier distancia de sprint." },
    { n: "Drills frecuencia de zancada", t: "tiempo", s: 5, r: "15 m", rest: 90, lv: [5, 5], tip: "Pasos muy cortos y muy rápidos. Activa el patrón neurológico de velocidad máxima." },
    { n: "Carrera en curva técnica", t: "tiempo", s: 4, r: "60 m curva", rest: 120, lv: [5, 5], tip: "Inclínate hacia el interior de la curva. Fundamental para 200m y 400m." },
    { n: "Resistencia de velocidad 300m", t: "tiempo", s: 3, r: "300 m", rest: 240, lv: [5, 5], tip: "Al 85-90% de máxima velocidad. La distancia más dura del atletismo. Recuperación completa entre reps." },
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
    { n: "Trote suave continuo", t: "tiempo", s: 1, r: "15 min", rest: 0, lv: [0, 2], tip: "Ritmo conversacional. Si no puedes hablar, ve más lento." },
    { n: "Zancadas dinámicas caminando", t: "reps", s: 2, r: "10 c/pierna", rest: 30, lv: [0, 2], tip: "Movilidad de cadera para correr." },
    { n: "Strides 100m", t: "tiempo", s: 4, r: "100 m", rest: 60, lv: [0, 3], tip: "Aceleración suave al 80%. Trabaja la técnica de carrera." },
    { n: "Intervalos 6×200 m", t: "tiempo", s: 6, r: "200 m", rest: 90, lv: [1, 4], tip: "Trabaja velocidad de base para el ritmo de 5K." },
    { n: "Series de colina", t: "tiempo", s: 6, r: "100 m", rest: 120, lv: [2, 4], tip: "Construye fuerza específica de carrera." },
    { n: "Rodaje suave de base", t: "tiempo", s: 1, r: "30 min", rest: 0, lv: [0, 5], tip: "El volumen aeróbico es la base de todo." },
    { n: "Rodaje de calidad 5km", t: "tiempo", s: 1, r: "5 km", rest: 0, lv: [4, 5], tip: "Ritmo de competencia. Últimos 500m al máximo." },
    { n: "Intervalos 6×800m", t: "tiempo", s: 6, r: "800 m", rest: 90, lv: [3, 5], tip: "Al ritmo objetivo de 5km. Recuperación 90s entre intervalos." },
    { n: "Tempo run 3km", t: "tiempo", s: 1, r: "3 km", rest: 0, lv: [3, 5], tip: "Incómodo pero sostenible. Entrena el umbral de lactato." },
  ],
  "10km": [
    { n: "Rodaje largo (long run)", t: "tiempo", s: 1, r: "50 min", rest: 0, tip: "Ritmo suave y constante, prioriza la duración." },
    { n: "Ritmo de carrera (pace run)", t: "tiempo", s: 1, r: "25 min", rest: 0, tip: "Corre al ritmo que esperas mantener el día de la carrera." },
    { n: "Intervalos largos 3×1 km", t: "tiempo", s: 3, r: "1 km", rest: 180, tip: "Ritmo algo más rápido que el objetivo de carrera." },
    { n: "Carrera continua suave", t: "tiempo", s: 1, r: "35 min", rest: 0, tip: "Base aeróbica: constante y cómoda." },
    { n: "Recuperación activa trotando", t: "tiempo", s: 1, r: "15 min", rest: 0, tip: "Muy suave, para asimilar el trabajo previo." },
  ],
  maraton: [
    { n: "Recuperación activa trotando", t: "tiempo", s: 1, r: "20 min", rest: 0, lv: [0, 5], tip: "Fundamental entre sesiones largas para no lesionarte." },
    { n: "Carrera continua suave", t: "tiempo", s: 1, r: "50 min", rest: 0, lv: [0, 3], tip: "Kilómetros fáciles que suman resistencia." },
    { n: "Ritmo de carrera (pace run)", t: "tiempo", s: 1, r: "40 min", rest: 0, lv: [1, 4], tip: "Practica el ritmo objetivo de la maratón." },
    { n: "Intervalos largos 3×1 km", t: "tiempo", s: 3, r: "1 km", rest: 180, lv: [2, 4], tip: "Aporta velocidad sin sacrificar la resistencia de base." },
    { n: "Rodaje largo (long run)", t: "tiempo", s: 1, r: "90 min", rest: 0, lv: [1, 3], tip: "El entrenamiento más importante de la semana: paciencia." },
    { n: "Long run 25-30km", t: "tiempo", s: 1, r: "25-30 km", rest: 0, lv: [4, 5], tip: "Ritmo 90s más lento que tu pace de maratón objetivo. No más rápido." },
    { n: "Pace run 12km", t: "tiempo", s: 1, r: "12 km", rest: 0, lv: [4, 5], tip: "Exactamente a tu ritmo de maratón. Aprende cómo se siente." },
    { n: "Fartlek 45 min", t: "tiempo", s: 1, r: "45 min", rest: 0, lv: [3, 5], tip: "Cambios de ritmo libres. Cuando quieras, cuanto quieras." },
  ],
};

/* ─── Base de ejercicios ───
   t: peso | reps | tiempo · f: enfoques · lv: [nivel mín, nivel máx] 0-5 */
const EXDB = {
  gimnasio: [
    { n: "Press banca con barra", t: "peso", f: ["pecho"], lv: [1, 5], s: 4, r: "6-10", rest: 120, tip: "Escápulas retraídas y deprimidas. Pies en el suelo. Agarre algo más ancho que hombros. Baja la barra al pecho medio-bajo. Codos a 45-60°, no perpendiculares. Empuja explosivo." },
    { n: "Press banca con mancuernas", t: "peso", f: ["pecho"], lv: [0, 3], s: 3, r: "8-12", rest: 90, tip: "Recorrido completo, junta las mancuernas arriba sin chocarlas." },
    { n: "Press inclinado con mancuernas", t: "peso", f: ["pecho"], lv: [0, 5], s: 3, r: "8-12", rest: 90, tip: "Banco a 30°, no arquees la zona lumbar." },
    { n: "Aperturas con mancuernas", t: "peso", f: ["pecho"], lv: [0, 4], s: 3, r: "10-15", rest: 60, tip: "Codos ligeramente flexionados, siente el estiramiento del pecho." },
    { n: "Cruce de poleas", t: "peso", f: ["pecho"], lv: [1, 5], s: 3, r: "12-15", rest: 60, tip: "Contrae el pecho al cerrar, controla la vuelta." },
    { n: "Press banca con barra y pausa", t: "peso", f: ["pecho"], lv: [3, 5], s: 4, r: "4-6", rest: 180, tip: "Pausa de 1 segundo en el pecho antes de empujar." },
    { n: "Jalón al pecho", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Lleva la barra a la clavícula con el pecho arriba." },
    { n: "Dominadas", t: "reps", f: ["espalda"], lv: [1, 3], s: 4, r: "5-10", rest: 120, tip: "Agarre prono, manos algo más anchas que hombros. Inicia retrayendo escápulas antes de doblar codos. Sube hasta barbilla sobre la barra. Baja completamente controlado. Sin impulso." },
    { n: "Dominadas lastradas", t: "peso", f: ["espalda"], lv: [3, 5], s: 4, r: "4-6", rest: 150, tip: "Añade peso al cinturón, mantén el control al bajar." },
    { n: "Remo con barra", t: "peso", f: ["espalda"], lv: [1, 5], s: 4, r: "6-10", rest: 120, tip: "Inclinación de 45-70°. Barra colgando. Jala hacia el ombligo. Codos pegados al cuerpo. Aprieta escápulas al final. Baja completamente controlado." },
    { n: "Remo con mancuerna a una mano", t: "peso", f: ["espalda"], lv: [0, 4], s: 3, r: "8-12", rest: 90, tip: "Apoya la rodilla en el banco, espalda recta." },
    { n: "Remo en polea baja", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Saca pecho y lleva los codos atrás pegados al cuerpo." },
    { n: "Peso muerto convencional", t: "peso", f: ["espalda", "piernas", "isquios"], lv: [2, 5], s: 4, r: "3-6", rest: 210, tip: "Pies a anchura de caderas, barra sobre mediopié. Agarre justo fuera de las piernas. Espalda neutral, pecho arriba. Empuja el suelo hacia abajo — no jales la barra. La barra debe rozar las piernas en todo momento." },
    { n: "Pullover en polea", t: "peso", f: ["espalda"], lv: [1, 4], s: 3, r: "12-15", rest: 60, tip: "Brazos casi rectos, lleva la barra hasta la cadera." },
    { n: "Press militar con mancuernas", t: "peso", f: ["hombros"], lv: [0, 3], s: 3, r: "8-12", rest: 90, tip: "Sube sin encoger los hombros, abdomen firme." },
    { n: "Press militar de pie con barra", t: "peso", f: ["hombros"], lv: [2, 5], s: 4, r: "5-8", rest: 150, tip: "De pie o sentado. Barra al nivel de la clavícula. Aprieta glúteos y core. Empuja la barra arriba y ligeramente atrás para que quede sobre la cabeza. Bloquea los codos arriba." },
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
    { n: "Sentadilla goblet", t: "peso", f: ["piernas", "gluteos", "cuadriceps"], lv: [0, 2], s: 3, r: "10-12", rest: 90, tip: "Mancuerna al pecho, baja entre las rodillas." },
    { n: "Sentadilla con barra", t: "peso", f: ["piernas", "gluteos", "cuadriceps"], lv: [1, 5], s: 4, r: "5-8", rest: 180, tip: "Barra sobre trapecios. Pies a anchura de hombros, puntas 15-30° afuera. Inicia sacando caderas atrás Y abajo. Rodillas siguen dirección de pies. Baja hasta paralelo mínimo. Espalda neutral todo el tiempo." },
    { n: "Sentadilla frontal", t: "peso", f: ["piernas", "cuadriceps"], lv: [3, 5], s: 4, r: "4-6", rest: 180, tip: "Codos altos, torso lo más vertical posible." },
    { n: "Prensa de piernas", t: "peso", f: ["piernas", "cuadriceps"], lv: [0, 4], s: 3, r: "10-12", rest: 120, tip: "No bloquees las rodillas arriba, baja profundo." },
    { n: "Peso muerto rumano", t: "peso", f: ["piernas", "gluteos", "gluteo", "cadena_posterior"], lv: [1, 5], s: 3, r: "8-10", rest: 120, tip: "Cadera atrás, siente el estiramiento en los femorales." },
    { n: "Zancadas con mancuernas", t: "peso", f: ["piernas", "gluteos"], lv: [0, 4], s: 3, r: "8 c/pierna", rest: 90, tip: "Paso largo, rodilla trasera casi al suelo." },
    { n: "Curl femoral", t: "peso", f: ["piernas", "isquios"], lv: [0, 4], s: 3, r: "10-12", rest: 60, tip: "Sube con fuerza, baja en 3 segundos." },
    { n: "Extensión de cuádriceps", t: "peso", f: ["piernas", "cuadriceps"], lv: [0, 3], s: 3, r: "12-15", rest: 60, tip: "Aprieta el cuádriceps 1 segundo arriba." },
    { n: "Elevación de talones con peso", t: "peso", f: ["piernas"], lv: [0, 5], s: 4, r: "12-15", rest: 45, tip: "Pausa arriba y estira abajo por completo." },
    { n: "Hip thrust con barra", t: "peso", f: ["gluteos", "gluteo", "cadena_posterior"], lv: [1, 5], s: 4, r: "8-10", rest: 120, tip: "Hombros sobre el banco. Barra en la cadera con pad. Pies a anchura de caderas. Empuja a través de los talones. Extiende completamente la cadera arriba. Contrae glúteos 1s arriba. NO hiperextender la columna lumbar." },
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
    { n: "Extensión de tríceps sobre la cabeza", t: "peso", f: ["brazos"], lv: [0, 4], s: 3, r: "10-12", rest: 60, tip: "Codos apuntando al techo, estira por completo. La cabeza larga del tríceps se activa máximo con el brazo sobre la cabeza." },
    { n: "Peso muerto sumo", t: "peso", f: ["piernas", "gluteos"], lv: [2, 5], s: 4, r: "4-6", rest: 210, tip: "Pies muy abiertos, rodillas hacia afuera, torso vertical." },
    { n: "Zancada inversa con barra", t: "peso", f: ["piernas", "gluteos"], lv: [2, 5], s: 3, r: "8 c/pierna", rest: 90, tip: "Paso atrás controlado, más amable con las rodillas." },
    { n: "Step-up con mancuernas", t: "peso", f: ["piernas", "gluteos", "gluteo", "cadena_posterior"], lv: [1, 4], s: 3, r: "10 c/pierna", rest: 90, tip: "Empuja con la pierna de arriba, no impulses con la de abajo." },
    { n: "Abducción de cadera en polea", t: "peso", f: ["gluteos"], lv: [0, 3], s: 3, r: "12 c/pierna", rest: 60, tip: "Pierna recta hacia el lado, sin inclinar el torso." },
    { n: "Press banca agarre cerrado", t: "peso", f: ["pecho", "brazos"], lv: [1, 5], s: 3, r: "10", rest: 75, tip: "Manos a anchura de hombros. Énfasis en tríceps y pecho interno. Codos más pegados al cuerpo." },
    { n: "Press declinado mancuernas", t: "peso", f: ["pecho"], lv: [1, 4], s: 3, r: "12", rest: 75, tip: "Banco a -20°. Activa porción inferior del pecho. No bajar más de -30° para proteger hombros." },
    { n: "Pullover con mancuerna", t: "peso", f: ["pecho", "espalda"], lv: [0, 4], s: 3, r: "12", rest: 60, tip: "Codos ligeramente doblados. Baja hasta sentir el estiramiento del dorsal. Expande la caja torácica." },
    { n: "Cruce de poleas alto a bajo", t: "peso", f: ["pecho"], lv: [1, 5], s: 3, r: "15", rest: 45, tip: "Polea alta, cruza hacia abajo y al centro. Porción inferior del pecho. Contracción máxima en el centro." },
    { n: "Cruce de poleas bajo a alto", t: "peso", f: ["pecho"], lv: [1, 5], s: 3, r: "15", rest: 45, tip: "Polea baja, cruza hacia arriba y al centro. Porción clavicular. Control en todo el rango." },
    { n: "Press con agarre neutro mancuernas", t: "peso", f: ["pecho"], lv: [0, 4], s: 3, r: "10", rest: 75, tip: "Palmas enfrentadas durante todo el movimiento. Menos estrés en el hombro." },
    { n: "Aperturas en polea baja", t: "peso", f: ["pecho"], lv: [0, 4], s: 3, r: "15", rest: 45, tip: "De abajo hacia arriba en arco. Porción superior del pecho. Brazos casi rectos." },
    { n: "Remo en polea baja sentado", t: "peso", f: ["espalda"], lv: [0, 4], s: 4, r: "10", rest: 75, tip: "Espalda recta perpendicular al suelo. Codos pegados al cuerpo. Aprieta escápulas al llegar al final." },
    { n: "Remo agarre supino barra", t: "peso", f: ["espalda", "brazos"], lv: [2, 5], s: 4, r: "8", rest: 90, tip: "Palmas hacia arriba. Mayor activación de bíceps como asistente. Codos pegados al cuerpo." },
    { n: "Dominadas agarre neutro", t: "reps", f: ["espalda"], lv: [1, 4], s: 3, r: "8", rest: 90, tip: "Palmas enfrentadas en barra paralela. Menos estrés en los hombros que el agarre prono." },
    { n: "Remo en T-bar", t: "peso", f: ["espalda"], lv: [2, 5], s: 4, r: "8", rest: 90, tip: "Pecho sobre el pad. Jala hacia el esternón. Excelente para grosor de espalda." },
    { n: "Hiperextensión en banco romano", t: "reps", f: ["espalda", "gluteos"], lv: [0, 4], s: 3, r: "15", rest: 60, tip: "No hiperextender la espalda baja. Para cuando el torso quede paralelo. Mantén cuello neutro." },
    { n: "Nordic hamstring curl", t: "reps", f: ["piernas", "isquios"], lv: [3, 5], s: 3, r: "5", rest: 120, tip: "El mejor preventivo de lesión de isquiotibiales. Baja MUY lento (4-5 segundos). Usa los brazos para frenar si es necesario." },
    { n: "Peso muerto con mancuernas", t: "peso", f: ["piernas", "gluteos"], lv: [0, 3], s: 3, r: "12", rest: 75, tip: "Igual que el convencional pero con mancuernas. Más libertad de movimiento para principiantes." },
    { n: "Elevaciones laterales en cable", t: "peso", f: ["hombros"], lv: [1, 5], s: 3, r: "15", rest: 45, tip: "Tensión constante vs mancuerna. Codo ligeramente doblado. No balancear el torso." },
    { n: "Rear delt fly en máquina", t: "peso", f: ["hombros"], lv: [0, 4], s: 3, r: "15", rest: 45, tip: "Sentado al revés en la máquina de peck deck. Deltoides posterior. Esencial para hombros saludables." },
    { n: "Press con agarre neutro", t: "peso", f: ["hombros"], lv: [0, 4], s: 3, r: "10", rest: 75, tip: "Palmas enfrentadas. Menos estrés en el manguito rotador. Buena opción si hay dolor en press normal." },
    { n: "Rotación externa con cable", t: "peso", f: ["hombros"], lv: [1, 5], s: 3, r: "15", rest: 45, tip: "Codo a 90° pegado al cuerpo. Rota el antebrazo hacia afuera. Manguito rotador — prevención de lesión." },
    { n: "Elevaciones frontales alternas", t: "peso", f: ["hombros"], lv: [0, 4], s: 3, r: "12 c/brazo", rest: 60, tip: "Alterna brazos. Palma hacia abajo. Solo sube hasta la altura del hombro." },
    { n: "Jalón al pecho agarre ancho", t: "peso", f: ["espalda"], lv: [0, 4], s: 4, r: "8", rest: 90, tip: "Agarre más ancho que hombros. Jala hacia el pecho alto. Máxima contracción de dorsales." },
    { n: "Dominadas agarre ancho", t: "reps", f: ["espalda"], lv: [2, 5], s: 4, r: "6", rest: 120, tip: "El ejercicio más efectivo para espalda ancha. Rango completo." },
    { n: "Remo en polea agarre ancho", t: "peso", f: ["espalda"], lv: [1, 5], s: 3, r: "12", rest: 75, tip: "Codos hacia afuera en vez de pegados al cuerpo. Activa más la parte superior del dorsal." },
    { n: "Elevaciones laterales pesadas", t: "peso", f: ["hombros"], lv: [2, 5], s: 5, r: "12", rest: 45, tip: "Los hombros anchos crean la ilusión de cintura más pequeña. Clave para la V." },
    { n: "Sentadilla búlgara", t: "peso", f: ["gluteos", "piernas", "gluteo", "cadena_posterior"], lv: [1, 5], s: 4, r: "10 c/pierna", rest: 90, tip: "Pie trasero en banco. Pie delantero adelante lo suficiente para que la rodilla no pase la punta al bajar. Torso erguido. Baja hasta que el muslo delantero esté paralelo. El fémur trasero en vertical = correcto." },
    { n: "Abducción en máquina", t: "peso", f: ["gluteos", "gluteo", "cadena_posterior"], lv: [0, 4], s: 4, r: "20", rest: 45, tip: "Glúteo medio y menor. Crucial para la forma lateral del glúteo. Abre lento y controla el cierre." },
    { n: "Kickback en polea baja", t: "peso", f: ["gluteos", "gluteo", "cadena_posterior"], lv: [0, 4], s: 3, r: "15 c/pierna", rest: 45, tip: "Peso en tobillo. Extiende la pierna hacia atrás sin rotar la cadera. Extensión del glúteo." },
    { n: "Peso muerto rumano unilateral", t: "peso", f: ["gluteos", "piernas", "gluteo", "cadena_posterior"], lv: [2, 5], s: 3, r: "10 c/pierna", rest: 75, tip: "Una pierna. Estiramiento profundo del glúteo e isquiotibial. Excelente para dar forma." },
    { n: "Sentadilla sumo con mancuerna", t: "peso", f: ["gluteos", "piernas", "gluteo", "cadena_posterior"], lv: [0, 3], s: 3, r: "15", rest: 60, tip: "Pies muy abiertos. Mancuerna colgando al centro. Activa aductores y glúteos desde ángulo diferente." },
    { n: "Puente de glúteos", t: "reps", f: ["gluteos", "gluteo", "cadena_posterior"], lv: [0, 2], s: 3, r: "20", rest: 45, tip: "Sin banco. En el suelo. Contrae 1 segundo arriba. Accesible para todos los niveles." },
    { n: "Step-up lateral con mancuerna", t: "peso", f: ["gluteos", "piernas"], lv: [1, 4], s: 3, r: "12 c/pierna", rest: 60, tip: "Sube de lado. Activa glúteo medio que el step-up frontal no alcanza." },
    { n: "Curl predicador con barra Z", t: "peso", f: ["brazos"], lv: [2, 5], s: 4, r: "10", rest: 75, tip: "El banco Scott aísla el bíceps completamente. Sin impulso de hombro posible." },
    { n: "Press francés con barra Z", t: "peso", f: ["brazos"], lv: [2, 5], s: 4, r: "10", rest: 75, tip: "Skullcrusher. Codos apuntando al techo. Solo se mueve el antebrazo." },
    { n: "Curl con barra recta", t: "peso", f: ["brazos"], lv: [1, 5], s: 3, r: "10", rest: 75, tip: "Agarre supino. Codos fijos al costado. Contracción completa arriba." },
    { n: "Dip con asistencia para tríceps", t: "peso", f: ["brazos"], lv: [0, 3], s: 3, r: "12", rest: 60, tip: "Torso erguido = énfasis tríceps. Inclinado = énfasis pecho." },
    { n: "Curl inverso", t: "peso", f: ["brazos"], lv: [1, 4], s: 3, r: "15", rest: 45, tip: "Agarre prono. Trabaja braquiorradial y antebrazos. Agarre más fuerte." },
    { n: "Kickback en polea (tríceps)", t: "peso", f: ["brazos"], lv: [0, 4], s: 3, r: "15 c/brazo", rest: 45, tip: "Codo fijo al costado, arriba. Extiende completamente. Contrae 1s." },
    { n: "Press banca 5x3 al 90% 1RM", t: "peso", f: ["pecho"], lv: [5, 5], s: 5, r: "3", rest: 300, tip: "Intensidad máxima. Descanso completo. Cada rep perfecta." },
    { n: "Fondos lastrados pesados", t: "peso", f: ["brazos", "pecho"], lv: [5, 5], s: 5, r: "5", rest: 240, tip: "Añade el máximo peso posible manteniendo rango completo." },
    { n: "Press inclinado con pausa", t: "peso", f: ["pecho"], lv: [5, 5], s: 5, r: "4", rest: 240, tip: "Pausa 2s en el pecho. Elimina el impulso. Fuerza pura." },
    { n: "Dominadas lastradas pesadas", t: "peso", f: ["espalda"], lv: [5, 5], s: 5, r: "4", rest: 300, tip: "Añade el máximo peso posible. Rango completo, sin impulso." },
    { n: "Remo con barra 5x5 pesado", t: "peso", f: ["espalda"], lv: [5, 5], s: 5, r: "5", rest: 240, tip: "Peso máximo. Espalda recta. Barra al ombligo." },
    { n: "Peso muerto 1x5 al 90%", t: "peso", f: ["espalda", "piernas", "isquios"], lv: [5, 5], s: 1, r: "5", rest: 300, tip: "Una sola serie pesada. Técnica perfecta. Máximo esfuerzo." },
    { n: "Sentadilla con barra 5x3 al 90%", t: "peso", f: ["piernas", "cuadriceps"], lv: [5, 5], s: 5, r: "3", rest: 300, tip: "El ejercicio más importante para un atleta. Técnica perfecta." },
    { n: "Peso muerto rumano pesado", t: "peso", f: ["piernas", "gluteos", "gluteo", "cadena_posterior"], lv: [5, 5], s: 5, r: "5", rest: 240, tip: "Isquiotibiales al límite. Espalda neutral obligatoria." },
    { n: "Hip thrust con barra máximo", t: "peso", f: ["gluteos", "gluteo", "cadena_posterior"], lv: [5, 5], s: 5, r: "5", rest: 240, tip: "El peso más alto posible. Extensión completa en cada rep." },
    { n: "Ab wheel / rueda abdominal", t: "reps", f: ["core"], lv: [2, 5], s: 3, r: "8", rest: 60, tip: "El ejercicio de core más efectivo. Espalda baja neutral. Baja lento." },
    { n: "Plancha con elevación de brazo", t: "reps", f: ["core"], lv: [1, 4], s: 3, r: "10 c/lado", rest: 45, tip: "Estabilidad anti-rotación. Las caderas no deben moverse." },
    { n: "Dragon flag negativo (gym)", t: "reps", f: ["core"], lv: [3, 5], s: 3, r: "5", rest: 90, tip: "Baja en 5 segundos. Cuerpo rígido. Bruce Lee lo popularizó." },
    { n: "Press Pallof", t: "peso", f: ["core"], lv: [1, 5], s: 3, r: "12 c/lado", rest: 45, tip: "Anti-rotación. Estira los brazos al frente y resiste la rotación de la polea." },
    { n: "Crunch en polea alta", t: "peso", f: ["core"], lv: [0, 4], s: 4, r: "15", rest: 45, tip: "Rodillas en el suelo. Polea en la nuca. Flexión del tronco, no tracción de brazos." },
    { n: "Crunch básico", t: "reps", f: ["core"], lv: [0, 1], s: 3, r: "15", rest: 45, tip: "Manos detrás de la cabeza, codos abiertos. Sube solo los hombros, no el cuello." },
    { n: "Elevación de piernas en el suelo", t: "reps", f: ["core"], lv: [0, 1], s: 3, r: "12", rest: 45, tip: "Espalda baja pegada al suelo siempre. Si se despega, dobla ligeramente las rodillas." },
    { n: "Plancha frontal", t: "reps", f: ["core"], lv: [0, 1], s: 3, r: "30s", rest: 45, tip: "Cuerpo recto de cabeza a talones. Contrae glúteos y abdomen simultáneamente." },
    { n: "Mountain climbers lentos", t: "reps", f: ["core"], lv: [0, 1], s: 3, r: "20", rest: 45, tip: "Lleva rodilla al pecho completamente. Caderas abajo, no en el aire." },
    { n: "Superman en el suelo", t: "reps", f: ["core"], lv: [0, 1], s: 3, r: "12", rest: 45, tip: "Extiende brazos y piernas opuestos. Activa lumbar y glúteos." },
    { n: "Crunch con giro (oblicuos)", t: "reps", f: ["core"], lv: [1, 2], s: 3, r: "20", rest: 45, tip: "Codo derecho a rodilla izquierda y viceversa. Rota el torso, no solo el codo." },
    { n: "Plancha lateral", t: "reps", f: ["core"], lv: [1, 2], s: 3, r: "30s c/lado", rest: 45, tip: "Cadera arriba en línea recta. No dejar caer la cadera en ningún momento." },
    { n: "Tijeras", t: "reps", f: ["core"], lv: [1, 2], s: 3, r: "30s", rest: 45, tip: "Espalda baja en el suelo. Piernas apenas sobre el suelo para máxima tensión." },
    { n: "Rodillo abdominal (ab wheel) asistido", t: "reps", f: ["core"], lv: [1, 2], s: 3, r: "8", rest: 60, tip: "Desde rodillas. Extiende hasta donde mantengas espalda neutral. Vuelve contrayendo el core." },
    { n: "Hollow body hold", t: "reps", f: ["core"], lv: [1, 2], s: 3, r: "20s", rest: 45, tip: "Espalda baja PEGADA al suelo. Brazos y piernas ligeramente levantados." },
    { n: "V-up", t: "reps", f: ["core"], lv: [2, 3], s: 4, r: "12", rest: 45, tip: "Brazos y piernas suben simultáneamente hacia el centro. Control total, sin impulso." },
    { n: "Plancha con toque de hombro", t: "reps", f: ["core"], lv: [2, 3], s: 3, r: "16", rest: 45, tip: "Caderas no rotan al tocar. Eso es lo que activa el core profundo." },
    { n: "Ab wheel completo", t: "reps", f: ["core"], lv: [2, 3], s: 3, r: "8", rest: 60, tip: "El ejercicio de core más efectivo. Extiende hasta casi el suelo. Lumbar neutral." },
    { n: "Hanging knee raise", t: "reps", f: ["core"], lv: [2, 3], s: 3, r: "12", rest: 60, tip: "Colgado de la barra. Rodillas al pecho sin balancearse. Baja lento." },
    { n: "Pallof press", t: "peso", f: ["core"], lv: [2, 3], s: 3, r: "12 c/lado", rest: 45, tip: "Anti-rotación. Extiende los brazos y resiste que la polea te gire.", desc: "Resistencia antirotacional con polea o banda. Los brazos se extienden, el core no debe girar." },
    { n: "Hanging leg raise (piernas rectas)", t: "reps", f: ["core"], lv: [3, 4], s: 4, r: "10", rest: 60, tip: "Piernas rectas al frente hasta 90°. Sin balanceo. Control total en la bajada." },
    { n: "Plancha con peso", t: "reps", f: ["core"], lv: [3, 4], s: 4, r: "40s", rest: 60, tip: "Plato en la espalda baja. Mantén la posición perfecta bajo carga." },
    { n: "L-sit en paralelas o suelo", t: "reps", f: ["core"], lv: [4, 5], s: 5, r: "10s", rest: 60, tip: "Piernas horizontales con brazos rectos. Compresión máxima de core." },
    { n: "Dragon flag completo", t: "reps", f: ["core"], lv: [5, 5], s: 4, r: "6", rest: 90, tip: "Sube y baja controlado. Sin tocar el suelo hasta terminar la serie." },
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
    { n: "Dominadas explosivas", t: "reps", f: ["tiron", "explosivo"], lv: [3, 5], s: 4, r: "5", rest: 150, tip: "Sube tan rápido que las manos despegan brevemente de la barra. Base del muscle-up." , bar: true },
    { n: "Planche lean", t: "tiempo", f: ["empuje", "core"], lv: [3, 5], s: 3, r: "20s", rest: 120, tip: "Inclínate hacia adelante con brazos rectos. Progresión gradual al planche completo." },
    { n: "Handstand contra pared", t: "tiempo", f: ["empuje", "core"], lv: [2, 5], s: 3, r: "20s", rest: 120, tip: "Panza hacia la pared para aprender. Fuerza de hombros y propiocepción. Construye la base del pino libre." },
    { n: "Archer push-up en barras", t: "reps", f: ["empuje"], lv: [3, 5], s: 3, r: "6 c/lado", rest: 120, tip: "Un brazo extendido, el otro hace el trabajo. Progresión al fondo a una mano." , bar: true },
    { n: "Flexiones spiderman", t: "reps", f: ["empuje", "core"], lv: [1, 4], s: 3, r: "10", rest: 90, tip: "Al bajar, lleva la rodilla al codo del mismo lado. Core y pecho simultáneos." },
    { n: "Front lever tucked", t: "tiempo", f: ["tiron", "core"], lv: [4, 5], s: 3, r: "10s", rest: 120, tip: "Rodillas al pecho, cuerpo paralelo al suelo. Progresión al front lever completo." , bar: true },
    { n: "Back lever", t: "tiempo", f: ["tiron", "core"], lv: [4, 5], s: 3, r: "8s", rest: 120, tip: "Cara abajo paralelo al suelo. Hombros muy móviles necesarios." , bar: true },
    { n: "Muscle-up estricto", t: "reps", f: ["tiron", "explosivo"], lv: [4, 5], s: 3, r: "3", rest: 180, tip: "Sin impulso. Jalón explosivo hasta que las muñecas superan la barra." , bar: true },
    { n: "One arm push-up asistido", t: "reps", f: ["empuje"], lv: [4, 5], s: 3, r: "5 c/lado", rest: 120, tip: "Pie de apoyo lateral para equilibrio. Progresión al one arm completo." },
    { n: "Pistol squat completo", t: "reps", f: ["piernas"], lv: [4, 5], s: 3, r: "5 c/pierna", rest: 120, tip: "Pierna libre extendida al frente. Cadera debajo de la rodilla en el fondo." },
    { n: "Human flag asistido", t: "tiempo", f: ["core", "tiron"], lv: [4, 5], s: 3, r: "5s", rest: 120, tip: "Poste o barra vertical. Cuerpo horizontal. Uno de los más impresionantes visualmente." , bar: true },
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
    { n: "Pallof press en polea", t: "peso", f: ["estabilidad"], lv: [1, 4], s: 3, r: "10 c/lado", rest: 60, tip: "Resiste la rotación con los brazos extendidos al frente.", desc: "De pie de lado a la polea. Extiende los brazos al frente resistiendo que te giren. Core antirotacional." },
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
  basquetCancha: [
    { n: "Tiro libre", t: "reps", f: ["tiro"], lv: [0, 5], s: 4, r: "10", rest: 60, tip: "Rutina de tiro siempre igual: pies, codo, muñeca." },
    { n: "Tiro de media distancia (jump shot)", t: "reps", f: ["tiro"], lv: [1, 5], s: 4, r: "8 c/lado", rest: 90, tip: "Salta recto y suelta en el punto más alto." },
    { n: "Tiro de tres puntos", t: "reps", f: ["tiro"], lv: [2, 5], s: 4, r: "8", rest: 90, tip: "Piernas primero: la potencia sale de las rodillas." },
    { n: "Tiro tras bote (catch and shoot)", t: "reps", f: ["tiro", "dribleo"], lv: [1, 4], s: 3, r: "10", rest: 60, tip: "Recibe, planta los pies y dispara en un solo tiempo." },
    { n: "Bandeja con ambas manos", t: "reps", f: ["tiro"], lv: [0, 3], s: 4, r: "8 c/lado", rest: 60, tip: "Da el último paso largo y protege el balón alto." },
    { n: "Tiro en movimiento tras finta", t: "reps", f: ["tiro", "dribleo"], lv: [2, 5], s: 3, r: "8", rest: 90, tip: "Finta de bote, un paso atrás y dispara equilibrado." },
    { n: "Dribleo bajo con ambas manos", t: "tiempo", f: ["dribleo"], lv: [0, 3], s: 3, r: "30s c/mano", rest: 45, tip: "Bota bajo y con la vista al frente, no al balón." },
    { n: "Cambios de mano entre las piernas", t: "reps", f: ["dribleo"], lv: [1, 4], s: 3, r: "15", rest: 45, tip: "Bote firme y rápido, mantén el balón cerca del cuerpo." },
    { n: "Dribleo tipo crossover explosivo", t: "reps", f: ["dribleo"], lv: [2, 5], s: 3, r: "10 c/lado", rest: 60, tip: "Cambia de dirección con un paso lateral potente." },
    { n: "Dribleo con dos balones", t: "tiempo", f: ["dribleo"], lv: [2, 5], s: 3, r: "30s", rest: 60, tip: "Control simultáneo: no mires ninguno de los dos balones." },
    { n: "Slalom con bote entre conos", t: "reps", f: ["dribleo"], lv: [0, 4], s: 3, r: "4 pasadas", rest: 60, tip: "Bote bajo esquivando conos sin perder el ritmo." },
    { n: "Deslizamiento defensivo lateral", t: "tiempo", f: ["defensa"], lv: [0, 5], s: 4, r: "30s", rest: 45, tip: "Rodillas flexionadas, no cruces los pies nunca." },
    { n: "Cierre y salto sobre tirador (close-out)", t: "reps", f: ["defensa"], lv: [1, 5], s: 3, r: "8", rest: 60, tip: "Corre, frena en corto y sube las manos sin saltar de más." },
    { n: "Defensa 1 contra 1 en espacio reducido", t: "tiempo", f: ["defensa"], lv: [2, 5], s: 3, r: "45s", rest: 60, tip: "Cadera baja, no le dejes ganar la línea de fondo." },
    { n: "Rebote y outlet pass", t: "reps", f: ["defensa", "salto"], lv: [1, 4], s: 3, r: "8", rest: 60, tip: "Salta con los dos brazos arriba y aterriza fuerte." },
    { n: "Salto vertical con contramovimiento", t: "reps", f: ["salto"], lv: [0, 4], s: 4, r: "6", rest: 90, tip: "Baja rápido y explota hacia el aro imaginario." },
    { n: "Salto al cajón", t: "reps", f: ["salto"], lv: [0, 4], s: 4, r: "5", rest: 90, tip: "Aterriza suave y en silencio; baja caminando." },
    { n: "Sprint de línea a línea (suicide)", t: "tiempo", f: ["resistencia"], lv: [0, 5], s: 4, r: "45s", rest: 60, tip: "Toca cada línea de la cancha, ritmo de partido." },
    { n: "Carrera de definición 3-2-1", t: "reps", f: ["resistencia", "salto"], lv: [1, 5], s: 4, r: "3 series", rest: 90, tip: "Corre, recibe y define en carrera sin frenar del todo." },
    { n: "Circuito de posesión 3x3", t: "tiempo", f: ["resistencia", "defensa"], lv: [2, 5], s: 1, r: "10 min", rest: 0, tip: "Juega a ritmo real, marca cada punto anotado." },
    { n: "Pase de pecho y de rebote en movimiento", t: "reps", f: ["dribleo", "resistencia"], lv: [0, 3], s: 3, r: "10 c/tipo", rest: 45, tip: "Pasa firme a la altura del pecho del compañero." },
    { n: "Tiro bajo fatiga (post-sprint)", t: "reps", f: ["tiro", "resistencia"], lv: [3, 5], s: 3, r: "6", rest: 90, tip: "Sprint corto y tiro inmediato: simula el final de un partido." },
    { n: "1 contra 1 a media cancha", t: "tiempo", f: ["defensa", "dribleo"], lv: [1, 5], s: 3, r: "1 min", rest: 90, tip: "Ataca y defiende con intensidad de partido real." },
  ],
  basquetSinCancha: [
    { n: "Sentadilla con salto", t: "reps", f: ["salto", "fuerza"], lv: [0, 4], s: 4, r: "8", rest: 90, tip: "Aterriza suave con rodillas alineadas." },
    { n: "Sentadilla búlgara", t: "reps", f: ["fuerza"], lv: [1, 4], s: 3, r: "8 c/pierna", rest: 90, tip: "Torso erguido, la pierna de atrás solo se apoya." },
    { n: "Zancadas con salto (alternas)", t: "reps", f: ["fuerza", "salto"], lv: [1, 5], s: 3, r: "8 c/lado", rest: 90, tip: "Cambia de pierna en el aire con control." },
    { n: "Peso muerto a una pierna (sin peso)", t: "reps", f: ["fuerza"], lv: [0, 3], s: 3, r: "8 c/pierna", rest: 60, tip: "Cadera cuadrada, brazos como contrapeso." },
    { n: "Elevación de talones", t: "reps", f: ["fuerza", "salto"], lv: [0, 5], s: 4, r: "15", rest: 45, tip: "Pantorrillas fuertes para más resorte en el salto." },
    { n: "Sentadilla isométrica en pared", t: "tiempo", f: ["fuerza"], lv: [0, 3], s: 3, r: "40s", rest: 60, tip: "Muslos paralelos al suelo, espalda pegada a la pared." },
    { n: "Salto vertical máximo", t: "reps", f: ["salto"], lv: [0, 5], s: 4, r: "5", rest: 120, tip: "Recupera completo entre saltos: calidad sobre cantidad." },
    { n: "Salto al cajón", t: "reps", f: ["salto"], lv: [0, 4], s: 4, r: "5", rest: 90, tip: "Sube con potencia, baja caminando." },
    { n: "Saltos de profundidad (depth jump)", t: "reps", f: ["salto"], lv: [3, 5], s: 3, r: "5", rest: 150, tip: "Cae de un escalón bajo y explota al instante." },
    { n: "Saltos a una pierna (bounds)", t: "reps", f: ["salto", "agilidad"], lv: [2, 5], s: 3, r: "5 c/pierna", rest: 120, tip: "Busca distancia con aterrizaje estable." },
    { n: "Skater jumps", t: "reps", f: ["agilidad", "salto"], lv: [1, 4], s: 3, r: "8 c/lado", rest: 90, tip: "Salta lateral de pierna a pierna con control." },
    { n: "Escalera de agilidad (o líneas en el suelo)", t: "tiempo", f: ["agilidad"], lv: [0, 3], s: 3, r: "30s", rest: 60, tip: "Pies rápidos, mirada al frente, brazos activos." },
    { n: "Ida y vuelta 5-10-5", t: "reps", f: ["agilidad"], lv: [1, 5], s: 4, r: "4", rest: 120, tip: "Frena bajando la cadera y explota al cambiar de dirección." },
    { n: "Deslizamientos defensivos laterales", t: "tiempo", f: ["agilidad"], lv: [0, 4], s: 4, r: "30s", rest: 45, tip: "Nunca cruces los pies, cadera baja todo el tiempo." },
    { n: "Plancha", t: "tiempo", f: ["core"], lv: [0, 3], s: 3, r: "40s", rest: 45, tip: "Cuerpo en línea recta, sin hundir la cadera." },
    { n: "Plancha con toque de hombro", t: "reps", f: ["core"], lv: [1, 4], s: 3, r: "16", rest: 45, tip: "Cadera estable: no gires el torso al tocar el hombro." },
    { n: "Russian twist", t: "reps", f: ["core"], lv: [0, 4], s: 3, r: "20", rest: 45, tip: "Gira desde el torso, pies elevados si puedes." },
    { n: "Elevación de piernas colgado o tumbado", t: "reps", f: ["core"], lv: [1, 5], s: 3, r: "12", rest: 60, tip: "Baja las piernas con control, sin balancearte." },
    { n: "Mountain climbers", t: "tiempo", f: ["core", "resistencia"], lv: [0, 3], s: 3, r: "30s", rest: 45, tip: "Cadera baja y estable, rodillas al pecho rápido." },
    { n: "Burpees", t: "reps", f: ["resistencia", "salto"], lv: [0, 5], s: 4, r: "10", rest: 90, tip: "Termina cada repetición con un salto vertical." },
    { n: "Sprint en el sitio (skipping alto)", t: "tiempo", f: ["resistencia"], lv: [0, 3], s: 3, r: "30s", rest: 45, tip: "Rodillas altas, ritmo constante y rápido." },
    { n: "Circuito HIIT full body", t: "tiempo", f: ["resistencia"], lv: [1, 5], s: 4, r: "40s trabajo / 20s descanso", rest: 20, tip: "Máxima intensidad en cada bloque de trabajo." },
    { n: "Jumping jacks", t: "tiempo", f: ["resistencia", "agilidad"], lv: [0, 2], s: 3, r: "40s", rest: 30, tip: "Ritmo constante, brazos y piernas sincronizados." },
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

/* Verificación de integridad del historial: descarta registros corruptos o manipulados */
const MIN_VALID_TS = new Date(2020, 0, 1).getTime();
function verifyHistory(sessions) {
  if (!Array.isArray(sessions)) return [];
  return sessions.filter((s) => {
    if (!s || typeof s !== "object") return false;
    if (typeof s.id !== "number" && typeof s.id !== "string") return false;
    if (typeof s.ts !== "number" || !Number.isFinite(s.ts)) return false;
    if (s.ts < MIN_VALID_TS || s.ts > Date.now() + 86400000) return false;
    if (s.kind !== "entreno" && s.kind !== "cuerpo") return false;
    if (s.kind === "entreno" && !Array.isArray(s.exercises)) return false;
    if (s.kind === "entreno" && s.durationMin != null && (s.durationMin < 0 || s.durationMin > 240)) return false;
    return true;
  });
}

/* Sesiones "rápidas" (<5 min) no cuentan para la racha ni los récords de constancia */
const streakEligible = (sessions) => sessions.filter((s) => !s.sesionRapida && (!s.partial || (s.exercises || []).length >= 3));

function calcStreak(sessions, frozen = []) {
  const elig = streakEligible(sessions);
  const days = new Set([...elig.map((s) => dayKey(s.ts)), ...frozen]);
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
  const elig = streakEligible(sessions);
  if (!elig.length) return 0;
  const days = new Set([...elig.map((s) => dayKey(s.ts)), ...frozen]);
  const d = new Date(Math.max(...elig.map((s) => s.ts)));
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
/* Semilla de variación de rutina: incorpora el tipo de rutina elegido para no repetir
   siempre los mismos ejercicios cuando el usuario repite el mismo focusId */
function routineSeed(discId, focusId) {
  const base = Math.floor(store.get("sessions", []).filter((s) => s.kind === "entreno").length / 3);
  const focusHash = `${discId || ""}${focusId || ""}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (base * 31 + focusHash) % 10000;
}

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
/* Sonido de obturador de cámara: click rápido para la "foto finish" de récord */
const shutterClick = () => { ensureAudio(); beep(800, 0.1, 0.4, 0); };
/* Triple beep al terminar el descanso: 880 Hz, 150 ms, separados 200 ms */
const tripleBeep = () => {
  beep(880, 0.15, 0.3, 0);
  beep(880, 0.15, 0.3, 0.35);
  beep(880, 0.15, 0.3, 0.7);
};
/* Aviso suave a 3 segundos del final */
const softBeep = () => beep(440, 0.1, 0.15, 0);

/* ─── Voz sintetizada (Web Speech API, gratis, sin API key) ─── */
function speak(text, opts = {}) {
  try {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = opts.rate ?? 0.9;
    u.pitch = opts.pitch ?? 1.1;
    const voice = voices.find((v) => v.lang === "es-MX") || voices.find((v) => v.lang === "es-ES") || voices.find((v) => v.lang?.startsWith("es"));
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* voz no disponible */
  }
}

/* ─── Categoría de movimiento según el nombre del ejercicio (para el SVG animado) ─── */
function exerciseTypeIcon(name) {
  const n = name.toLowerCase();
  if (n.includes("flexion") || n.includes("press") || n.includes("fondo")) return "💪";
  if (n.includes("domin") || n.includes("remo") || n.includes("jalón") || n.includes("jalon")) return "🏋️";
  if (n.includes("sentadill") || n.includes("zancada") || n.includes("hip thrust")) return "🦵";
  if (n.includes("plancha") || n.includes("abdomin") || n.includes("core")) return "🔥";
  if (n.includes("sprint") || n.includes("corre")) return "⚡";
  if (n.includes("salto") || n.includes("jump")) return "🦘";
  return "•";
}

/* ─── Asimetría izquierda/derecha en ejercicios unilaterales ─── */
/* Última técnica numérica registrada (1/2/3) en los sets de un ejercicio, o null */
function lastLoggedTechnique(sets) {
  const withTechnique = (sets || []).filter((s) => typeof s.technique === "number");
  return withTechnique.length ? withTechnique[withTechnique.length - 1].technique : null;
}

function isUnilateral(name) {
  const n = name.toLowerCase();
  return ["c/pierna", "c/lado", "búlgara", "pistol", "unilateral", "alterno", "a una pierna", "kickback"].some((k) => n.includes(k));
}
function asymmetryPct(left, right) {
  const max = Math.max(left, right);
  return max > 0 ? Number((((Math.abs(left - right)) / max) * 100).toFixed(1)) : 0;
}
function calcAsymmetryByExercise(sessions) {
  const byExercise = {};
  sessions.filter((s) => s.kind === "entreno").forEach((s) => {
    (s.exercises || []).forEach((e) => {
      (e.sets || []).forEach((set) => {
        if (typeof set.leftWeight === "number" && typeof set.rightWeight === "number" && (set.leftWeight > 0 || set.rightWeight > 0)) {
          if (!byExercise[e.name]) byExercise[e.name] = [];
          byExercise[e.name].push(set);
        }
      });
    });
  });
  return Object.entries(byExercise).map(([name, sets]) => {
    if (sets.length < 3) return null;
    const avgLeft = sets.reduce((a, s) => a + s.leftWeight, 0) / sets.length;
    const avgRight = sets.reduce((a, s) => a + s.rightWeight, 0) / sets.length;
    const pct = asymmetryPct(avgLeft, avgRight);
    const dominant = avgRight >= avgLeft ? "derecha" : "izquierda";
    return { name, avgLeft: Math.round(avgLeft), avgRight: Math.round(avgRight), pct, dominant };
  }).filter((r) => r && r.pct > 10);
}

function movementCategory(name) {
  const n = name.toLowerCase();
  if (/tiro|remate|disparo|lanzamiento|encest|gol\b|chut/.test(n)) return "tiro";
  if (/hip thrust|puente de glúteos|puente de gluteos/.test(n)) return "hipthrust";
  if (/peso muerto/.test(n)) return "pesomuerto";
  if (/curl/.test(n)) return "curl";
  if (/flexion|press|fondo/.test(n)) return "empuje";
  if (/domin|remo|jalón|jalon|tirón|tiron/.test(n)) return "tiron";
  if (/sentadill|zancada|squat|pistol/.test(n)) return "sentadilla";
  if (/plancha|abdomin|core|l-sit|hollow/.test(n)) return "core";
  if (/sprint|corre|carrera|velocidad/.test(n)) return "sprint";
  if (/salto|jump|pliom|cajón|cajon/.test(n)) return "salto";
  return "generic";
}

/* Emoji de respaldo por categoría de movimiento cuando no hay GIF real */
const MOVEMENT_EMOJIS = {
  empuje: "💪", tiron: "🏋️", sentadilla: "🦵", sprint: "⚡", core: "🔥",
  salto: "🦘", hipthrust: "🍑", curl: "💪", tiro: "⚽", pesomuerto: "🏋️", generic: "•",
};
function getExerciseEmoji(name) {
  return MOVEMENT_EMOJIS[movementCategory(name)] || MOVEMENT_EMOJIS.generic;
}

const MUSCLE_GROUP_LABELS = {
  empuje: "Pecho/Hombros", tiron: "Espalda", sentadilla: "Piernas", pesomuerto: "Piernas",
  curl: "Brazos", core: "Core", sprint: "Velocidad", salto: "Explosividad", tiro: "Tiro",
  hipthrust: "Glúteos", pecho: "Pecho", espalda: "Espalda", hombros: "Hombros", brazos: "Brazos",
  piernas: "Piernas", gluteos: "Glúteos", velocidad: "Velocidad",
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
  const daySet = new Set([...streakEligible(sessions).map((s) => dayKey(s.ts)), ...freezes]);
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
/* Doble progresión (3×8-12): sube reps hasta el techo, luego sube peso y vuelve al piso. Método estándar para hipertrofia. */
function calcDoubleProgression(entries) {
  if (!entries.length) return { weight: null, targetReps: 8, reason: "🌱 Primera vez — empieza ligero" };
  const last = entries[entries.length - 1];
  const okSets = last.sets.filter((s) => s.ok);
  const lastWeight = Math.max(...last.sets.map((x) => x.weight || 0));
  const targetMax = 12;
  const targetMin = 8;
  const lastReps = okSets.length ? Math.round(okSets.reduce((a, s) => a + s.reps, 0) / okSets.length) : targetMin;
  if (lastReps >= targetMax) {
    const nextWeight = lastWeight + 2.5;
    return { weight: nextWeight, targetReps: targetMin, up: true, reason: `✅ Llegaste a ${targetMax} reps → subimos a ${nextWeight}kg, volvemos a ${targetMin}` };
  }
  const nextReps = Math.min(targetMax, lastReps + 1);
  return { weight: lastWeight, targetReps: nextReps, up: false, reason: `Peso: ${lastWeight}kg → intenta ${nextReps} reps hoy` };
}

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

  /* Objetivos de hipertrofia/estética usan doble progresión; el resto mantiene el sistema de +2.5kg por RPE */
  const goalId = store.get("training_goal", null);
  if (goalId === "muscle" || goalId === "aesthetics") {
    const dp = calcDoubleProgression(entries);
    if (store.get(`reduce_${exName}`, false) && dp.weight) {
      const reduced = Math.max(0, Math.round(dp.weight * 0.9 * 2) / 2);
      return { ...dp, weight: reduced, up: false, reason: `↩ Bajamos a ${reduced}kg — técnica a mejorar en este ejercicio` };
    }
    return dp;
  }

  const last = entries[entries.length - 1];
  const maxW = Math.max(...last.sets.map((x) => x.weight || 0));
  if (maxW <= 0) return null;
  const allOk = last.sets.every((x) => x.ok);

  /* Ajuste según RPE (esfuerzo percibido) de las últimas sesiones */
  const last3 = entries.slice(-3);
  const rpes = last3.flatMap((s) => s.sets.map((x) => x.rpe)).filter((r) => typeof r === "number");
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const lastTwoMaxRpe = entries.slice(-2).map((s) => Math.max(0, ...s.sets.map((x) => x.rpe || 0)));
  const twoConsecutive10 = lastTwoMaxRpe.length === 2 && lastTwoMaxRpe.every((r) => r === 10);

  let result;
  if (twoConsecutive10) {
    const next = Math.round(maxW * 0.95 * 2) / 2;
    result = { weight: next, up: false, reason: `↩ Bajamos a ${next}kg — las últimas 2 sesiones fueron al máximo esfuerzo` };
  } else if (avgRpe !== null && avgRpe < 7) {
    const next = maxW + 5;
    result = { weight: next, up: true, reason: `💪 Esfuerzo bajo con ${maxW}kg → subimos a ${next}kg` };
  } else if (avgRpe !== null && avgRpe <= 8) {
    const next = maxW + 2.5;
    result = { weight: next, up: true, reason: `💪 Buen esfuerzo con ${maxW}kg → subimos a ${next}kg` };
  } else if (avgRpe !== null && avgRpe > 8.5) {
    result = { weight: maxW, up: false, reason: `→ Mantén ${maxW}kg — la última vez el esfuerzo fue muy alto` };
  } else if (allOk) {
    const next = maxW + 2.5;
    result = { weight: next, up: true, reason: `💪 Completaste todo con ${maxW}kg → subimos a ${next}kg` };
  } else {
    result = { weight: maxW, up: false, reason: `→ Mantén ${maxW}kg — la última vez fallaste alguna serie` };
  }

  /* Feedback de técnica: si se marcó "reducir" para este ejercicio, bajar un poco el peso sugerido */
  if (store.get(`reduce_${exName}`, false)) {
    const reduced = Math.max(0, Math.round(result.weight * 0.9 * 2) / 2);
    result = { weight: reduced, up: false, reason: `↩ Bajamos a ${reduced}kg — técnica a mejorar en este ejercicio` };
  }
  return result;
}

/* ─── Guías técnicas completas (bottom sheet) para los ejercicios principales ─── */
const EXERCISE_GUIDES = {
  "Sentadilla con barra": {
    setup: "Barra sobre trapecios medios. Pies a anchura de hombros. Puntas ligeramente abiertas (15-30°).",
    ejecucion: "Inicia el movimiento sacando las caderas hacia atrás Y abajo simultáneamente. Rodillas siguen la dirección de los pies. Baja hasta que muslos estén paralelos al suelo mínimo.",
    errores: "❌ Rodillas colapsando hacia adentro\n❌ Talones levantándose del suelo\n❌ Espalda redondeándose\n❌ Mirar hacia abajo",
    correcciones: "✅ Empuja rodillas hacia afuera activamente\n✅ Trabaja movilidad de tobillo\n✅ Pecho arriba, mirada al frente",
  },
  "Peso muerto rumano": {
    setup: "Barra pegada a las piernas. Agarre a la anchura de hombros. Espalda neutra desde el inicio.",
    ejecucion: "Empuja la cadera hacia atrás manteniendo la barra pegada a las piernas. Rodillas con flexión mínima y constante. Baja hasta sentir tensión en isquiotibiales.",
    errores: "❌ Redondear la espalda baja\n❌ Alejar la barra del cuerpo\n❌ Flexionar demasiado las rodillas (se vuelve sentadilla)",
    correcciones: "✅ Core apretado todo el recorrido\n✅ Barra siempre en contacto con las piernas\n✅ Sube empujando cadera hacia adelante",
  },
  "Peso muerto convencional": {
    setup: "Barra sobre el medio del pie. Espinillas casi tocando la barra. Agarre justo fuera de las piernas.",
    ejecucion: "Pecho arriba, espalda neutra, empuja el suelo con los pies para levantar la barra pegada al cuerpo hasta la extensión completa de cadera.",
    errores: "❌ Cadera sube antes que los hombros\n❌ Barra se aleja del cuerpo\n❌ Hiperextender la espalda arriba",
    correcciones: "✅ Tensa la espalda antes de tirar\n✅ Empuja el suelo, no tires con la espalda\n✅ Termina con cadera y hombros a la vez",
  },
  "Press banca con barra": {
    setup: "Omóplatos retraídos y hacia abajo. Pies firmes en el suelo. Agarre un poco más ancho que los hombros.",
    ejecucion: "Baja la barra de forma controlada hasta tocar el pecho a la altura de las tetillas. Empuja hacia arriba y ligeramente hacia atrás.",
    errores: "❌ Rebotar la barra en el pecho\n❌ Codos totalmente abiertos a 90°\n❌ Levantar la cadera del banco",
    correcciones: "✅ Codos a 45-60° del torso\n✅ Controla el descenso 2 segundos\n✅ Mantén los pies firmes y la cadera abajo",
  },
  "Dominadas": {
    setup: "Agarre prono, un poco más ancho que los hombros. Cuelga con los brazos completamente extendidos.",
    ejecucion: "Tira llevando el pecho hacia la barra, codos hacia abajo y atrás. Sube hasta que la barbilla pase la barra. Baja con control total.",
    errores: "❌ Usar impulso o balanceo\n❌ Rango de movimiento parcial\n❌ Encoger los hombros al inicio",
    correcciones: "✅ Inicia retrayendo el omóplato\n✅ Sube pensando en llevar los codos al bolsillo\n✅ Baja hasta extensión completa",
  },
  "Press militar con barra": {
    setup: "Barra a la altura de la clavícula. Agarre a la anchura de hombros. Core y glúteos apretados.",
    ejecucion: "Empuja la barra en línea recta hacia arriba, metiendo la cabeza ligeramente al pasar la cara. Termina con la barra sobre la cabeza y el cuerpo alineado.",
    errores: "❌ Arquear excesivamente la espalda baja\n❌ Empujar la barra hacia adelante\n❌ No bloquear el codo arriba",
    correcciones: "✅ Aprieta glúteos y abdomen para proteger la espalda\n✅ Barra viaja en línea recta\n✅ Extiende completamente arriba",
  },
  "Remo con barra": {
    setup: "Torso inclinado a 45°, espalda neutra. Agarre a la anchura de hombros. Rodillas con flexión leve.",
    ejecucion: "Tira de la barra hacia el abdomen bajo, codos pegados al cuerpo. Aprieta los omóplatos al final. Baja con control.",
    errores: "❌ Usar impulso de la espalda baja\n❌ Torso subiendo demasiado en cada rep\n❌ Tirar solo con los brazos",
    correcciones: "✅ Mantén el torso fijo en el ángulo inicial\n✅ Inicia el tirón con la espalda, no el bíceps\n✅ Aprieta al final del recorrido",
  },
  "Hip thrust": {
    setup: "Espalda superior apoyada en un banco. Barra sobre la cadera con protección. Pies a la anchura de hombros.",
    ejecucion: "Empuja con los talones para elevar la cadera hasta la extensión completa, apretando los glúteos arriba. Baja con control.",
    errores: "❌ Hiperextender la espalda baja arriba\n❌ Pies muy adelante o muy atrás\n❌ No llegar a la extensión completa",
    correcciones: "✅ Barbilla metida, mirada al frente\n✅ Ajusta la posición de los pies para 90° de rodilla arriba\n✅ Aprieta glúteos con fuerza al final",
  },
  "Curl nórdico": {
    setup: "Rodillas apoyadas en superficie acolchada. Tobillos anclados firmemente. Cuerpo recto de rodillas a cabeza.",
    ejecucion: "Baja el cuerpo lo más lento posible resistiendo con los isquiotibiales, usando las manos solo al final para amortiguar.",
    errores: "❌ Doblar la cadera durante la bajada\n❌ Caer sin control\n❌ Ir demasiado rápido",
    correcciones: "✅ Mantén cadera y torso en línea recta\n✅ Baja en 3-5 segundos mínimo\n✅ Usa asistencia (banda o pareja) si es necesario",
  },
  "Fondos en paralelas": {
    setup: "Brazos extendidos sobre las paralelas, hombros abajo y atrás. Cuerpo ligeramente inclinado adelante para enfatizar pecho.",
    ejecucion: "Baja con control flexionando los codos hasta 90° o sentir estiramiento en el pecho. Empuja de vuelta arriba sin bloquear de golpe.",
    errores: "❌ Bajar demasiado y forzar el hombro\n❌ Codos completamente abiertos\n❌ Balancear las piernas para impulsarse",
    correcciones: "✅ Codos cerca del cuerpo, no muy abiertos\n✅ Baja solo hasta donde el hombro esté cómodo\n✅ Controla todo el recorrido",
  },
  "Plancha": {
    setup: "Antebrazos y puntas de los pies en el suelo. Codos justo debajo de los hombros. Cuerpo en línea recta.",
    ejecucion: "Mantén la posición apretando abdomen y glúteos, sin dejar caer ni levantar la cadera.",
    errores: "❌ Cadera hundida hacia el suelo\n❌ Cadera muy elevada\n❌ Aguantar la respiración",
    correcciones: "✅ Imagina que te jalan del ombligo hacia la columna\n✅ Aprieta los glúteos para alinear la cadera\n✅ Respira de forma constante",
  },
};

function TechniqueGuideSheet({ exerciseName, tip, onClose }) {
  const guide = EXERCISE_GUIDES[exerciseName];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div
        className="card fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxHeight: "75vh", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>{exerciseName}</h3>
          <button onClick={onClose} style={{ fontSize: 18, color: C.mut, padding: 4 }}>✕</button>
        </div>
        {!guide ? (
          <p style={{ fontSize: 13, color: C.mut, marginTop: 12, lineHeight: 1.5 }}>💡 {tip}</p>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.cyan, letterSpacing: 1 }}>SETUP</p>
              <p style={{ fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.5 }}>{guide.setup}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.cyan, letterSpacing: 1 }}>EJECUCIÓN</p>
              <p style={{ fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.5 }}>{guide.ejecucion}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.red, letterSpacing: 1 }}>ERRORES COMUNES</p>
              <p style={{ fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-line" }}>{guide.errores}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: 1 }}>CORRECCIONES</p>
              <p style={{ fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-line" }}>{guide.correcciones}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Series de activación específicas por ejercicio principal (no cuentan en el historial) ─── */
const WARMUP_SETS = {
  "Sentadilla con barra": [
    { pct: 0.40, reps: 10, label: "Activación" },
    { pct: 0.60, reps: 5, label: "Activación" },
    { pct: 0.80, reps: 3, label: "Potenciación" },
  ],
  "Press banca": [
    { pct: 0.50, reps: 10, label: "Activación" },
    { pct: 0.70, reps: 5, label: "Activación" },
    { pct: 0.90, reps: 2, label: "Potenciación" },
  ],
  "Peso muerto convencional": [
    { pct: 0.40, reps: 8, label: "Activación" },
    { pct: 0.65, reps: 5, label: "Activación" },
    { pct: 0.80, reps: 3, label: "Potenciación" },
  ],
  "Press militar": [
    { pct: 0.50, reps: 10, label: "Activación" },
    { pct: 0.75, reps: 5, label: "Activación" },
  ],
  "Remo con barra": [
    { pct: 0.50, reps: 10, label: "Activación" },
    { pct: 0.75, reps: 5, label: "Activación" },
  ],
};

/* ─── Progresión lineal automática: sugiere el próximo peso según las últimas 3 sesiones ─── */
function calculateNextWeight(exerciseName, history) {
  const sessions = history
    .filter((s) => s.kind === "entreno" && s.exercises?.some((e) => e.name === exerciseName))
    .slice(-3);

  if (sessions.length === 0) {
    return { weight: null, message: "Primera vez — empieza ligero", trend: "new" };
  }

  const sessionData = sessions.map((s) => {
    const ex = s.exercises.find((e) => e.name === exerciseName);
    const completedSets = ex.sets.filter((st) => st.ok);
    const totalSets = ex.sets.length || 1;
    const avgWeight = completedSets.length > 0
      ? completedSets.reduce((a, st) => a + (parseFloat(st.weight) || 0), 0) / completedSets.length
      : 0;
    const completionRate = completedSets.length / totalSets;
    return { avgWeight, completionRate };
  });

  const lastSession = sessionData[sessionData.length - 1];

  if (lastSession.completionRate === 1) {
    const increment = lastSession.avgWeight >= 100 ? 5 : lastSession.avgWeight >= 60 ? 2.5 : 1.25;
    const next = Math.round((lastSession.avgWeight + increment) * 4) / 4;
    return { weight: next, message: `↑ Completaste todo. Sube a ${next}kg`, trend: "up" };
  }

  if (lastSession.completionRate < 0.7) {
    const decrease = lastSession.avgWeight * 0.1;
    const newWeight = Math.round((lastSession.avgWeight - decrease) / 2.5) * 2.5;
    return { weight: newWeight, message: `↓ Reduce el peso. Prueba ${newWeight}kg`, trend: "down" };
  }

  return { weight: Math.round(lastSession.avgWeight * 4) / 4, message: `→ Mantén ${Math.round(lastSession.avgWeight * 4) / 4}kg`, trend: "same" };
}

/* ─── Predicción de récord (regresión lineal simple) ─── */
function predictRecord(sessions, exercise) {
  const relevant = sessions
    .filter((s) => s.kind === "entreno" && s.exercises.some((e) => e.name === exercise))
    .slice(-8)
    .sort((a, b) => a.ts - b.ts);
  if (relevant.length < 3) return null;

  const points = relevant.map((s, i) => {
    const ex = s.exercises.find((e) => e.name === exercise);
    const okWeights = ex.sets.filter((st) => st.ok).map((st) => st.weight || 0);
    return { x: i, y: okWeights.length ? Math.max(...okWeights) : 0 };
  });
  if (points.every((p) => p.y === 0)) return null;

  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const in4weeks = intercept + slope * (n + 8);
  const in8weeks = intercept + slope * (n + 16);

  return {
    in4weeks: Math.max(0, Math.round(in4weeks / 2.5) * 2.5),
    in8weeks: Math.max(0, Math.round(in8weeks / 2.5) * 2.5),
    trend: slope > 0.5 ? "rising" : slope > 0 ? "stable" : "falling",
  };
}

/* ─── Comparativa visual de progresión (hitos con animales) ─── */
const WEIGHT_MILESTONES = {
  sentadilla: [
    { w: 20, emoji: "🐇", name: "Conejo" }, { w: 40, emoji: "🐕", name: "Perro" },
    { w: 60, emoji: "🦊", name: "Zorro" }, { w: 80, emoji: "🐺", name: "Lobo" },
    { w: 100, emoji: "🐻", name: "Oso" }, { w: 130, emoji: "🦁", name: "León" },
    { w: 160, emoji: "🐯", name: "Tigre" }, { w: 200, emoji: "🦍", name: "Gorila" },
  ],
  press: [
    { w: 20, emoji: "🐇", name: "Conejo" }, { w: 40, emoji: "🦆", name: "Pato" },
    { w: 60, emoji: "🐕", name: "Perro" }, { w: 80, emoji: "🐺", name: "Lobo" },
    { w: 100, emoji: "🦁", name: "León" }, { w: 130, emoji: "🐂", name: "Toro" },
    { w: 160, emoji: "🦏", name: "Rinoceronte" },
  ],
  dominadas: [
    { w: 1, emoji: "🐣", name: "Pollito" }, { w: 4, emoji: "🐦", name: "Pájaro" },
    { w: 7, emoji: "🐒", name: "Mono" }, { w: 11, emoji: "🦧", name: "Orangután" },
    { w: 16, emoji: "🦍", name: "Gorila" }, { w: 21, emoji: "👽", name: "Alien" },
  ],
};

function milestoneKeyForExercise(name) {
  const n = name.toLowerCase();
  if (/dominad/.test(n)) return "dominadas";
  if (/sentadilla|squat|pistol/.test(n)) return "sentadilla";
  if (/press banca|press de banca|bench/.test(n)) return "press";
  return null;
}

function ProgressTimeline({ exercise, currentValue }) {
  const key = milestoneKeyForExercise(exercise);
  if (!key) return null;
  const milestones = WEIGHT_MILESTONES[key];
  return (
    <div className="card" style={{ marginTop: 10, overflowX: "auto" }}>
      <p style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>LÍNEA DE PROGRESIÓN</p>
      <div style={{ display: "flex", gap: 14, marginTop: 10, paddingBottom: 4 }}>
        {milestones.map((m) => {
          const reached = currentValue >= m.w;
          return (
            <div key={m.w} style={{ textAlign: "center", minWidth: 52, opacity: reached ? 1 : 0.4, flexShrink: 0 }}>
              <div style={{ fontSize: 26 }}>{reached ? m.emoji : "🔒"}</div>
              <div style={{ fontSize: 10, color: reached ? C.text : C.dim, fontWeight: 700, marginTop: 2 }}>{m.name}</div>
              <div style={{ fontSize: 9, color: C.dim }}>{m.w}{key === "dominadas" ? " reps" : "kg"}</div>
              {reached && <div style={{ fontSize: 10, color: C.green }}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* RPE promedio histórico de un ejercicio */
function avgRpeFor(sessions, exName) {
  const rpes = [];
  sessions.forEach((s) => {
    if (s.kind !== "entreno") return;
    s.exercises.forEach((e) => {
      if (e.name === exName) e.sets.forEach((st) => { if (typeof st.rpe === "number") rpes.push(st.rpe); });
    });
  });
  if (!rpes.length) return null;
  return rpes.reduce((a, b) => a + b, 0) / rpes.length;
}

function rpeColor(avg) {
  if (avg < 7) return C.green;
  if (avg <= 8) return C.yellow;
  if (avg <= 9) return C.orange;
  return C.red;
}

/* ─── Orden de disciplinas para agrupar récords ─── */
const DISC_ORDER = ["gimnasio", "calistenia", "futbolGym", "futbolParque", "basquetCancha", "basquetSinCancha", "atletismo", "especial", "custom"];

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
  const days = [...new Set(streakEligible(sessions).map((s) => dayKey(s.ts)))]
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

/* ─── Puntos de esfuerzo (XP total, sin rangos paralelos) ─── */
function computeXP(sessions, achievementsUnlockedCount, bestStreak) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const totalSets = workouts.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.filter((st) => st.ok).length, 0), 0);
  const perfectSessions = workouts.filter((s) => s.exercises.every((e) => e.sets.length > 0 && e.sets.every((st) => st.ok))).length;
  const recordsBonus = computeRecords(sessions).length * 200;
  const cooldownBonus = workouts.filter((s) => s.cooldownBonus).length * 50;
  const otherBonus = store.get("bonus_xp", 0); // agua y otras bonificaciones acumuladas
  const xp = workouts.length * 100
    + totalSets * 10
    + perfectSessions * 150
    + achievementsUnlockedCount * 300
    + Math.floor(bestStreak / 7) * 500
    + recordsBonus
    + cooldownBonus
    + otherBonus;
  return { xp };
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

  /* Insights de alta prioridad basados en datos reales recientes */
  const firstSessionDate = store.get("first_session_date", null);
  const weeksActive = firstSessionDate ? (Date.now() - firstSessionDate) / (7 * 86400000) : 0;
  const acwr = calcACWR(sessions);
  if (acwr !== null && acwr > 1.3) {
    return `📊 Carga alta esta semana (ACWR ${acwr.toFixed(1)}). Mantén la intensidad moderada.`;
  }
  if (acwr !== null && acwr >= 0.8 && acwr <= 1.3 && weeksActive > 2) {
    return "📈 Progresando bien — carga óptima esta semana";
  }

  const jumpHistory = store.get("jump_history", []);
  const jumpBase = jumpBaseline();
  const latestJump = jumpHistory.length ? jumpHistory[jumpHistory.length - 1].height : null;
  if (jumpBase && latestJump && latestJump < jumpBase * 0.9) {
    return "📉 Potencia baja hoy — evita sprints máximos";
  }

  const asymmetries = calcAsymmetryByExercise(sessions);
  const worstAsymmetry = asymmetries.length ? asymmetries.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  if (worstAsymmetry && worstAsymmetry.pct > 12) {
    const weak = worstAsymmetry.dominant === "derecha" ? "izquierda" : "derecha";
    return `⚖️ Tu lado ${worstAsymmetry.dominant} es ${worstAsymmetry.pct}% más fuerte en ${worstAsymmetry.name}. Empieza por el lado ${weak} hoy.`;
  }

  const partidos = sessions.filter((s) => s.kind === "partido").sort((a, b) => b.ts - a.ts);
  const daysSinceMatch = partidos.length ? (Date.now() - partidos[0].ts) / 86400000 : null;
  if (partidos.length && partidos[0].rpe > 8 && daysSinceMatch <= 1) {
    return "🔴 Partido intenso ayer — considera movilidad hoy";
  }

  const lastAtletismo = [...workouts].reverse().find((s) => s.disc === "atletismo");
  const daysSinceAtletismo = lastAtletismo ? (Date.now() - lastAtletismo.ts) / 86400000 : Infinity;
  const goal = getTrainingGoal();
  const favDisc = Object.entries(workouts.reduce((acc, s) => { acc[s.disc] = (acc[s.disc] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0];
  const wantsSpeed = goal?.id === "athletic" || favDisc === "futbolGym" || favDisc === "futbolParque";
  if (daysSinceAtletismo >= 21 && wantsSpeed) {
    return "⚡ Sin correr en 3 semanas — añade un sprint hoy";
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
  const validCandidates = candidates.filter(Boolean);
  if (!validCandidates.length) return "Sigue entrenando para desbloquear insights 💡";
  return validCandidates[dayOfYear % validCandidates.length];
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
    { discId: "gimnasio", focusId: "push", label: "Gimnasio — Push (Pecho, hombros, tríceps)" },
    { discId: "gimnasio", focusId: "pull", label: "Gimnasio — Pull (Espalda, bíceps)" },
    { discId: "gimnasio", focusId: "legs", label: "Gimnasio — Legs (Piernas)" },
    { discId: "gimnasio", focusId: "upper", label: "Gimnasio — Upper Body" },
    { discId: "gimnasio", focusId: "full_body", label: "Gimnasio — Full Body" },
    { discId: "gimnasio", focusId: "glutes_focus", label: "Gimnasio — Glúteos y forma" },
  ],
  musculo: [
    { discId: "gimnasio", focusId: "push", label: "Gimnasio — Push" },
    { discId: "gimnasio", focusId: "pull", label: "Gimnasio — Pull" },
    { discId: "calistenia", focusId: "core", label: "Calistenia — Core" },
    { discId: "gimnasio", focusId: "legs", label: "Gimnasio — Legs" },
    { discId: "gimnasio", focusId: "upper", label: "Gimnasio — Upper Body" },
    { discId: "gimnasio", focusId: "arms", label: "Gimnasio — Brazos" },
  ],
  resistencia: [
    { discId: "futbolParque", focusId: "pivote", label: "Fútbol Parque — Pivote/Contención" },
    { discId: "calistenia", focusId: "explosivo", label: "Calistenia — Full body explosivo" },
    { discId: "atletismo", focusId: "5km", label: "Atletismo — 5 km" },
    { discId: "calistenia", focusId: "core", label: "Calistenia — Core" },
    { discId: "futbolParque", focusId: "extremo", label: "Fútbol Parque — Extremo" },
    { discId: "atletismo", focusId: "1000m", label: "Atletismo — 1000 m" },
  ],
  futbol: [
    { discId: "futbolGym", focusId: "defensaCentral", label: "Fútbol Gimnasio — Defensa Central" },
    { discId: "futbolParque", focusId: "delantero", label: "Fútbol Parque — Delantero" },
    { discId: "futbolGym", focusId: "extremo", label: "Fútbol Gimnasio — Extremo" },
    { discId: "futbolParque", focusId: "mediocampista", label: "Fútbol Parque — Mediocampista" },
    { discId: "futbolGym", focusId: "pivote", label: "Fútbol Gimnasio — Pivote/Contención" },
    { discId: "futbolParque", focusId: "lateral", label: "Fútbol Parque — Lateral" },
  ],
  atletismo: [
    { discId: "atletismo", focusId: "1000m", label: "Atletismo — 1000 m" },
    { discId: "gimnasio", focusId: "legs", label: "Gimnasio — Piernas (fuerza)" },
    { discId: "atletismo", focusId: "100m", label: "Atletismo — 100 m" },
    { discId: "calistenia", focusId: "explosivo", label: "Calistenia — Explosivo" },
    { discId: "atletismo", focusId: "5km", label: "Atletismo — 5 km" },
    { discId: "atletismo", focusId: "400m", label: "Atletismo — 400 m" },
  ],
};
const PLAN_DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const PLAN_TRAIN_SLOTS = { 3: [0, 2, 4], 4: [0, 2, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };

// eslint-disable-next-line no-unused-vars -- ya no tiene acceso desde Progreso (PlanWizard); se deja sin eliminar
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

/* ─── Semana completa sugerida al elegir un enfoque de Gimnasio específico ─── */
const FOCUS_WEEK_TEMPLATES = {
  glutes_focus: {
    name: "Programa glúteos y piernas",
    description: "Enfoque principal en glúteos y piernas pero con trabajo de todo el cuerpo para equilibrio.",
    days: {
      1: { discId: "gimnasio", focusId: "glutes_focus", label: "Glúteos y piernas (principal)" },
      2: { discId: "gimnasio", focusId: "push", label: "Push (equilibrio superior)" },
      3: { rest: true, label: "Descanso" },
      4: { discId: "gimnasio", focusId: "glutes_focus", label: "Glúteos y piernas (variación)" },
      5: { discId: "gimnasio", focusId: "pull", label: "Pull (espalda y bíceps)" },
      6: { discId: "cuerpo", label: "Movilidad activa" },
      7: { rest: true, label: "Descanso" },
    },
  },
  v_shape: {
    name: "Programa forma en V",
    description: "Espalda ancha y hombros con trabajo equilibrado del resto del cuerpo.",
    days: {
      1: { discId: "gimnasio", focusId: "v_shape", label: "Forma en V (principal)" },
      2: { discId: "gimnasio", focusId: "legs", label: "Piernas (equilibrio)" },
      3: { rest: true, label: "Descanso" },
      4: { discId: "gimnasio", focusId: "v_shape", label: "Forma en V (variación)" },
      5: { discId: "gimnasio", focusId: "push", label: "Push (pecho y hombros)" },
      6: { discId: "cuerpo", label: "Movilidad" },
      7: { rest: true, label: "Descanso" },
    },
  },
  push: {
    name: "PPL — Semana tipo",
    description: "Push/Pull/Legs con distribución óptima.",
    days: {
      1: { discId: "gimnasio", focusId: "push", label: "Push" },
      2: { discId: "gimnasio", focusId: "pull", label: "Pull" },
      3: { discId: "gimnasio", focusId: "legs", label: "Legs" },
      4: { rest: true, label: "Descanso" },
      5: { discId: "gimnasio", focusId: "push", label: "Push (variación)" },
      6: { discId: "gimnasio", focusId: "pull", label: "Pull (variación)" },
      7: { discId: "gimnasio", focusId: "legs", label: "Legs (variación)" },
    },
  },
};

function generateFocusWeek(focusId) {
  const tpl = FOCUS_WEEK_TEMPLATES[focusId];
  if (!tpl) return null;
  const plan = PLAN_DAY_NAMES.map((name, i) => {
    const d = tpl.days[i + 1];
    if (!d) return { day: name, rest: true, label: "Descanso" };
    return { day: name, ...d };
  });
  return { focusId, name: tpl.name, description: tpl.description, plan, createdTs: Date.now() };
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
  return getMascot(streak);
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

/* ─── Escalado real de dificultad por nivel (Iniciado→THE ONE) ───
   setsAdd: series extra sobre la base del ejercicio
   restMin/restMax: rango real de descanso en segundos para el nivel
   intensityLabel: etiqueta de intensidad relativa mostrada en la rutina */
const LEVEL_SCALING = [
  { setsAdd: 0, restMin: 90, restMax: 120, intensityLabel: "Suave" },
  { setsAdd: 0, restMin: 75, restMax: 90, intensityLabel: "Moderada" },
  { setsAdd: 1, restMin: 60, restMax: 75, intensityLabel: "Exigente" },
  { setsAdd: 1, restMin: 45, restMax: 60, intensityLabel: "Alta" },
  { setsAdd: 2, restMin: 30, restMax: 45, intensityLabel: "Muy alta" },
  { setsAdd: 2, restMin: 15, restMax: 30, intensityLabel: "Máxima" },
];

/* ─── Esquemas de series inteligentes ─── */
const SCHEMES = {
  standard: { name: "Estándar", desc: "Series × reps igual en todas" },
  pyramid: {
    name: "Pirámide", desc: "Subir peso, bajar reps cada serie",
    repsPerSet: [12, 10, 8, 6], weightMultiplier: [0.70, 0.80, 0.90, 1.0],
  },
  reverse_pyramid: {
    name: "Pirámide inversa", desc: "Peso máximo primero, bajar peso y subir reps",
    repsPerSet: [5, 8, 12], weightMultiplier: [1.0, 0.85, 0.75],
  },
  dropset: { name: "Drop set", desc: "Falla → baja 20% → falla de nuevo" },
  cluster: { name: "Cluster", desc: "5 reps, 15s pausa, 5 reps más = 1 set" },
};

/* Asigna esquema según nivel: Iniciado/Guerrero siempre estándar,
   Campeón introduce pirámide en la última posición, Élite usa pirámide
   inversa en el primer ejercicio (principal), Leyenda/THE ONE usan
   drop set / cluster en los ejercicios principales. */
function schemeForExercise(lvlIdx, exIndex, totalExercises) {
  if (lvlIdx <= 1) return "standard";
  if (lvlIdx === 2) return exIndex === totalExercises - 1 ? "pyramid" : "standard";
  if (lvlIdx === 3) return exIndex === 0 ? "reverse_pyramid" : "standard";
  if (lvlIdx === 4) return exIndex === 0 ? "dropset" : exIndex === 1 ? "pyramid" : "standard";
  return exIndex === 0 ? "cluster" : exIndex === 1 ? "dropset" : "reverse_pyramid";
}

function levelFromCount(count, thresholds) {
  let idx = 0;
  thresholds.forEach((t, i) => {
    if (count >= t) idx = i;
  });
  return idx;
}

/* ─── Rutinas fijas de Básquetbol por nivel (con cancha / sin cancha) ─── */
const REST_BY_LEVEL = [105, 82, 67, 52, 37, 20];

function fixedItem(it) {
  const val = String(it.reps).trim();
  const isTime = /\bmin\b/.test(val) || /\d\s*s\b/.test(val);
  return { name: it.name, type: isTime ? "tiempo" : "reps", sets: it.sets, reps: it.reps, rest: undefined, tip: it.tip, tag: null };
}

const BASQUET_CANCHA_BY_LEVEL = [
  [
    { name: "Tiro libre", sets: 2, reps: "20 intentos", tip: "Pies paralelos, codo bajo el balón, sigue el arco." },
    { name: "Bote con mano débil", sets: 2, reps: "1 min", tip: "Control sin mirar el balón." },
    { name: "Layup derecho", sets: 2, reps: "10", tip: "2 pasos, sube rodilla, toca el cuadro." },
    { name: "Layup izquierdo", sets: 2, reps: "10", tip: "Lado débil, mismo movimiento." },
    { name: "Defensa stance", sets: 2, reps: "30s", tip: "Caderas bajas, pies activos, manos arriba." },
  ],
  [
    { name: "Tiro media distancia", sets: 3, reps: "15 intentos", tip: "Catch-shoot. Sin bote innecesario." },
    { name: "Bote slalom entre conos", sets: 3, reps: "45s", tip: "Cabeza arriba, visión del campo." },
    { name: "Sliding defensivo lateral", sets: 3, reps: "20m", tip: "Sin cruzar pies. Mantén stance." },
    { name: "Salto vertical al aro", sets: 3, reps: "8", tip: "Máximo esfuerzo, caída controlada." },
    { name: "Pull-up jumper", sets: 3, reps: "10", tip: "Para + sube + dispara en un movimiento." },
  ],
  [
    { name: "Tiro en movimiento", sets: 4, reps: "10", tip: "Recibe en carrera, equilibrio inmediato." },
    { name: "Crossover + penetración", sets: 4, reps: "8 c/lado", tip: "Explota después del crossover." },
    { name: "Closeout defensivo", sets: 4, reps: "6", tip: "Sprint + freno + manos arriba sin foul." },
    { name: "Salto vertical máximo", sets: 4, reps: "6", tip: "Balanceo de brazos completo." },
    { name: "Floater", sets: 3, reps: "10", tip: "Arco alto para pasar el bloqueo." },
  ],
  [
    { name: "Step-back jumper", sets: 4, reps: "8", tip: "Paso atrás explosivo, equilibrio perfecto." },
    { name: "Footwork defensivo avanzado", sets: 4, reps: "45s", tip: "Anticipa, no reacciones." },
    { name: "Reverse layup", sets: 4, reps: "8 c/lado", tip: "Protege el balón del defensor." },
    { name: "Intento de mate o salto máximo", sets: 4, reps: "5", tip: "Máxima explosividad, cada intento." },
    { name: "Catch and shoot desde triple", sets: 4, reps: "10", tip: "Pies listos antes de recibir." },
  ],
  [
    { name: "Fadeaway", sets: 5, reps: "8", tip: "Inclinación mínima, balance perfecto." },
    { name: "Manejo combinado 1 min", sets: 5, reps: "1 min", tip: "Entre piernas + behind back sin pausas." },
    { name: "Simulación defensa full court", sets: 3, reps: "2 min", tip: "Presión constante sin perder posición." },
    { name: "Mate o salto explosivo máximo", sets: 5, reps: "3", tip: "Todo en cada salto. Sin medias tintas." },
    { name: "Tiro desde logo", sets: 3, reps: "10 intentos", tip: "Base perfecta, arco alto." },
  ],
  [
    { name: "500 tiros distribuidos", sets: 1, reps: "500 tiros", tip: "Tiro libre, media, triple, movimiento. Contar aciertos." },
    { name: "Defensa 1vs1 all-court simulada", sets: 5, reps: "3 min", tip: "Sin descanso mental. Anticipación total." },
    { name: "Depth jumps pliométricos", sets: 5, reps: "6", tip: "Caída + reacción explosiva inmediata." },
    { name: "Manejo bajo fatiga", sets: 4, reps: "1 min", tip: "Los errores de manejo son errores de concentración, no de habilidad." },
    { name: "4to cuarto simulado", sets: 8, reps: "1 ronda", tip: "Sprint 28m + tiro + sprint vuelta + defensa. Sin descanso entre elementos." },
  ],
];

const BASQUET_SIN_CANCHA_BY_LEVEL = [
  [
    { name: "Sentadilla base", sets: 3, reps: "15", tip: "Base del salto vertical." },
    { name: "Salto vertical", sets: 3, reps: "10", tip: "Máxima altura, caída suave." },
    { name: "Plancha", sets: 3, reps: "30s", tip: "Core estable = menos lesiones." },
    { name: "Skipping alto", sets: 3, reps: "30s", tip: "Rodillas al pecho, brazos activos." },
  ],
  [
    { name: "Sentadilla búlgara", sets: 3, reps: "8 c/pierna", tip: "Rodilla trasera baja, torso recto." },
    { name: "Salto con sentadilla", sets: 3, reps: "10", tip: "Explota en cada rep." },
    { name: "Plancha con toque hombro", sets: 3, reps: "16", tip: "Caderas estables, sin rotación." },
    { name: "Sprints laterales", sets: 4, reps: "10m", tip: "Simula defensa lateral en cancha." },
  ],
  [
    { name: "Sentadilla búlgara con salto", sets: 4, reps: "8 c/pierna", tip: "Explota al subir, aterriza suave." },
    { name: "Saltos al cajón", sets: 4, reps: "8", tip: "Sube con potencia, baja caminando." },
    { name: "Plancha con elevación de pierna", sets: 4, reps: "20", tip: "Cadera estable en todo momento." },
    { name: "Sprints laterales con cambio", sets: 5, reps: "12m", tip: "Explota en cada cambio de dirección." },
  ],
  [
    { name: "Pistol squat asistido", sets: 4, reps: "6 c/pierna", tip: "Control total en el descenso." },
    { name: "Saltos explosivos al cajón alto", sets: 5, reps: "6", tip: "Máxima altura, recuperación completa." },
    { name: "Plancha dinámica con toques", sets: 5, reps: "24", tip: "Ritmo rápido sin perder forma." },
    { name: "Sprints laterales explosivos", sets: 5, reps: "15m", tip: "Máxima velocidad de reacción." },
  ],
  [
    { name: "Pistol squat completo", sets: 5, reps: "8 c/pierna", tip: "Sin apoyo, control absoluto." },
    { name: "Saltos de profundidad (depth jump)", sets: 5, reps: "6", tip: "Caída y reacción explosiva inmediata." },
    { name: "Plancha con combinación de movimientos", sets: 5, reps: "30", tip: "Sin pausas entre variaciones." },
    { name: "Sprints laterales bajo fatiga", sets: 6, reps: "15m", tip: "Mantén velocidad incluso cansado." },
  ],
  [
    { name: "Pistol squat con salto", sets: 6, reps: "6 c/pierna", tip: "Explosividad y control en cada rep." },
    { name: "Depth jumps máximos", sets: 6, reps: "8", tip: "Reacción máxima, cero titubeo." },
    { name: "Circuito core de élite", sets: 6, reps: "40", tip: "Cada movimiento a máxima intensidad." },
    { name: "Sprints laterales de competencia", sets: 8, reps: "15m", tip: "Ritmo de partido profesional, sin bajar nunca." },
  ],
];

/* ─── Orden lógico de ejercicios: compuestos primero, core siempre al final ─── */
const EXERCISE_ORDER_PRIORITY = { compound_primary: 1, compound_secondary: 2, assistance: 3, core: 4 };

function classifyExerciseOrder(name) {
  const n = name.toLowerCase();
  if (["sentadilla", "peso muerto", "press banca", "dominadas", "press militar", "hip thrust"].some((e) => n.includes(e))) {
    return "compound_primary";
  }
  if (["remo", "fondos", "press inclinado", "jalón", "jalon", "press polea"].some((e) => n.includes(e))) {
    return "compound_secondary";
  }
  if (["plancha", "abdomin", "core", "crunch", "rueda", "l-sit", "hollow"].some((e) => n.includes(e))) {
    return "core";
  }
  return "assistance";
}

function sortExercises(exercises) {
  return [...exercises].sort((a, b) => EXERCISE_ORDER_PRIORITY[classifyExerciseOrder(a.name)] - EXERCISE_ORDER_PRIORITY[classifyExerciseOrder(b.name)]);
}

/* Sugerencia de grupo muscular complementario para la próxima sesión de gimnasio */
const NEXT_MUSCLE_SUGGESTION = {
  pecho: "Espalda y bíceps", espalda: "Pecho y tríceps", piernas: "Tren superior",
  hombros: "Piernas y core", brazos: "Piernas", gluteos: "Tren superior",
  sup: "Piernas y glúteos", inf: "Pecho, espalda y hombros", todo: "Un enfoque específico mañana",
};
function nextMuscleSuggestion(focusLabel) {
  const focusKey = Object.keys(NEXT_MUSCLE_SUGGESTION).find((k) => focusLabel?.toLowerCase().includes(k));
  return NEXT_MUSCLE_SUGGESTION[focusKey] || "Otro grupo muscular";
}

/* ─── DUP: Daily Undulating Periodization — el esquema rota cada sesión del mismo enfoque ─── */
const DUP_SCHEMES = {
  strength: { name: "Fuerza", color: C.red, sets: 4, reps: "3-5", pct: [0.85, 0.90], restMin: 180, restMax: 300 },
  hypertrophy: { name: "Hipertrofia", color: C.green, sets: 3, reps: "8-12", pct: [0.67, 0.75], restMin: 60, restMax: 90 },
  endurance: { name: "Resistencia", color: C.cyan, sets: 3, reps: "15-20", pct: [0.55, 0.65], restMin: 30, restMax: 45 },
};
const DUP_ROTATION = { strength: "hypertrophy", hypertrophy: "endurance", endurance: "strength" };

function getDUPDay(sessions, focusLabel) {
  const relevant = sessions
    .filter((s) => s.kind === "entreno" && s.disc === "gimnasio" && s.focusLabel === focusLabel && s.dupType)
    .slice(-3);
  const lastType = relevant[relevant.length - 1]?.dupType || "endurance";
  return DUP_ROTATION[lastType] || "strength";
}

/* Descanso coherente según el rango de repeticiones: fuerza (1-5) 3-5min,
   hipertrofia (6-12) 60-90s, resistencia (13+) 30-45s */
function repRangeRestBounds(repsStr) {
  const match = String(repsStr).match(/(\d+)/);
  const reps = match ? parseInt(match[1], 10) : 10;
  if (reps <= 5) return [180, 300];
  if (reps <= 12) return [60, 90];
  return [30, 45];
}

/* Volumen total (en series) objetivo por nivel para sesiones de gimnasio */
const GYM_VOLUME_TARGET = [11, 13, 16, 20, 22, 25];

function genBasquetRoutine(discId, lvlIdx, deloadActive) {
  const effLvlIdx = Math.max(0, Math.min(5, deloadActive ? lvlIdx - 1 : lvlIdx));
  const table = discId === "basquetCancha" ? BASQUET_CANCHA_BY_LEVEL : BASQUET_SIN_CANCHA_BY_LEVEL;
  const list = table[effLvlIdx] || table[0];
  let rest = REST_BY_LEVEL[effLvlIdx];
  return sortExercises(list.map((it) => {
    const r = fixedItem(it);
    let sets = r.sets;
    if (deloadActive) { sets = Math.max(1, Math.round(sets * 0.6)); rest = Math.round(rest * 1.3); }
    return { ...r, sets, rest, intensity: LEVEL_SCALING[effLvlIdx]?.intensityLabel };
  }));
}

/* ─── Educación integrada: texto breve mostrado antes de cada sesión ─── */
const SESSION_EDUCATION = {
  "gimnasio:pecho": "Hoy entrenas pecho, hombros y tríceps. Trabajan juntos en todos los empujes. Compuestos primero, aislamiento al final. El pecho crece con sobrecarga progresiva.",
  "gimnasio:espalda": "La espalda es el músculo más grande del tren superior. Dominadas y remo son los reyes. Una espalda fuerte previene lesiones de hombro y mejora todos los otros ejercicios.",
  "gimnasio:piernas": "El 70% de tu masa muscular está en las piernas. La sentadilla y el peso muerto liberan más hormona de crecimiento que cualquier otro ejercicio. No las saltes.",
  "gimnasio:hombros": "Los hombros mueven en todas direcciones. Trabaja las tres cabezas del deltoides y el manguito rotador para hombros fuertes y sin lesiones.",
  "gimnasio:brazos": "Bíceps y tríceps ya trabajan en cada empuje y jalón. Este día los aísla para el detalle final.",
  "calistenia:todo": "El peso corporal entrena fuerza relativa. Eso significa más control, más coordinación y menos lesiones que el peso libre. Los gimnastas son de los atletas más fuertes.",
  "atletismo:sprint": "Los sprints máximos requieren CNS fresco. Por eso van primero siempre. Cada sprint al 95-100%. Sin medias tintas. La velocidad no se mejora yendo suave.",
  "futbol:portero": "El portero vive de reflejos y explosividad. Cada caída y cada salida deben ser técnica pura antes que fuerza bruta.",
  "futbol:defensaCentral": "El defensa central gana partidos en los duelos aéreos y de fuerza. Tu trabajo hoy: piernas fuertes y posicionamiento.",
  "futbol:lateral": "El lateral corre la banda completa, ida y vuelta, todo el partido. Resistencia de velocidad es tu arma principal.",
  "futbol:pivote": "El pivote recupera balones y protege la defensa. Fuerza en los duelos y resistencia para estar siempre cerca del balón.",
  "futbol:mediocampista": "El mediocampista moderno corre 11-13km por partido. Tu trabajo hoy: resistencia aeróbica y técnica bajo fatiga.",
  "futbol:extremo": "El extremo moderno corre entre 10-13km por partido. 60% a alta intensidad. Tu trabajo hoy: velocidad explosiva y resistencia de velocidad. Sin esto el talento técnico no alcanza.",
  "futbol:delantero": "El delantero decide partidos en los primeros metros y el primer toque. Explosividad y definición son tu prioridad hoy.",
  "basquet:todo": "El básquetbol combina explosividad, técnica fina y resistencia. Cada sesión construye una de esas tres piezas.",
};

function getSessionEducation(plan) {
  if (plan.discId === "gimnasio") {
    const f = (plan.focusLabel || "").toLowerCase();
    const key = ["pecho", "espalda", "piernas", "hombros", "brazos"].find((k) => f.includes(k));
    return key ? SESSION_EDUCATION[`gimnasio:${key}`] : null;
  }
  if (plan.discId === "calistenia") return SESSION_EDUCATION["calistenia:todo"];
  if (plan.discId === "atletismo") return SESSION_EDUCATION["atletismo:sprint"];
  if (plan.discId?.startsWith("futbol")) {
    const f = (plan.focusLabel || "").toLowerCase();
    const posMap = [
      ["portero", "portero"], ["defensa", "defensaCentral"], ["lateral", "lateral"],
      ["pivote", "pivote"], ["mediocampista", "mediocampista"], ["extremo", "extremo"], ["delantero", "delantero"],
    ];
    const found = posMap.find(([needle]) => f.includes(needle));
    return found ? SESSION_EDUCATION[`futbol:${found[1]}`] : null;
  }
  if (plan.discId?.startsWith("basquet")) return SESSION_EDUCATION["basquet:todo"];
  return null;
}

/* ─── Rutinas fijas de Fútbol Parque por posición (Iniciado + THE ONE dados; se interpolan los niveles intermedios) ─── */
const FUTBOL_POSITION_PARQUE = {
  portero: {
    iniciado: [
      { name: "Caída lateral técnica", sets: 3, reps: "5 c/lado", tip: "Técnica antes que velocidad. Caer de lado, no de espalda." },
      { name: "Salto y recepción", sets: 3, reps: "10", tip: "Manos firmes, absorber el impacto." },
      { name: "Saque con pie", sets: 3, reps: "10", tip: "Contacto en el empeine, seguimiento del pie." },
      { name: "Agilidad en arco (conos)", sets: 3, reps: "45s", tip: "Salidas laterales desde centro del arco." },
    ],
    medio: [
      { name: "Caída lateral + levantada rápida", sets: 4, reps: "6 c/lado", tip: "De menos de 1.5s por repetición." },
      { name: "Salto vertical al punto más alto", sets: 4, reps: "8", tip: "Extensión completa. Dedos extendidos al máximo." },
      { name: "Saque con pie a distancia", sets: 3, reps: "10", tip: "Contacto en empeine. Rodilla flexionada al impactar." },
      { name: "Agilidad en arco (slalom conos)", sets: 4, reps: "45s", tip: "Salidas laterales explosivas. Manos activas." },
      { name: "Posicionamiento 1vs1", sets: 4, reps: "5", tip: "Achique progresivo. Hacerse grande sin tirarse." },
    ],
    theOne: [
      { name: "Reacción explosiva: caída+levantada+tiro", sets: 5, reps: "6", tip: "Tiempo total < 2s por repetición." },
      { name: "Salto máximo con extensión", sets: 5, reps: "8", tip: "Dedos tocan la barra del arco." },
      { name: "Manejo bajo presión", sets: 5, reps: "2 min", tip: "Distribuir rápido, nunca perder tiempo." },
      { name: "Saque de volea distancia máxima", sets: 5, reps: "10", tip: "Lanzar al otro área. Precisión + distancia." },
      { name: "Achique 1vs1", sets: 5, reps: "5", tip: "Salir rápido, hacerse grande, no tirarse antes de tiempo." },
    ],
  },
  defensaCentral: {
    iniciado: [
      { name: "Sentadilla corporal", sets: 3, reps: "12", tip: "Base para duelos aéreos." },
      { name: "Plancha", sets: 3, reps: "30s", tip: "Estabilidad en disputas." },
      { name: "Cabezazo desde parado", sets: 3, reps: "10", tip: "Frente, ojos abiertos, cuello firme." },
      { name: "Salida al pase largo (simulada)", sets: 3, reps: "8", tip: "Anticipa, no esperes." },
    ],
    medio: [
      { name: "Sentadilla con salto", sets: 4, reps: "8", tip: "Explosividad para duelos aéreos." },
      { name: "Cabezazo desde salto", sets: 4, reps: "10", tip: "Frente al balón, cuello firme, domina el área." },
      { name: "Carrera de anticipación 10m", sets: 5, reps: "10m", tip: "Leer el pase antes de que salga. Reacción." },
      { name: "Plancha lateral dinámica", sets: 3, reps: "30s c/lado", tip: "Estabilidad en los duelos de 50/50." },
      { name: "Cambio de dirección defensivo", sets: 4, reps: "1 ronda", tip: "Pivot + sprint 5m. Simula seguir al delantero." },
      { name: "Curl nórdico", sets: 3, reps: "5", tip: "Prevención de isquios. Obligatorio en defensas." },
    ],
    theOne: [
      { name: "Sentadilla pesada 90% 1RM", sets: 5, reps: "3", tip: "Duelos aéreos se ganan con piernas." },
      { name: "Hip thrust pesado", sets: 5, reps: "5", tip: "Potencia de salto. Máximo peso." },
      { name: "Curl nórdico", sets: 4, reps: "6", tip: "Prevención de isquiotibiales. Obligatorio." },
      { name: "Copenhagen plank", sets: 4, reps: "20s c/lado", tip: "Aductores para duelos laterales." },
      { name: "Salto al cajón con resistencia", sets: 4, reps: "4", tip: "Explosividad máxima en cada repetición." },
    ],
  },
  lateral: {
    iniciado: [
      { name: "Trote suave 1km", sets: 1, reps: "1km", tip: "Base aeróbica del lateral." },
      { name: "Sprint 20m", sets: 4, reps: "20m", tip: "Subidas de banda. Máxima aceleración." },
      { name: "Centro desde banda (simulado)", sets: 3, reps: "10", tip: "Contacto en el interior del pie." },
      { name: "Salto lateral", sets: 3, reps: "10", tip: "Caída estable, listo para continuar." },
    ],
    medio: [
      { name: "Sprint 30m repetido", sets: 6, reps: "30m", tip: "Descanso 40s. Simula subidas de banda." },
      { name: "Centro desde banda corriendo", sets: 4, reps: "10", tip: "No pierdas velocidad al centrar." },
      { name: "Salto lateral con aterrizaje", sets: 4, reps: "8", tip: "Aterrizaje controlado, listo para continuar." },
      { name: "Defensa lateral sliding", sets: 3, reps: "20m", tip: "Sin cruzar pies. Mantén el stance defensivo." },
      { name: "Resistencia de velocidad 100m", sets: 5, reps: "100m", tip: "Al 80%. El lateral recorre 30-40 bandas por partido." },
    ],
    theOne: [
      { name: "Sprint 40m repetido", sets: 8, reps: "40m", tip: "Simula subidas de banda en partido. Descanso 45s entre sprints." },
      { name: "Cambio dirección 5-10-5", sets: 6, reps: "1 ronda", tip: "Pies activos, cadera baja en los giros." },
      { name: "Centro a velocidad máxima", sets: 5, reps: "10", tip: "Máxima velocidad de conducción + centro." },
      { name: "Resistencia de velocidad 200m", sets: 6, reps: "200m", tip: "Al 90%, no al 100%. Sostén el ritmo." },
      { name: "Salto de cabeza en carrera", sets: 4, reps: "6", tip: "Timing del salto, no fuerza bruta." },
    ],
  },
  pivote: {
    iniciado: [
      { name: "Sentadilla básica", sets: 3, reps: "12", tip: "Fuerza de base para recuperaciones." },
      { name: "Plancha lateral", sets: 3, reps: "20s c/lado", tip: "Estabilidad en disputas." },
      { name: "Carrera de presión simulada", sets: 4, reps: "10m", tip: "Aceleración corta, cerrar al rival." },
      { name: "Control de pase en movimiento", sets: 3, reps: "10", tip: "Control orientado siempre." },
    ],
    medio: [
      { name: "Carrera de recuperación 20m", sets: 6, reps: "20m", tip: "Sprint de regreso. El pivote corre 12km por partido." },
      { name: "Pase corto bajo presión", sets: 4, reps: "20", tip: "Decisión rápida. 1-2 toques máximo." },
      { name: "Pressing + recuperación", sets: 5, reps: "30m", tip: "Sprint al rival + regreso trotando. Ritmo partido." },
      { name: "Plancha anti-rotación", sets: 3, reps: "30s c/lado", tip: "El pivote necesita el core más fuerte del equipo." },
      { name: "Cambio de ritmo con balón", sets: 4, reps: "40m", tip: "Protege el balón en los cambios de dirección." },
    ],
    theOne: [
      { name: "Sentadilla pesada (duelos)", sets: 5, reps: "4", tip: "El pivote gana duelos con piernas." },
      { name: "Press Pallof anti-rotación", sets: 4, reps: "12 c/lado", tip: "Resistir la rotación = control del cuerpo." },
      { name: "Remo pesado", sets: 5, reps: "5", tip: "Ganar disputas de espalda." },
      { name: "Curl nórdico", sets: 4, reps: "6", tip: "Isquiotibiales = motor de recuperaciones." },
      { name: "Farmer carry 30m", sets: 4, reps: "30m", tip: "Posesión bajo presión. No soltar." },
    ],
  },
  mediocampista: {
    iniciado: [
      { name: "Trote 1.5km", sets: 1, reps: "1.5km", tip: "Base aeróbica. El medio corre 11-13km." },
      { name: "Pase corto con precisión", sets: 3, reps: "20", tip: "Interior del pie. Siempre al pie." },
      { name: "Control y conducción 20m", sets: 3, reps: "8", tip: "Balón pegado al pie." },
      { name: "Cambio de ritmo suave", sets: 4, reps: "40m", tip: "Caminar → trote → sprint → trote." },
    ],
    medio: [
      { name: "Repeated sprint 30m", sets: 6, reps: "30m", tip: "Descanso 30s entre sprints. Mantén el ritmo." },
      { name: "Cambio de ritmo", sets: 5, reps: "1 min", tip: "40s suave + 20s máximo. Sin parar." },
      { name: "Conducción con cambio de dirección", sets: 4, reps: "30m", tip: "Cabeza arriba en cada cambio. Visión periférica." },
      { name: "Pase largo con precisión", sets: 3, reps: "10", tip: "Interior-exterior del pie según la distancia." },
      { name: "Pressing simulado", sets: 4, reps: "20m", tip: "Sprint al rival + frenar en posición defensiva." },
      { name: "Resistencia aeróbica 2km", sets: 1, reps: "2km", tip: "Ritmo cómodo. El medio tiene que llegar al 90." },
    ],
    theOne: [
      { name: "Repeated sprint 30m", sets: 10, reps: "30m", tip: "Mantener velocidad en rep 10 igual que rep 1. Descanso 25s entre sprints." },
      { name: "Cambio de ritmo partido", sets: 8, reps: "1.5 min", tip: "1 min suave + 30s máximo. Sin parar." },
      { name: "Técnica bajo fatiga", sets: 4, reps: "5 min", tip: "Control + pase tras sprint. Si fallas técnica, el físico no sirve." },
      { name: "Resistencia aeróbica 3km", sets: 1, reps: "3km", tip: "Ritmo de partido. Conversacional." },
      { name: "Visión periférica drill", sets: 3, reps: "2 min", tip: "Cabeza arriba siempre. Sentir el balón, no mirarlo." },
    ],
  },
  extremo: {
    iniciado: [
      { name: "Sprint 20m", sets: 5, reps: "20m", tip: "El extremo vive del primer paso." },
      { name: "Conducción y centro", sets: 3, reps: "8", tip: "Máxima velocidad en los últimos 5m." },
      { name: "Salto lateral explosivo", sets: 3, reps: "8", tip: "Simula recorte al interior." },
      { name: "Regate básico (recorte)", sets: 3, reps: "10", tip: "Fintar con el cuerpo, no el balón." },
    ],
    medio: [
      { name: "Aceleración 0-20m", sets: 6, reps: "20m", tip: "Inclinación 45° en los primeros 5 pasos." },
      { name: "1vs1 con regate y centro", sets: 4, reps: "8", tip: "Amaga con el cuerpo, explota hacia el interior." },
      { name: "Cambio de ritmo con balón", sets: 5, reps: "30m", tip: "Lento-rápido-lento. Desorienta al defensor." },
      { name: "Centro al área en carrera", sets: 3, reps: "10", tip: "Máxima velocidad en los últimos 3 metros." },
      { name: "Resistencia de velocidad 40m", sets: 5, reps: "40m", tip: "Al 85%. Sostener velocidad hasta el final." },
    ],
    theOne: [
      { name: "Aceleración 0-30m máxima", sets: 8, reps: "30m", tip: "Descanso completo entre sprints. Calidad sobre cantidad." },
      { name: "1vs1 simulado con centro", sets: 6, reps: "1 ronda", tip: "Regate + centro cruzado en 1 movimiento." },
      { name: "Cambio de ritmo explosivo", sets: 6, reps: "30m", tip: "Parada total + sprint máximo. El defensor no puede leer eso." },
      { name: "Resistencia velocidad 60m", sets: 6, reps: "60m", tip: "Al 95%. Sostener velocidad en última etapa." },
      { name: "Finalización tras conducción", sets: 5, reps: "8", tip: "Conducción larga + disparo. Sin pensar, ejecutar." },
    ],
  },
  delantero: {
    iniciado: [
      { name: "Arranque 10m", sets: 5, reps: "10m", tip: "El delantero vive de los primeros 10m." },
      { name: "Control y definición", sets: 3, reps: "10", tip: "1 toque de control + disparo inmediato." },
      { name: "Cabezazo desde parado", sets: 3, reps: "10", tip: "Frente, ojos abiertos, cuello firme." },
      { name: "Movimiento de ruptura", sets: 4, reps: "8", tip: "Arranque en diagonal, enganchar al defensor." },
    ],
    medio: [
      { name: "Sprint en espacio corto 15m", sets: 6, reps: "15m", tip: "Reacción + explosión. Simula recepción en profundidad." },
      { name: "Recepción y definición 1 toque", sets: 4, reps: "10", tip: "Control orientado + disparo. Sin balones muertos." },
      { name: "Movimiento de ruptura", sets: 5, reps: "8", tip: "Arrastra al defensor con el cuerpo, rompe en diagonal." },
      { name: "Cabezazo en carrera", sets: 3, reps: "8", tip: "El timing del salto importa más que la altura." },
      { name: "Disparo de media distancia", sets: 3, reps: "10", tip: "Empeine. Pie de apoyo junto al balón. Sigue el tiro." },
      { name: "Arranque 0-10m con balón", sets: 5, reps: "10m", tip: "Primer toque y explosión. El delantero vive de esto." },
      { name: "Rondo 1vs1 simulado", sets: 4, reps: "5 min", tip: "Protege el balón con el cuerpo. Giro y salida." },
    ],
    theOne: [
      { name: "Sprint en espacio corto 15m", sets: 10, reps: "15m", tip: "Reacción + explosión. Sin señal previa." },
      { name: "Recepción y definición 1 toque", sets: 5, reps: "10", tip: "0 balones muertos. Todo en movimiento." },
      { name: "Movimiento de ruptura + control + gol", sets: 6, reps: "1 ronda", tip: "Arrastra al defensor, rompe, recibe, define. Automático." },
      { name: "Cabezazo en carrera", sets: 4, reps: "8", tip: "Timing del salto > altura del salto." },
      { name: "Disparo larga distancia", sets: 4, reps: "10", tip: "Contacto en el empeine, pie de apoyo junto al balón." },
    ],
  },
};

const LEVEL_SETS_FRACTION = [0.55, 0.7, 0.85, 1, 1.1, 1.2];

function genFutbolPositionRoutine(positionId, lvlIdx, deloadActive) {
  const pos = FUTBOL_POSITION_PARQUE[positionId];
  const effLvlIdx = Math.max(0, Math.min(5, deloadActive ? lvlIdx - 1 : lvlIdx));
  let base;
  if (effLvlIdx <= 1) base = pos.iniciado;
  else if (effLvlIdx <= 3) base = pos.medio || pos.theOne;
  else base = pos.theOne;
  const frac = LEVEL_SETS_FRACTION[effLvlIdx];
  let rest = REST_BY_LEVEL[effLvlIdx];
  return sortExercises(base.map((it) => {
    const r = fixedItem(it);
    let sets = Math.max(1, Math.round(r.sets * frac));
    if (deloadActive) { sets = Math.max(1, Math.round(sets * 0.6)); rest = Math.round(rest * 1.3); }
    return { ...r, sets, rest, intensity: LEVEL_SCALING[effLvlIdx]?.intensityLabel };
  }));
}

/* ─── Generador de rutinas (5-8 ejercicios, con variación por semilla) ─── */
/* Añade 2-3 ejercicios de trabajo extra para músculos no cubiertos por el tipo de rutina elegido */
function appendExtraMuscleExercises(routine, extraFocusIds, lvlIdx) {
  const pool = EXDB.gimnasio || [];
  const existingNames = new Set(routine.map((e) => e.name));
  const scaling = LEVEL_SCALING[lvlIdx] || LEVEL_SCALING[0];
  let out = routine;
  extraFocusIds.forEach((tag) => {
    const candidates = pool.filter((e) => e.f?.includes(tag) && !existingNames.has(e.n));
    candidates.slice(0, 3).forEach((e) => {
      existingNames.add(e.n);
      out = [...out, { name: e.n, type: e.t, sets: Math.min(4, e.s + scaling.setsAdd), reps: e.r, rest: e.rest, tip: e.tip, tag }];
    });
  });
  return out;
}

function genRoutine(discId, focusId, lvlIdx, seed = 0, opts = {}) {
  /* Brazos como sesión dedicada solo desde Campeón (lvlIdx >= 2); antes redirige a Push */
  if (discId === "gimnasio" && focusId === "arms" && lvlIdx < 2) {
    focusId = "push";
  }
  if (discId === "basquetCancha" || discId === "basquetSinCancha") {
    return genBasquetRoutine(discId, lvlIdx, !!store.get("deload_active", null));
  }
  if (discId === "futbolParque" && FUTBOL_POSITION_PARQUE[focusId]) {
    return genFutbolPositionRoutine(focusId, lvlIdx, !!store.get("deload_active", null));
  }
  const deloadActive = !!store.get("deload_active", null);
  const effLvlIdx = deloadActive ? Math.max(0, lvlIdx - 1) : lvlIdx;
  const rnd = mulberry32(seed);
  const db = EXDB[discId];
  const focus = DISCIPLINES[discId].focuses.find((f) => f.id === focusId);
  const matchFocus = (e) => !focus.tags || e.f.some((t) => focus.tags.includes(t));
  const matchBar = (e) => !opts.noBar || !e.bar;
  const matchEquip = (e) => !(opts.noEquip && discId === "gimnasio") || !requiresGymEquipment(e.n);
  const matchAll = (e) => matchFocus(e) && matchBar(e) && matchEquip(e);

  let pool = db.filter((e) => matchAll(e) && e.lv[0] <= effLvlIdx && effLvlIdx <= e.lv[1]);
  if (pool.length < 5) pool = db.filter(matchAll);
  /* Si el enfoque elegido no tiene alternativas sin barra/equipo, prioriza
     respetar el equipo disponible antes que el enfoque exacto. */
  if (pool.length < 5) pool = db.filter((e) => matchBar(e) && matchEquip(e));
  if (pool.length < 5) pool = db.filter(matchFocus);

  /* Filtra ejercicios desaconsejados por limitaciones físicas del onboarding */
  const healthIssues = store.get("health_issues", []);
  if (healthIssues.length && !healthIssues.includes("ninguna")) {
    const filtered = filterExercisesByHealth(pool, healthIssues);
    if (filtered.length >= 4) pool = filtered;
  }

  const scaling = LEVEL_SCALING[effLvlIdx] || LEVEL_SCALING[0];

  /* Para gimnasio, calcula cuántos ejercicios hacen falta para acercarse
     al volumen total (en series) objetivo del nivel */
  const avgSetsPerExercise = 3.5 + scaling.setsAdd;
  const targetVolume = discId === "gimnasio" ? GYM_VOLUME_TARGET[effLvlIdx] : null;
  const target = targetVolume
    ? Math.max(5, Math.min(9, Math.min(pool.length, Math.round(targetVolume / avgSetsPerExercise))))
    : Math.max(5, Math.min(8, Math.min(pool.length, 5 + (effLvlIdx >= 2 ? 1 : 0) + (effLvlIdx >= 4 ? 1 : 0) + (rnd() < 0.5 ? 1 : 0))));

  const shuffled = [...pool].sort(() => rnd() - 0.5);
  const chosen = [];
  const seenTags = new Set();
  const isolationCountByTag = {};
  for (const e of shuffled) {
    if (chosen.length >= target) break;
    if (!seenTags.has(e.f[0])) {
      chosen.push(e);
      seenTags.add(e.f[0]);
    }
  }
  for (const e of shuffled) {
    if (chosen.length >= target) break;
    if (chosen.includes(e)) continue;
    /* Máximo 2 ejercicios de aislamiento por mismo grupo muscular en la sesión */
    if (classifyExerciseOrder(e.n) === "assistance") {
      const tag = e.f?.[0] || "otro";
      const count = isolationCountByTag[tag] || 0;
      if (count >= 2) continue;
      isolationCountByTag[tag] = count + 1;
    }
    chosen.push(e);
  }

  const planWeek = getPlanWeekNumber();
  const phaseMods = !deloadActive && planWeek && planWeek <= 12 ? PERIODIZATION[getPlanPhase(planWeek)] : null;

  const weekMultiplier = discId === "gimnasio" ? getWeekMultiplier() : 1.0;
  const taperingPhase = getTaperingFactor();
  const taperingMultiplier = taperingPhase ? TAPERING_INFO[taperingPhase].setsMultiplier : 1.0;
  const built = chosen.map((e, i) => {
    let sets = e.s === 1 ? 1 : Math.min(6, e.s + scaling.setsAdd);
    const repBounds = repRangeRestBounds(e.r);
    let rest = Math.min(scaling.restMax, Math.max(scaling.restMin, e.rest));
    rest = Math.min(repBounds[1], Math.max(repBounds[0], rest));
    if (deloadActive) {
      sets = Math.max(1, Math.round(sets * 0.6));
      rest = Math.round(rest * 1.3);
    } else if (phaseMods) {
      sets = Math.max(1, sets + phaseMods.setsModifier);
      rest = Math.max(0, rest + phaseMods.restModifier);
    } else if (weekMultiplier !== 1.0) {
      sets = Math.max(1, Math.round(sets * weekMultiplier));
    }
    if (taperingMultiplier !== 1.0) {
      sets = Math.max(1, Math.round(sets * taperingMultiplier));
    }
    const scheme = e.t === "peso" && sets >= 3 && !deloadActive ? schemeForExercise(effLvlIdx, i, chosen.length) : "standard";
    const name = deloadActive ? (DELOAD_SUBSTITUTES[e.n] || e.n) : e.n;
    return { name, type: e.t, sets, reps: e.r, rest, tip: e.tip, desc: e.desc, tag: e.f ? e.f[0] : null, intensity: scaling.intensityLabel, scheme };
  });
  let sorted = sortExercises(built);
  if (discId !== "gimnasio") return sorted;
  if (focusId === "glutes_focus") {
    const priorityNames = ["Hip thrust con barra", "Sentadilla búlgara", "Hip thrust con peso corporal"];
    const firstIdx = sorted.findIndex((e) => priorityNames.includes(e.name));
    if (firstIdx > 0) {
      const [first] = sorted.splice(firstIdx, 1);
      sorted = [first, ...sorted];
    }
  }
  const withFocus = applyGymFocusToExercises(sorted, store.get("gym_focus", null));
  const withGoal = applyGoalToExercises(withFocus, store.get("training_goal", null));
  const withOrder = sortByGoalOrder(withGoal, store.get("training_goal", null));
  const supersetsEnabled = store.get("supersets_enabled", effLvlIdx >= 3);
  return supersetsEnabled ? tagSupersets(withOrder, effLvlIdx, deloadActive) : withOrder;
}

/* Orden de ejercicios afinado según el objetivo: fuerza/potencia prioriza compuestos pesados primero,
   hipertrofia prioriza el compuesto principal seguido de aislamiento del músculo objetivo */
function sortByGoalOrder(exercises, goalId) {
  const isStrength = ["strength", "athletic"].includes(goalId);
  const isHypertrophy = ["muscle", "aesthetics", "recomposition"].includes(goalId);
  if (!isStrength && !isHypertrophy) return exercises;
  const getOrder = (ex) => {
    const cat = classifyExerciseOrder(ex.name);
    if (isStrength) {
      if (cat === "compound_primary") return 1;
      if (cat === "compound_secondary") return 2;
      if (cat === "assistance") return 3;
      return 4; // core
    }
    if (cat === "compound_primary") return 1;
    if (cat === "compound_secondary") return 1.5;
    if (cat === "assistance") return 2;
    return 3; // core
  };
  return [...exercises].sort((a, b) => getOrder(a) - getOrder(b));
}

/* Marca parejas de ejercicios claramente antagonistas como superset (Campeón+, conservador) */
const CLEAR_ANTAGONIST_PAIRS = [
  { a: ["press banca", "press inclinado", "flexion", "fondo"], b: ["jalón", "dominadas", "remo"] },
  { a: ["curl biceps", "curl de biceps", "curl martillo"], b: ["press frances", "press francés", "extension triceps", "extensión triceps", "fondo"] },
  { a: ["sentadilla", "prensa", "extension de cuadriceps", "extensión de cuádriceps", "zancada"], b: ["peso muerto", "curl femoral", "hip thrust", "puente de gluteos", "puente de glúteos"] },
];
function isClearAntagonist(nameA, nameB) {
  const na = nameA.toLowerCase(), nb = nameB.toLowerCase();
  return CLEAR_ANTAGONIST_PAIRS.some(({ a, b }) => {
    const aInA = a.some((k) => na.includes(k)), aInB = b.some((k) => na.includes(k));
    const bInA = a.some((k) => nb.includes(k)), bInB = b.some((k) => nb.includes(k));
    return (aInA && bInB) || (aInB && bInA);
  });
}
function tagSupersets(exercises, lvlIdx, deloadActive = false) {
  if (lvlIdx < 2 || deloadActive) return exercises;
  const out = exercises.map((e) => ({ ...e }));
  let i = 0;
  while (i < out.length - 1) {
    const a = out[i], b = out[i + 1];
    if (a.superset || b.superset) { i++; continue; }
    if (isClearAntagonist(a.name, b.name)) {
      const id = `superset-${i}`;
      out[i] = { ...a, superset: "A", supersetId: id, restOriginal: a.rest, rest: 0 };
      out[i + 1] = { ...b, superset: "B", supersetId: id, restOriginal: b.rest };
      i += 2;
    } else {
      i++;
    }
  }
  return out;
}

/* Orden real de atletismo: técnica/pliometría primero, sprints/tempo después, recuperación al final */
function classifyAtletismoOrder(name) {
  const n = name.toLowerCase();
  if (/skipping|técnic|tecnic|pliometr|zancadas din|movilidad/.test(n)) return 1;
  if (/aceleraci|salidas de bloque|strides/.test(n)) return 2;
  if (/sprint|intervalos|series de colina|tempo|fartlek|pace run|rodaje de calidad/.test(n)) return 3;
  return 4; // trote suave, recuperación, rodaje largo
}
function sortAtletismoExercises(exercises) {
  return [...exercises].sort((a, b) => classifyAtletismoOrder(a.name) - classifyAtletismoOrder(b.name));
}

/* Generador de rutinas de Atletismo (no usa enfoque, la distancia ya filtra) */
function genAtletismoRoutine(distance, lvlIdx, seed = 0) {
  const deloadActive = !!store.get("deload_active", null);
  const effLvlIdx = deloadActive ? Math.max(0, lvlIdx - 1) : lvlIdx;
  const rnd = mulberry32(seed);
  const fullPool = ATLETISMO_EXDB[distance] || [];
  let pool = fullPool.filter((e) => !e.lv || (e.lv[0] <= effLvlIdx && effLvlIdx <= e.lv[1]));
  if (pool.length < 4) pool = fullPool;
  const target = Math.min(pool.length, 5 + (rnd() < 0.5 ? 1 : 0));
  const shuffled = [...pool].sort(() => rnd() - 0.5).slice(0, target);
  const scaling = LEVEL_SCALING[effLvlIdx] || LEVEL_SCALING[0];
  const planWeek = getPlanWeekNumber();
  const phaseMods = !deloadActive && planWeek && planWeek <= 12 ? PERIODIZATION[getPlanPhase(planWeek)] : null;
  return sortAtletismoExercises(shuffled.map((e) => {
    let sets = e.s === 1 ? 1 : Math.min(6, e.s + scaling.setsAdd);
    /* Nunca más de 6 sprints/aceleraciones máximas por sesión */
    if (/sprint máximo|aceleraci[oó]n(es)? m[aá]xima/i.test(e.n)) sets = Math.min(sets, 6);
    let rest = Math.min(scaling.restMax, Math.max(scaling.restMin, e.rest));
    if (deloadActive) {
      sets = Math.max(1, Math.round(sets * 0.6));
      rest = Math.round(rest * 1.3);
    } else if (phaseMods) {
      sets = Math.max(1, sets + phaseMods.setsModifier);
      rest = Math.max(0, rest + phaseMods.restModifier);
    }
    return { name: e.n, type: e.t, sets, reps: e.r, rest, tip: e.tip, tag: "velocidad", intensity: scaling.intensityLabel };
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

/* Construye un plan de sesión a partir de disciplina/enfoque/nivel elegidos (no de un registro previo) */
function buildPlanFor(discId, focusId, lvlIdx) {
  const seed = routineSeed(discId, focusId);
  if (discId === "atletismo") {
    const distId = focusId || "1000m";
    const dist = DISTANCES.find((d) => d.id === distId) || DISTANCES[0];
    return {
      discId: "atletismo", discLabel: "Atletismo", discColor: C.purple, discIcon: "🏃",
      focusLabel: dist.label, lvlIdx,
      exercises: genAtletismoRoutine(distId, lvlIdx, seed),
    };
  }
  const disc = DISCIPLINES[discId];
  if (!disc) return null;
  const focus = disc.focuses.find((f) => f.id === focusId) || disc.focuses[0];
  return {
    discId, discLabel: disc.label, discColor: disc.color, discIcon: disc.icon,
    focusLabel: focus.label, lvlIdx,
    exercises: genRoutine(discId, focus.id, lvlIdx, seed),
  };
}

/* ─── Plan del día inteligente ─── */
const DAILY_DURATION = { gimnasio: 45, calistenia: 35, futbolGym: 60, futbolParque: 60, basquetCancha: 55, basquetSinCancha: 45, atletismo: 40, cuerpo: 20 };

function mostFrequentLevel(sessions) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  if (!workouts.length) return 0;
  const counts = {};
  workouts.forEach((s) => { counts[s.levelIdx] = (counts[s.levelIdx] || 0) + 1; });
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

function leastUsedDiscipline(sessions) {
  const cutoff = Date.now() - 7 * 86400000;
  const order = ["calistenia", "gimnasio", "futbolGym", "futbolParque", "atletismo"];
  const counts = {};
  order.forEach((d) => { counts[d] = 0; });
  sessions.filter((s) => s.kind === "entreno" && s.ts >= cutoff).forEach((s) => {
    if (counts[s.disc] !== undefined) counts[s.disc]++;
  });
  return Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
}

function focusGroupOf(label) {
  if (!label) return "otro";
  const l = label.toLowerCase();
  if (/push|pecho|hombro|tricep|empuje/.test(l)) return "empuje";
  if (/pull|espalda|bicep|tiron|jalón/.test(l)) return "tiron";
  if (/leg|pierna|glúte|gluteo|lower|sentadil/.test(l)) return "piernas";
  if (/upper|superior|tren sup/.test(l)) return "empuje";
  if (/full.?body|todo el cuerpo|completo/.test(l)) return "fullbody";
  if (/core|abdomen/.test(l)) return "core";
  if (/brazo|arm/.test(l)) return "brazos";
  return "otro";
}

function hoursSinceTs(ts) {
  return (Date.now() - ts) / 3600000;
}

function MuscleRecoveryCard({ sessions }) {
  const recoveryData = useMemo(() => {
    const groups = [
      { key: "empuje", label: "Pecho/Hombros", hours: 48, icon: "💪" },
      { key: "tiron", label: "Espalda/Bíceps", hours: 48, icon: "🏋️" },
      { key: "piernas", label: "Piernas/Glúteos", hours: 72, icon: "🦵" },
      { key: "core", label: "Core", hours: 24, icon: "🔥" },
    ];

    return groups.map(({ key, label, hours, icon }) => {
      const lastSession = [...sessions]
        .filter((s) => s.kind === "entreno" && (s.muscleGroup === key || focusGroupOf(s.focusLabel) === key))
        .sort((a, b) => b.ts - a.ts)[0];

      if (!lastSession) {
        return { label, icon, pct: 100, ready: true };
      }

      const hoursSince = hoursSinceTs(lastSession.ts);
      const pct = Math.min(100, Math.round((hoursSince / hours) * 100));
      return {
        label, icon, pct,
        ready: pct >= 80,
        hoursLeft: Math.max(0, Math.round(hours - hoursSince)),
      };
    });
  }, [sessions]);

  if (!sessions.some((s) => s.kind === "entreno")) return null;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 10 }}>
        💪 Recuperación muscular
      </p>
      {recoveryData.map(({ label, icon, pct, ready, hoursLeft }) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: C.mut }}>{icon} {label}</span>
            <span style={{ fontSize: 10, color: ready ? C.green : C.orange, fontWeight: 700 }}>
              {ready ? "✓ Listo" : `${hoursLeft}h`}
            </span>
          </div>
          <div style={{ height: 4, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: ready ? C.green : C.orange, borderRadius: 99, transition: "width 0.5s ease" }} />
          </div>
        </div>
      ))}
      <p style={{ fontSize: 9, color: C.dim, marginTop: 8, fontStyle: "italic" }}>
        Estimado según intensidad registrada. Escucha siempre tu cuerpo.
      </p>
    </div>
  );
}

/* Nivel del usuario centralizado: específico de disciplina → global → calculado del historial */
function getUserLevel(discId) {
  const discLevel = store.get(`level_${discId}`, null);
  if (discLevel !== null) return discLevel;
  const globalLevel = store.get("level_global", null);
  if (globalLevel !== null) return globalLevel;
  return mostFrequentLevel(store.get("sessions", []));
}

/* ─── Recuperación muscular ─── */
const RECOVERY_BASE_HOURS = {
  Piernas: 72, Espalda: 60, Pecho: 48, Hombros: 48, Brazos: 36,
  Core: 24, Atletismo: 48, "Fútbol": 36, Básquetbol: 36, Calistenia: 48, Cuerpo: 12,
};
const RECOVERY_INTENSITY_MULTIPLIER = {
  heavy_duty: 1.5, gvt: 1.4, the_one: 1.3, leyenda: 1.2, elite: 1.1, campeon: 1.0, guerrero: 0.9, iniciado: 0.8,
};
const LEVEL_TO_INTENSITY_KEY = ["iniciado", "guerrero", "campeon", "elite", "leyenda", "the_one"];

function getRecoveryTime(group, intensityKey) {
  const base = RECOVERY_BASE_HOURS[group] ?? 24;
  const mult = RECOVERY_INTENSITY_MULTIPLIER[intensityKey] ?? 1.0;
  return Math.round(base * mult);
}

/* Deriva el grupo muscular principal trabajado a partir del registro de sesión guardado */
function muscleGroupOf(session) {
  if (session.disc === "gimnasio") {
    const l = (session.focusLabel || "").toLowerCase();
    if (/pierna|glúte|gluteo|inferior/.test(l)) return "Piernas";
    if (/espalda/.test(l)) return "Espalda";
    if (/pecho/.test(l)) return "Pecho";
    if (/hombro/.test(l)) return "Hombros";
    if (/brazo/.test(l)) return "Brazos";
    return "Pecho";
  }
  if (session.disc === "calistenia") return "Calistenia";
  if (session.disc === "atletismo") return "Atletismo";
  if (session.disc?.startsWith("futbol")) return "Fútbol";
  if (session.disc?.startsWith("basquet")) return "Básquetbol";
  if (session.kind === "cuerpo") return "Cuerpo";
  return null;
}

function updateRecoveryState(session) {
  const group = muscleGroupOf(session);
  if (!group) return;
  let intensityKey = LEVEL_TO_INTENSITY_KEY[session.levelIdx] || "campeon";
  if (session.methodology === "heavy_duty") intensityKey = "heavy_duty";
  else if (session.methodology === "gvt") intensityKey = "gvt";
  const hoursNeeded = getRecoveryTime(group, intensityKey);
  const recovery = store.get("recovery", {});
  recovery[group] = { lastSession: session.ts, hoursNeeded, intensityKey };
  store.set("recovery", recovery);
}

/* ─── Modelo de supercompensación: fase fisiológica real de cada grupo muscular ─── */
const SUPERCOMP_RECOVERY_MULTIPLIER = {
  Piernas: 1.3, Espalda: 1.2, Pecho: 1.0, Hombros: 1.0, Brazos: 0.8, Core: 0.6,
  Atletismo: 1.0, "Fútbol": 1.0, Básquetbol: 1.0, Calistenia: 1.0, Cuerpo: 0.5,
};

function getSupercompensationPhase(lastSessionTs, muscleGroup, intensityKey) {
  const hoursSince = (Date.now() - lastSessionTs) / 3600000;
  const recoveryMult = SUPERCOMP_RECOVERY_MULTIPLIER[muscleGroup] ?? 1.0;
  const intensityMult = RECOVERY_INTENSITY_MULTIPLIER[intensityKey] ?? 1.0;
  const optimalWindow = 48 * recoveryMult * intensityMult;

  if (hoursSince < optimalWindow * 0.5) {
    return { phase: "fatigue", color: "#FF3B5C", label: "En fatiga", trainNow: false };
  }
  if (hoursSince < optimalWindow * 0.9) {
    return { phase: "recovery", color: "#FF8800", label: "Recuperando", trainNow: false };
  }
  if (hoursSince < optimalWindow * 1.4) {
    return { phase: "supercompensation", color: "#22FF88", label: "⚡ PICO DE ADAPTACIÓN", trainNow: true };
  }
  return { phase: "detraining", color: "#6B7280", label: "Ventana pasando", trainNow: true };
}

/* ─── ACWR: ratio de carga aguda/crónica (ciencia de gestión de carga) ─── */
function sessionAvgRpe(session) {
  const rpes = (session.exercises || []).flatMap((e) => e.sets || []).map((s) => s.rpe).filter((r) => typeof r === "number");
  if (!rpes.length) return 6;
  return rpes.reduce((a, r) => a + r, 0) / rpes.length;
}
function sessionLoad(session) {
  if (session.load) return session.load;
  return (session.durationMin || 45) * sessionAvgRpe(session);
}
function calcACWR(sessions) {
  const now = Date.now();
  const day = 86400000;
  const workouts = sessions.filter((s) => s.kind === "entreno" || s.kind === "partido");
  const acute = workouts.filter((s) => now - s.ts <= 7 * day).reduce((sum, s) => sum + sessionLoad(s), 0);
  const chronic4w = workouts.filter((s) => now - s.ts <= 28 * day).reduce((sum, s) => sum + sessionLoad(s), 0) / 4;
  if (chronic4w === 0) return null;
  return acute / chronic4w;
}
function acwrInfo(ratio) {
  if (ratio === null) return null;
  if (ratio < 0.8) return { color: C.blue, label: "Subcargado — puedes aumentar intensidad", level: "low" };
  if (ratio <= 1.3) return { color: C.green, label: "Zona óptima ✓ — progresando de forma segura", level: "ok" };
  if (ratio <= 1.5) return { color: C.yellow, label: "⚠️ Carga alta — monitorea la fatiga", level: "high" };
  return { color: C.red, label: "🚨 Zona de riesgo — reduce volumen hoy", level: "danger" };
}

/* Estado agregado de recuperación para mostrar en Inicio */
function getRecoveryStatus() {
  const recovery = store.get("recovery", {});
  const now = Date.now();
  const groups = Object.entries(recovery).map(([group, info]) => {
    const hoursElapsed = (now - info.lastSession) / 3600000;
    const hoursLeft = Math.max(0, Math.round(info.hoursNeeded - hoursElapsed));
    const supercomp = getSupercompensationPhase(info.lastSession, group, info.intensityKey || "campeon");
    return { group, hoursLeft, recovered: hoursLeft <= 0, ...supercomp };
  });
  const peakGroups = groups.filter((g) => g.phase === "supercompensation");
  const worst = groups.filter((g) => !g.recovered).sort((a, b) => b.hoursLeft - a.hoursLeft)[0];
  const recentIntenseSessions = Object.values(recovery).filter((r) => now - r.lastSession < 3 * 86400000).length;
  let level = "green";
  let message = "Listo para entrenar fuerte";
  let chipLabel = "💪 Cuerpo listo para entrenar";
  if (peakGroups.length) {
    level = "cyan";
    message = `${peakGroups.map((g) => g.group).join(" y ")} ${peakGroups.length > 1 ? "están" : "está"} en su pico de adaptación hoy. Es el mejor momento para entrenarlos.`;
    chipLabel = `⚡ Pico de adaptación: ${peakGroups.map((g) => g.group).join(", ")}`;
  } else if (worst && worst.hoursLeft > 24) {
    level = "red";
    message = "Sesión ligera recomendada";
    chipLabel = `⛔ Descansa: ${worst.group} (recuperando)`;
  } else if (worst && worst.hoursLeft > 0) {
    level = "yellow";
    message = `Puedes entrenar, evita ${worst.group}`;
    chipLabel = `⏳ Recuperando: ${worst.group} (${worst.hoursLeft}h)`;
  } else if (recentIntenseSessions >= 3) {
    level = "yellow";
    message = "Puedes entrenar, con moderación";
    chipLabel = "🟡 Entrena con moderación";
  }
  return { level, message, chipLabel, groups: groups.sort((a, b) => a.hoursLeft - b.hoursLeft), worst, peakGroups };
}

/* Advierte (sin bloquear) si el mismo grupo muscular se eligió 3+ veces en los últimos 5 días */
function checkOvertraining(focusLabel, sessions) {
  const muscleGroup = focusGroupOf(focusLabel);
  if (!muscleGroup || muscleGroup === "otro") return null;

  const last5Days = sessions.filter((s) => {
    const daysAgo = (Date.now() - s.ts) / 86400000;
    return daysAgo <= 5 && s.kind === "entreno";
  });

  const sameGroupCount = last5Days.filter((s) => focusGroupOf(s.focusLabel) === muscleGroup).length;

  if (sameGroupCount >= 3) {
    return {
      group: muscleGroup,
      count: sameGroupCount,
      message: `Llevas ${sameGroupCount} sesiones de ${muscleGroup} en 5 días.`,
      suggestion: "Este grupo muscular necesita 48h de recuperación para crecer. Considera entrenar otro grupo hoy.",
    };
  }
  return null;
}

/* Devuelve una lista de sugerencias (la primera es la principal; "ver otro plan" rota entre el resto) */
/* Compatibilidad de focusIds antiguos con los nuevos GYM_WORKOUT_TYPES */
const FOCUS_COMPAT = {
  espalda: "pull", pecho: "push", sup: "upper", piernas: "legs", todo: "full_body",
};
function resolveGymFocusId(id) {
  const exists = DISCIPLINES.gimnasio.focuses.some((f) => f.id === id);
  if (exists) return id;
  return FOCUS_COMPAT[id] || "full_body";
}

/* Volumen semanal mínimo/máximo efectivo por grupo (series semanales) — principio MEV/MAV/MRV de Renaissance Periodization */
const VOLUME_LANDMARKS = {
  Pecho: { MEV: 10, MAV: 16, MRV: 22 },
  Espalda: { MEV: 10, MAV: 18, MRV: 25 },
  Piernas: { MEV: 8, MAV: 16, MRV: 20 },
  Hombros: { MEV: 8, MAV: 14, MRV: 20 },
  Brazos: { MEV: 8, MAV: 14, MRV: 18 },
};
const VOLUME_GROUP_TO_FOCUS = { Pecho: "push", Espalda: "pull", Piernas: "legs", Hombros: "upper", Brazos: "arms" };

function calcWeeklyVolume(sessions, muscleGroup) {
  const weekStart = startOfWeek();
  return sessions
    .filter((s) => s.kind === "entreno" && s.disc === "gimnasio" && s.ts >= weekStart && muscleGroupOf(s) === muscleGroup)
    .flatMap((s) => s.exercises)
    .reduce((sum, e) => sum + e.sets.filter((st) => st.ok).length, 0);
}

/* Si algún grupo está muy por debajo de su volumen mínimo efectivo esta semana, sugiere priorizarlo */
function volumeCheck(sessions, lvlIdx) {
  const underMEV = Object.entries(VOLUME_LANDMARKS)
    .filter(([group, { MEV }]) => calcWeeklyVolume(sessions, group) < MEV * 0.7)
    .map(([group]) => group);
  if (!underMEV.length) return null;
  const priority = underMEV[0];
  return {
    discId: "gimnasio",
    focusId: VOLUME_GROUP_TO_FOCUS[priority] || "full_body",
    lvlIdx,
    reason: `📊 ${priority} necesita más volumen esta semana (por debajo del mínimo efectivo).`,
  };
}

function dailyPlanCandidates(sessions) {
  /* 0. Programa activo: fuente primaria, sin lógica genérica de por medio */
  if (getActiveProgram()) {
    const programCandidate = programDailyCandidate(sessions);
    if (programCandidate) return [programCandidate];
  }

  /* 1. SNC (Tap Test): si está fatigado hoy, prioriza recuperación sobre cualquier otra sugerencia */
  const sncFatigue = store.get("snc_fatigued_today", null);
  const isSncFatiguedToday = sncFatigue && sncFatigue.date === new Date().toDateString();
  if (isSncFatiguedToday) {
    return [{ discId: "cuerpo", focusId: null, lvlIdx: mostFrequentLevel(sessions), reason: `🧠 SNC fatigado (${Math.round(sncFatigue.ratio * 100)}% de tu promedio). Movilidad o técnica hoy, no intensidad.` }];
  }

  /* 2. ACWR (carga aguda/crónica) */
  const acwr = calcACWR(sessions);
  if (acwr !== null && acwr > 1.5) {
    const altDiscId = leastUsedDiscipline(sessions);
    return [
      { discId: "cuerpo", focusId: null, lvlIdx: 0, reason: `⚠️ Carga alta (ACWR ${acwr.toFixed(2)}). Tu cuerpo necesita recuperación hoy.` },
      { discId: altDiscId, focusId: altDiscId === "gimnasio" ? "full_body" : "todo", lvlIdx: Math.max(0, mostFrequentLevel(sessions) - 1), reason: "Si prefieres entrenar: baja la intensidad." },
    ];
  }

  const workouts = sessions.filter((s) => s.kind === "entreno");
  const lvlIdx = mostFrequentLevel(sessions);

  if (!workouts.length) {
    return [{ discId: "calistenia", focusId: "todo", lvlIdx: 0, reason: "Es tu primera vez. Empecemos con calistenia." }];
  }

  /* 3. Volumen semanal (MEV/MAV/MRV): con suficiente historial, prioriza el grupo más deficitario */
  if (workouts.length >= 6) {
    const deficit = volumeCheck(sessions, lvlIdx);
    if (deficit) return [deficit];
  }

  const streakDays = calcStreak(sessions, []);
  const weeklyGoal = store.get("weekly_goal", 4);
  const restThreshold = weeklyGoal >= 5 ? 6 : 5;
  if (streakDays >= restThreshold) {
    const altDiscId = leastUsedDiscipline(sessions);
    return [
      { discId: "cuerpo", focusId: null, lvlIdx, reason: `Llevas ${streakDays} días seguidos entrenando. Hoy toca descanso activo.` },
      { discId: altDiscId, focusId: altDiscId === "gimnasio" ? "full_body" : "todo", lvlIdx, reason: "Alternativa si prefieres seguir activo." },
    ];
  }

  const candidates = computeYesterdayBasedCandidates(sessions, workouts, lvlIdx);

  /* Conecta el body_focus del onboarding: si el usuario eligió zonas prioritarias,
     sin programa activo y con ACWR normal, sugiere esa zona como primera opción */
  const bodyFocus = store.get("body_focus", []);
  if (bodyFocus.length > 0 && !getActiveProgram()) {
    const bodyFocusCandidate = bodyFocusToDisc(bodyFocus, lvlIdx);
    if (bodyFocusCandidate) candidates.unshift(bodyFocusCandidate);
  }

  return candidates;
}

/* Sugiere una disciplina/enfoque según las zonas prioritarias elegidas en el onboarding */
function bodyFocusToDisc(zones, lvlIdx) {
  if (zones.includes("gluteos") || zones.includes("piernas")) {
    return { discId: "gimnasio", focusId: "glutes_focus", lvlIdx, reason: "Tu objetivo incluye glúteos y piernas." };
  }
  if (zones.includes("espalda") || zones.includes("hombros")) {
    return { discId: "gimnasio", focusId: "v_shape", lvlIdx, reason: "Tu objetivo: espalda ancha y hombros." };
  }
  if (zones.includes("pecho") || zones.includes("brazos")) {
    return { discId: "gimnasio", focusId: "push", lvlIdx, reason: "Tu objetivo: tren superior." };
  }
  if (zones.includes("abs") || zones.includes("abdomen")) {
    return { discId: "gimnasio", focusId: "core", lvlIdx, reason: "Tu objetivo: core y abdomen." };
  }
  return null;
}

function computeYesterdayBasedCandidates(sessions, workouts, lvlIdx) {
  const yestKey = dayKey(Date.now() - 86400000);
  const yesterday = [...workouts].reverse().find((s) => dayKey(s.ts) === yestKey);

  if (!yesterday) {
    const leastId = leastUsedDiscipline(sessions);
    const label = DISCIPLINES[leastId]?.label || "Calistenia";
    return [
      { discId: leastId, focusId: leastId === "gimnasio" ? "full_body" : "todo", lvlIdx, reason: `No entrenaste ayer. Retoma con ${label}, tu disciplina menos trabajada esta semana.` },
      { discId: "calistenia", focusId: "todo", lvlIdx, reason: "O si prefieres, un full body de calistenia." },
    ];
  }

  if (yesterday.disc === "gimnasio") {
    const grp = yesterday.muscleGroup || focusGroupOf(yesterday.focusLabel);
    if (grp === "empuje") {
      return [
        { discId: "gimnasio", focusId: "pull", lvlIdx, reason: "Ayer trabajaste empuje, hoy toca Pull." },
        { discId: "calistenia", focusId: "tiron", lvlIdx, reason: "Alternativa: tirón en calistenia." },
      ];
    }
    if (grp === "tiron") {
      return [
        { discId: "gimnasio", focusId: "legs", lvlIdx, reason: "Ayer trabajaste Pull, hoy toca Legs." },
        { discId: "calistenia", focusId: "piernas", lvlIdx, reason: "Alternativa: piernas en calistenia." },
      ];
    }
    if (grp === "piernas") {
      return [
        { discId: "gimnasio", focusId: "upper", lvlIdx, reason: "Ayer trabajaste Legs, hoy toca Upper." },
        { discId: store.get("last_futbol_location", "futbolParque"), focusId: "todo", lvlIdx, reason: "Alternativa: fútbol." },
      ];
    }
    if (grp === "fullbody") {
      return [
        { discId: "cuerpo", focusId: null, lvlIdx, reason: "Ayer fue full body. Hoy movilidad o descanso." },
        { discId: "atletismo", focusId: "1000m", lvlIdx, reason: "Alternativa: cardio suave." },
      ];
    }
    if (grp === "brazos") {
      return [
        { discId: "gimnasio", focusId: resolveGymFocusId("legs"), lvlIdx, reason: "Ayer trabajaste brazos. Hoy piernas." },
        { discId: "calistenia", focusId: "piernas", lvlIdx, reason: "Alternativa: piernas en calistenia." },
      ];
    }
    if (grp === "core") {
      return [{ discId: "gimnasio", focusId: resolveGymFocusId("push"), lvlIdx, reason: "Core ayer. Hoy parte superior." }];
    }
    return [{ discId: "gimnasio", focusId: "full_body", lvlIdx, reason: "Sigue con tu rutina de gimnasio." }];
  }

  if (yesterday.disc === "calistenia") {
    return [
      { discId: "gimnasio", focusId: "full_body", lvlIdx, reason: "Ayer hiciste calistenia, hoy prueba gimnasio." },
      { discId: "atletismo", focusId: "1000m", lvlIdx, reason: "Alternativa: atletismo." },
    ];
  }

  if (yesterday.disc === "atletismo") {
    return [{ discId: "cuerpo", focusId: null, lvlIdx, reason: "Ayer fue atletismo, hoy toca movilidad y cuerpo." }];
  }

  if (yesterday.disc === "futbolGym" || yesterday.disc === "futbolParque") {
    return [
      { discId: "gimnasio", focusId: "full_body", lvlIdx, reason: "Ayer jugaste fútbol, hoy fuerza en gimnasio." },
      { discId: "cuerpo", focusId: null, lvlIdx, reason: "Alternativa: descanso activo." },
    ];
  }

  return [{ discId: "calistenia", focusId: "todo", lvlIdx, reason: "Sigue sumando sesiones." }];
}

/* ─── Biblioteca de programas prediseñados ─── */
const PROGRAMS = [
  {
    id: "ppl", name: "PPL Híbrido — Fuerza + Masa", emoji: "🏋️", color: C.cyan,
    durationWeeks: 8, daysPerWeek: 6, minLevelIdx: 1, goalTags: ["musculo"],
    desc: "El programa más probado para ganar músculo. Divide el cuerpo en empuje, jalón y piernas. Alta frecuencia, alto volumen.",
    structure: [
      { discId: "gimnasio", focusId: "push", label: "Empuje (pecho, hombros, tríceps)" },
      { discId: "gimnasio", focusId: "pull", label: "Jalón (espalda, bíceps)" },
      { discId: "gimnasio", focusId: "legs", label: "Piernas (cuádriceps, isquios, glúteos)" },
      { discId: "gimnasio", focusId: "push", label: "Empuje (variaciones)" },
      { discId: "gimnasio", focusId: "pull", label: "Jalón (variaciones)" },
      { discId: "gimnasio", focusId: "glutes_focus", label: "Piernas (énfasis glúteo e isquio)" },
      null,
    ],
  },
  {
    id: "5x5", name: "5×5 Fuerza Pura", emoji: "🏆", color: C.orange,
    durationWeeks: 12, daysPerWeek: 3, minLevelIdx: 2, goalTags: ["musculo", "rendimiento"],
    desc: "Sentadilla, peso muerto, press banca, press militar, remo. 5 series de 5 reps. Añades peso cada sesión. Simple y brutal.",
    structure: [
      { discId: "gimnasio", focusId: "legs", label: "Día A: Sentadilla + Press banca + Remo (5×5)" },
      null,
      { discId: "gimnasio", focusId: "full_body", label: "Día B: Sentadilla + Press militar + Peso muerto (5×5 / 1×5)" },
      null,
      { discId: "gimnasio", focusId: "legs", label: "Día A: Sentadilla + Press banca + Remo (5×5)" },
      null, null,
    ],
  },
  {
    id: "futbol_premier", name: "Fútbol Élite — Físico y Campo", emoji: "⚽", color: C.orange,
    durationWeeks: 8, daysPerWeek: 4, minLevelIdx: 0, goalTags: ["rendimiento"],
    desc: "Velocidad, potencia, resistencia y fuerza funcional. Diseñado para que tu físico no sea tu limitante en el campo.",
    structure: [
      { discId: "futbolGym", focusId: "defensaCentral", label: "Gym — Fuerza explosiva (sentadilla, hip thrust)" },
      { discId: "futbolParque", focusId: "extremo", label: "Parque — Velocidad (sprints, cambios de dirección)" },
      null,
      { discId: "futbolGym", focusId: "pivote", label: "Gym — Fuerza superior + core" },
      { discId: "futbolParque", focusId: "mediocampista", label: "Parque — Resistencia de velocidad" },
      null, null,
    ],
  },
  {
    id: "calistenia_cero", name: "Calistenia — Desde Cero", emoji: "🤸", color: C.green,
    durationWeeks: 12, daysPerWeek: 4, minLevelIdx: 0, goalTags: ["musculo", "condicion"],
    desc: "De cero al muscle-up. Progresión estricta de fuerza relativa usando solo el peso corporal.",
    structure: [
      { discId: "calistenia", focusId: "empuje", label: "Empuje (flexiones, fondos)" },
      { discId: "calistenia", focusId: "tiron", label: "Tirón (dominadas progresivas)" },
      null,
      { discId: "calistenia", focusId: "core", label: "Core y estabilidad" },
      { discId: "calistenia", focusId: "piernas", label: "Piernas con peso corporal" },
      null, null,
    ],
  },
  {
    id: "atletismo_velocidad", name: "Velocidad — Atletismo de Pista", emoji: "🏃", color: C.purple,
    durationWeeks: 8, daysPerWeek: 4, minLevelIdx: 0, goalTags: ["rendimiento"],
    desc: "Basado en los principios de velocidad de atletismo de élite. Pliometría, sprints y técnica.",
    structure: [
      { discId: "atletismo", focusId: "100m", label: "Velocidad pura (100m)" },
      { discId: "cuerpo", focusId: null, label: "Movilidad y recuperación" },
      { discId: "atletismo", focusId: "400m", label: "Velocidad-resistencia (400m)" },
      null,
      { discId: "atletismo", focusId: "100m", label: "Técnica y potencia explosiva" },
      null, null,
    ],
  },
  {
    id: "basquet_completo", name: "Básquetbol Completo", emoji: "🏀", color: "#A855F7",
    durationWeeks: 8, daysPerWeek: 4, minLevelIdx: 0, goalTags: ["rendimiento"],
    desc: "Explosividad, técnica y resistencia para dominar en cancha.",
    structure: [
      { discId: "basquetCancha", focusId: "tiro", label: "Técnica — Tiro y dribleo" },
      { discId: "basquetSinCancha", focusId: "salto", label: "Físico — Salto vertical" },
      null,
      { discId: "basquetCancha", focusId: "defensa", label: "Técnica — Defensa y juego" },
      { discId: "basquetSinCancha", focusId: "resistencia", label: "Físico — Resistencia" },
      null, null,
    ],
  },
  {
    id: "wendler_531", name: "Wendler 5/3/1", emoji: "📈", color: C.cyan,
    durationWeeks: 12, daysPerWeek: 4, minLevelIdx: 3, goalTags: ["rendimiento", "musculo"],
    desc: "El programa de fuerza más probado del mundo. Ciclos de 4 semanas con porcentajes exactos del Training Max. Requiere 1RM registrado.",
    structure: [
      { discId: "gimnasio", focusId: "legs", label: "Sentadilla + accesorios de piernas" },
      { discId: "gimnasio", focusId: "upper", label: "Press militar + accesorios de hombros" },
      null,
      { discId: "gimnasio", focusId: "pull", label: "Peso muerto + accesorios de espalda" },
      { discId: "gimnasio", focusId: "push", label: "Press banca + accesorios de pecho" },
      null, null,
    ],
  },
  {
    id: "recomp_8w", name: "Recomposición — Corte Atlético", emoji: "⚖️", color: C.cyan,
    durationWeeks: 8, daysPerWeek: 4, minLevelIdx: 1, goalTags: ["recomposition"],
    desc: "Perder grasa y ganar músculo simultáneamente con estructura Upper/Lower y cardio al final. Requiere disciplina nutricional además del entrenamiento.",
    structure: [
      { discId: "gimnasio", focusId: "upper", label: "Upper A (pecho, espalda, hombros)" },
      { discId: "gimnasio", focusId: "legs", label: "Lower A (piernas + cardio final)" },
      null,
      { discId: "gimnasio", focusId: "upper", label: "Upper B (variación)" },
      { discId: "gimnasio", focusId: "glutes_focus", label: "Lower B (glúteos + cardio final)" },
      null, null,
    ],
  },
  {
    id: "glutes_6w", name: "Piernas y Glúteos — Potencia", emoji: "🍑", color: "#FF9EC4",
    durationWeeks: 6, daysPerWeek: 3, minLevelIdx: 0, goalTags: ["aesthetics"],
    desc: "Programa dedicado al desarrollo de glúteos y forma de piernas: hip thrust, sentadilla búlgara, abducción y peso muerto rumano. Funciona para cualquier género.",
    structure: [
      { discId: "gimnasio", focusId: "glutes_focus", label: "Glúteos A: Hip thrust + búlgara" },
      null,
      { discId: "gimnasio", focusId: "legs", label: "Piernas: cuádriceps + isquios" },
      null,
      { discId: "gimnasio", focusId: "glutes_focus", label: "Glúteos B: abducción + rumano" },
      null, null,
    ],
  },
  {
    id: "football_athlete", name: "Atleta de Fútbol — 12 Semanas", emoji: "⚽", color: C.orange,
    durationWeeks: 12, daysPerWeek: 4, minLevelIdx: 1, goalTags: ["athletic"],
    desc: "Fuerza, velocidad y resistencia específicas para fútbol: 2 sesiones de gimnasio y 2 de parque por semana.",
    structure: [
      { discId: "futbolGym", focusId: "extremo", label: "Gym — Fuerza explosiva" },
      { discId: "futbolParque", focusId: "extremo", label: "Parque — Velocidad" },
      null,
      { discId: "futbolGym", focusId: "mediocampista", label: "Gym — Resistencia de fuerza" },
      { discId: "futbolParque", focusId: "delantero", label: "Parque — Técnica y remate" },
      null, null,
    ],
  },
  {
    id: "v_shape_8w", name: "Tren Superior — Amplitud y Fuerza", emoji: "🔺", color: C.cyan,
    durationWeeks: 8, daysPerWeek: 4, minLevelIdx: 1, goalTags: ["aesthetics"],
    desc: "Espalda ancha, hombros grandes, cintura marcada. El clásico físico de superhéroe: jalón agarre ancho, remo, press militar y elevaciones laterales.",
    structure: [
      { discId: "gimnasio", focusId: "v_shape", label: "Espalda ancha: jalón + remo agarre ancho" },
      { discId: "gimnasio", focusId: "upper", label: "Hombros: press militar + elevaciones laterales" },
      null,
      { discId: "gimnasio", focusId: "v_shape", label: "Espalda: dominadas + remo en T-bar" },
      { discId: "gimnasio", focusId: "upper", label: "Hombros + core: definición de cintura" },
      null, null,
    ],
  },
];

/* Modo de entrenamiento global: cuánta decisión diaria quiere tomar el usuario */
const TRAIN_MODES = [
  {
    id: "auto", emoji: "🤖", name: "Piloto automático",
    desc: "La app decide todo. Solo toca Empezar cada día.",
    detail: "Basado en tu objetivo, nivel y recuperación muscular.",
  },
  {
    id: "program", emoji: "📅", name: "Seguir un programa",
    desc: "Elige un plan de 4-12 semanas y síguelo.",
    detail: "PPL, 5x5, Glúteos, Fútbol y más opciones.",
  },
  {
    id: "manual", emoji: "🎯", name: "Yo decido",
    desc: "Tú eliges qué entrenar cada día.",
    detail: "Máximo control. Para quien sabe lo que hace.",
  },
];

/* Objetivo rápido → programa recomendado (para elegir piloto automático o programa por primera vez) */
const OBJECTIVE_TO_PROGRAM = [
  { id: "musculo", emoji: "💪", label: "Ganar músculo", programId: "ppl" },
  { id: "definicion", emoji: "🔥", label: "Definirme", programId: "recomp_8w" },
  { id: "gluteos", emoji: "🍑", label: "Glúteos y piernas", programId: "glutes_6w" },
  { id: "futbol", emoji: "⚽", label: "Fútbol", programId: "football_athlete" },
  { id: "atletismo", emoji: "🏃", label: "Atletismo", programId: "atletismo_velocidad" },
  { id: "salud", emoji: "🌱", label: "Salud general", programId: "calistenia_cero" },
  { id: "v_shape", emoji: "🔺", label: "Forma en V", programId: "v_shape_8w" },
];

function getActiveProgram() {
  const active = store.get("active_program", null);
  if (!active) return null;
  const program = PROGRAMS.find((p) => p.id === active.programId);
  if (!program) return null;
  const week = Math.min(program.durationWeeks, Math.floor((Date.now() - active.startTs) / (7 * 86400000)) + 1);
  if (week > program.durationWeeks) return null;
  return { ...active, program, week };
}

function startProgram(programId) {
  store.set("active_program", { programId, startTs: Date.now() });
}

function stopProgram() {
  store.set("active_program", null);
}

/* Si hay programa activo, propone la sesión de hoy según su estructura semanal */
function programDailyCandidate(sessions) {
  const active = getActiveProgram();
  if (!active) return null;
  const dayIdx = (new Date().getDay() + 6) % 7; // 0 = lunes
  const today = active.program.structure[dayIdx];
  const lvlIdx = Math.max(active.program.minLevelIdx, mostFrequentLevel(sessions));
  if (!today) {
    const tomorrow = active.program.structure[(dayIdx + 1) % 7];
    if (tomorrow) {
      const focusId = tomorrow.discId === "gimnasio" ? resolveGymFocusId(tomorrow.focusId) : tomorrow.focusId;
      return {
        discId: tomorrow.discId, focusId, lvlIdx,
        reason: `Mañana toca ${tomorrow.label} — ¿Adelantarlo hoy?`,
        isEarlySession: true,
      };
    }
    return null;
  }
  const focusId = today.discId === "gimnasio" ? resolveGymFocusId(today.focusId) : today.focusId;
  return { discId: today.discId, focusId, lvlIdx, reason: `Semana ${active.week} — ${active.program.name}: ${today.label}` };
}

/* Grupo muscular objetivo de un candidato de plan (para evitar sugerir un grupo sin recuperar) */
function candidateMuscleGroup(c) {
  if (c.discId === "gimnasio") {
    const f = (c.focusId || "").toLowerCase();
    if (f === "todo" || f === "full_body") return null;
    if (f === "piernas" || f === "gluteos" || f === "inf" || f === "legs" || f === "glutes_focus") return "Piernas";
    if (f === "espalda" || f === "pull") return "Espalda";
    if (f === "pecho" || f === "sup" || f === "push") return "Pecho";
    if (f === "hombros" || f === "upper" || f === "v_shape") return "Hombros";
    if (f === "brazos" || f === "arms") return "Brazos";
    return null;
  }
  if (c.discId === "calistenia") return "Calistenia";
  if (c.discId === "atletismo") return "Atletismo";
  if (c.discId?.startsWith("futbol")) return "Fútbol";
  if (c.discId?.startsWith("basquet")) return "Básquetbol";
  return null;
}

/* Prioriza los músculos que están en su pico de supercompensación hoy */
function prioritizePeakGroups(candidates, peakGroups) {
  if (!peakGroups?.length) return candidates;
  const peakSet = new Set(peakGroups.map((g) => g.group));
  const peak = [];
  const rest = [];
  candidates.forEach((c) => {
    const group = candidateMuscleGroup(c);
    (group && peakSet.has(group) ? peak : rest).push(c);
  });
  return peak.length ? [...peak, ...rest] : candidates;
}

/* Evita sugerir en primer lugar un grupo muscular que aún no está recuperado */
function deprioritizeUnrecovered(candidates) {
  const status = getRecoveryStatus();
  const prioritized = prioritizePeakGroups(candidates, status.peakGroups);
  const unrecoveredGroups = new Set(status.groups.filter((g) => !g.recovered).map((g) => g.group));
  if (!unrecoveredGroups.size) return prioritized;
  const ready = [];
  const resting = [];
  prioritized.forEach((c) => {
    const group = candidateMuscleGroup(c);
    (group && unrecoveredGroups.has(group) ? resting : ready).push(c);
  });
  return ready.length ? [...ready, ...resting] : prioritized;
}

function getDailyPlan(sessions) {
  const today = todayKey();
  /* Si hay programa activo, dailyPlanCandidates ya devuelve únicamente su sesión del día */
  const programCandidate = getActiveProgram() ? programDailyCandidate(sessions) : null;
  const rawCandidates = dailyPlanCandidates(sessions);
  const candidates = deprioritizeUnrecovered(rawCandidates);
  const cached = store.get("daily_plan", null);
  if (cached && cached.date === today && cached.fromProgram === !!programCandidate) {
    return { plan: cached.plan, index: cached.index, candidates };
  }
  const plan = candidates[0];
  store.set("daily_plan", { date: today, plan, index: 0, fromProgram: !!programCandidate });
  return { plan, index: 0, candidates };
}

function describeDailyPlan(plan) {
  if (plan.discId === "cuerpo") {
    return { label: "Cuerpo · Movilidad", focusLabel: null, color: C.purple, icon: "🧘" };
  }
  if (plan.discId === "atletismo") {
    const dist = DISTANCES.find((d) => d.id === plan.focusId);
    return { label: "Atletismo", focusLabel: dist?.label || null, color: C.purple, icon: "🏃" };
  }
  const disc = DISCIPLINES[plan.discId];
  if (!disc) return { label: plan.discId, focusLabel: null, color: C.cyan, icon: "💪" };
  const focus = disc.focuses.find((f) => f.id === plan.focusId);
  return { label: disc.label, focusLabel: focus && focus.id !== "todo" ? focus.label : null, color: disc.color, icon: disc.icon };
}

/* Principio de especificidad acumulada: las primeras semanas de cualquier objetivo empiezan con volumen moderado */
/* ─── Estructura semanal coherente según días disponibles ─── */
const WEEKLY_STRUCTURES = {
  3: { days: ["Lunes", "Miércoles", "Viernes"], sessions: ["Full body A", "Full body B", "Full body C"] },
  4: { days: ["Lunes", "Martes", "Jueves", "Viernes"], sessions: ["Pecho + hombros + tríceps", "Atletismo o fútbol", "Espalda + bíceps", "Piernas + glúteos"] },
  5: { days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], sessions: ["Pecho", "Espalda + velocidad", "Piernas", "Hombros + brazos", "Fútbol o atletismo"] },
  6: { days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"], sessions: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"] },
  2: { days: ["Lunes", "Jueves"], sessions: ["Full body A", "Full body B"] },
};
function generateWeeklyStructure() {
  const daysAvailable = store.get("weekly_goal", 4);
  const structure = WEEKLY_STRUCTURES[daysAvailable] || WEEKLY_STRUCTURES[4];
  store.set("weekly_structure", structure);
  return structure;
}
function getWeeklyStructure() {
  return store.get("weekly_structure", null) || generateWeeklyStructure();
}
/* Índice (día/nombre de sesión) que le toca hoy según la estructura semanal, o null si hoy no es día de entrenamiento */
function todayInWeeklyStructure() {
  const structure = getWeeklyStructure();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const todayName = dayNames[new Date().getDay()];
  const idx = structure.days.indexOf(todayName);
  if (idx === -1) return null;
  return { dayNumber: idx + 1, total: structure.days.length, sessionLabel: structure.sessions[idx] };
}

function getWeekMultiplier() {
  const firstTs = store.get("first_session_date", null);
  if (!firstTs) return 1.0;
  const weeksActive = Math.floor((Date.now() - firstTs) / (7 * 86400000));
  if (weeksActive <= 2) return 0.75;
  if (weeksActive <= 4) return 0.90;
  if (weeksActive <= 8) return 1.00;
  if (weeksActive <= 12) return 1.15;
  return 1.0;
}

/* ─── Tapering: ajusta la carga según cercanía al día de partido configurado ─── */
function getTaperingFactor() {
  const matchDay = store.get("match_day", null);
  if (matchDay === null) return null;
  const today = new Date().getDay();
  const daysUntilMatch = ((matchDay - today) + 7) % 7;
  if (daysUntilMatch === 0) return "match_day";
  if (daysUntilMatch === 1) return "recovery";
  if (daysUntilMatch === 2) return "activation";
  if (daysUntilMatch === 3) return "tapering";
  if (daysUntilMatch <= 5) return "normal";
  return "build";
}
const TAPERING_INFO = {
  match_day: { label: "⚽ Día de partido — activación ligera", color: C.red, setsMultiplier: 0.4 },
  recovery: { label: "🧘 Recuperación — movilidad suave", color: C.orange, setsMultiplier: 0.5 },
  activation: { label: "⚡ Activación — sin fuerza máxima", color: C.yellow, setsMultiplier: 0.7 },
  tapering: { label: "📉 Tapering — bajando volumen", color: C.yellow, setsMultiplier: 0.6 },
  normal: { label: null, color: C.mut, setsMultiplier: 1.0 },
  build: { label: "📈 Semana de carga", color: C.green, setsMultiplier: 1.1 },
};
function taperingDaysUntilMatch() {
  const matchDay = store.get("match_day", null);
  if (matchDay === null) return null;
  const today = new Date().getDay();
  return ((matchDay - today) + 7) % 7;
}

/* Sustituciones más ligeras/técnicas durante la semana de deload */
const DELOAD_SUBSTITUTES = {
  "Sentadilla con barra": "Sentadilla goblet",
  "Press banca con barra": "Flexiones",
  "Peso muerto convencional": "Peso muerto con mancuernas",
  "Dominadas": "Remo invertido",
  "Press militar de pie con barra": "Elevaciones laterales",
  "Fondos en paralelas": "Fondos entre bancos",
};

/* ─── Deload automático ─── */
function shouldDeload(sessions) {
  const workouts = [...sessions.filter((s) => s.kind === "entreno")].sort((a, b) => a.ts - b.ts).slice(-40);
  if (!workouts.length) return false;
  const weeks = [];
  let currentWeek = [];
  let lastTs = null;
  workouts.forEach((s) => {
    if (lastTs === null) {
      currentWeek.push(s);
    } else {
      const daysDiff = (s.ts - lastTs) / 86400000;
      if (daysDiff <= 7) currentWeek.push(s);
      else { weeks.push(currentWeek); currentWeek = [s]; }
    }
    lastTs = s.ts;
  });
  if (currentWeek.length) weeks.push(currentWeek);
  const activeWeeks = weeks.filter((w) => w.length >= 3);
  return activeWeeks.length >= 4;
}

function DeloadBanner({ sessions }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const refresh = () => setNow(Date.now());

  const active = store.get("deload_active", null);
  const skipped = store.get("deload_skipped", null);
  const suggestNow = !active && shouldDeload(sessions) && (!skipped || now - skipped > 14 * 86400000);
  const daysIn = active ? Math.floor((now - active.startTs) / 86400000) : null;
  const completed = active && daysIn >= 7;

  if (completed) {
    return (
      <div className="card pop" style={{ marginTop: 12, textAlign: "center", borderColor: C.green, background: "rgba(34,255,136,0.08)" }}>
        <div style={{ fontSize: 30 }}>🏆</div>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.green }}>Deload completado.</p>
        <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Tu cuerpo está listo para romper récords.</p>
        <button
          className="btn-xl"
          onClick={() => {
            awardBonusXpOnce(`deload_bonus_${active.startTs}`, 500);
            store.set("deload_active", null);
            refresh();
          }}
          style={{ marginTop: 10, background: C.green, color: "#07070C", fontSize: 12 }}
        >
          Continuar (+500 XP)
        </button>
      </div>
    );
  }

  if (active) {
    return (
      <div className="card" style={{ marginTop: 12, borderColor: `${C.yellow}66`, background: "rgba(255,214,0,0.06)" }}>
        <p style={{ fontSize: 12, color: C.yellow, fontWeight: 700 }}>🔄 Semana de deload — día {daysIn + 1} de 7</p>
        <p style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Peso ligero, técnica perfecta. Tus rutinas tienen 40% menos series esta semana.</p>
      </div>
    );
  }

  if (!suggestNow) return null;

  return (
    <div className="card" style={{ marginTop: 12, border: "2px solid #FFD700" }}>
      <p style={{ fontSize: 14, fontWeight: 900, color: "#FFD700" }}>🔄 SEMANA DE DELOAD SUGERIDA</p>
      <p style={{ fontSize: 12, color: C.text, marginTop: 6 }}>Llevas 4 semanas de entrenamiento intenso.</p>
      <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>Tu sistema nervioso necesita recuperarse.</p>
      <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>Esta semana: mismos ejercicios, 40% menos volumen.</p>
      <button onClick={() => setExpanded((v) => !v)} style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginTop: 8 }}>
        {expanded ? "Ocultar explicación ▲" : "¿Por qué hacer deload? ▼"}
      </button>
      {expanded && (
        <p style={{ fontSize: 11, color: C.mut, marginTop: 6, lineHeight: 1.5 }}>
          El deload no es flojera. Es cuando el cuerpo asimila las adaptaciones de las últimas semanas.
          Los atletas de élite hacen deload cada 4-6 semanas. Después del deload rendirás mejor que antes.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className="btn-xl"
          onClick={() => { store.set("deload_active", { startTs: Date.now() }); refresh(); }}
          style={{ background: "#FFD700", color: "#07070C", fontSize: 12 }}
        >
          ✅ Hacer deload esta semana
        </button>
        <button
          className="btn-xl"
          onClick={() => { store.set("deload_skipped", Date.now()); refresh(); }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 12 }}
        >
          Saltar esta vez
        </button>
      </div>
    </div>
  );
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
  const [particles] = useState(() => Array.from({ length: 8 }, (_, i) => ({
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

/* GIFs/fotos reales de ejercicios (free-exercise-db, sin API key) para los más frecuentes.
   Si la imagen falla (red, CORS, URL rota) se usa ExercisePlaceholder. */
const EXERCISE_GIFS = {
  "Press banca con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
  "Sentadilla con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg",
  "Peso muerto convencional": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg",
  "Dominadas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg",
  "Press militar con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shoulder_Press/0.jpg",
  "Press militar de pie con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shoulder_Press/0.jpg",
  "Remo con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
  "Hip thrust con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg",
  "Sentadilla búlgara": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg",
  "Flexiones": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg",
  "Curl con barra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
  "Press francés": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Triceps_Press/0.jpg",
  "Peso muerto rumano": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
  "Prensa de piernas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
  "Zancadas con mancuernas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
  "Elevaciones laterales": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
  "Fondos en paralelas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/0.jpg",
  "Jalón al pecho": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
  "Jalón al pecho agarre ancho": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
  "Remo en polea baja sentado": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
  "Press inclinado con mancuernas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
  "Curl de bíceps con mancuernas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg",
  "Extensión de tríceps en polea": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg",
  "Sentadilla goblet": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg",
  "Aperturas con mancuernas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg",
  "Cruce de poleas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg",
  "Face pull": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg",
  "Curl predicador": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg",
  "Peso muerto sumo": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/0.jpg",
  "Plancha frontal": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
  "Sentadilla búlgara con mancuernas": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg",
  "Cruce de poleas alto a bajo": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg",
  "Extensión de cuádriceps": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg",
  "Curl femoral": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg",
};

/* Placeholder limpio para ejercicios sin GIF mapeado (reemplaza el stickman CSS) */
function ExercisePlaceholder({ name, tip, desc }) {
  const emoji = getExerciseEmoji(name);
  return (
    <div
      style={{
        width: "100%", borderRadius: 12,
        background: "var(--surface)", border: "1px solid var(--border)",
        padding: "16px 14px", marginTop: 12,
      }}
    >
      <span style={{ fontSize: 40 }}>{emoji}</span>
      <p style={{ fontSize: 14, fontWeight: 800, marginTop: 8, color: "var(--text)" }}>{name}</p>
      {tip && <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6, lineHeight: 1.5 }}>{tip}</p>}
      {desc && <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>{desc}</p>}
    </div>
  );
}

function ExerciseDemo({ exerciseName, tip, desc }) {
  const [imgError, setImgError] = useState(false);
  const gifUrl = EXERCISE_GIFS[exerciseName];

  if (gifUrl && !imgError) {
    return (
      <div
        className="exercise-demo"
        style={{
          width: "100%", aspectRatio: "4/3", maxHeight: 200,
          borderRadius: 12, overflow: "hidden", background: C.card,
          border: `1px solid ${C.border}`, marginTop: 12, position: "relative",
        }}
      >
        <img
          src={gifUrl} alt={exerciseName} onError={() => setImgError(true)} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return <ExercisePlaceholder name={exerciseName} tip={tip} desc={desc} />;
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

const getProgramDayLabel = (date, active) => {
  if (!active) return null;
  const dayIdx = (date.getDay() + 6) % 7; // 0=lunes
  const session = active.program.structure[dayIdx];
  if (!session) return "rest";
  return session.discId;
};

function Heatmap({ sessions, color, freezes = [], activeProgram = null }) {
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
      arr.push({ key: k, date: d, active: set.has(k), frozen: freezeSet.has(k), isToday: k === todayKey(), future: d.getTime() > today.getTime() });
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
        {days.map((d) => {
          const programDay = d.future && activeProgram ? getProgramDayLabel(d.date, activeProgram) : null;
          return (
            <button
              key={d.key}
              aria-label={d.future ? "Día futuro" : d.active ? "Entrenaste aquí" : d.frozen ? "Racha congelada este día" : "Sin entrenamiento"}
              onClick={() => !d.future && setTapped(d.frozen ? "Racha congelada este día ❄️" : d.active ? "Entrenaste aquí 💪" : "Sin entrenamiento")}
              style={{
                aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
                background: d.future
                  ? (programDay === "rest" ? "transparent" : programDay ? `${DISCIPLINES[programDay]?.color || C.cyan}22` : "transparent")
                  : d.active ? color : "#1A1A2E",
                border: d.isToday
                  ? "1.5px solid #FFFFFFcc"
                  : d.future && programDay && programDay !== "rest"
                    ? `1px dashed ${DISCIPLINES[programDay]?.color || C.cyan}66`
                    : `1px solid ${d.active ? color : C.border}`,
                opacity: 1,
                transition: "background .3s ease",
              }}
            >
              {d.frozen && !d.active ? "❄️" : ""}
            </button>
          );
        })}
      </div>
      {tapped && <div style={{ fontSize: 11, color: C.mut, marginTop: 8, textAlign: "center" }}>{tapped}</div>}
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8, textAlign: "right" }}>Últimas 5 semanas · lunes a domingo</div>
      {activeProgram && (
        <div style={{ fontSize: 10, color: C.dim, marginTop: 6, display: "flex", gap: 8 }}>
          <span>░ Planificado</span>
          <span>■ Completado</span>
          <span>— Descanso</span>
        </div>
      )}
    </div>
  );
}

/* Array de 0/1 de los últimos 30 días (1 = entrenó ese día), para sparklines de racha */
function last30DaysTrainedArray(sessions) {
  const daySet = new Set(sessions.filter((s) => s.kind === "entreno").map((s) => dayKey(s.ts)));
  const out = [];
  for (let i = 29; i >= 0; i--) {
    out.push(daySet.has(dayKey(Date.now() - i * 86400000)) ? 1 : 0);
  }
  return out;
}

function Sparkline({ data, color, width = 60, height = 20 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => ({ x: (i / (data.length - 1)) * width, y: height - ((val - min) / range) * height }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const trend = data[data.length - 1] > data[0];
  const trendColor = trend ? C.green : C.red;
  return (
    <svg width={width} height={height} style={{ opacity: 0.7, flexShrink: 0 }}>
      <path d={pathD} fill="none" stroke={color || trendColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color || trendColor} />
    </svg>
  );
}

function StatBox({ label, value, accent, sparkData }) {
  const isNumeric = typeof value === "number" && Number.isFinite(value);
  const animated = useCountUp(isNumeric ? value : 0);
  const shown = isNumeric ? animated : value;
  return (
    <div className="card" style={{ flex: 1, textAlign: "center", padding: "14px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ ...TYPOGRAPHY.h1, fontSize: 24, fontVariantNumeric: "tabular-nums", color: accent || C.text }}>
          {shown}
        </div>
        {sparkData && <Sparkline data={sparkData} color={accent} />}
      </div>
      <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars -- ya no se usa en Home; se deja disponible para Progreso
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

const GENDER_OPTIONS = [
  { id: "m", emoji: "♂", label: "Masculino" },
  { id: "f", emoji: "♀", label: "Femenino" },
  { id: "x", emoji: "🫥", label: "Prefiero no decir" },
];

const FITNESS_LEVEL_OPTIONS = [
  { id: "iniciado", emoji: "🔵", label: "Iniciado", desc: "Llevo menos de 6 meses entrenando o estoy empezando desde cero.", lvlIdx: 0 },
  { id: "intermedio", emoji: "🟢", label: "Intermedio", desc: "Llevo más de 6 meses y conozco los ejercicios básicos.", lvlIdx: 1 },
  { id: "avanzado", emoji: "🔴", label: "Avanzado", desc: "Llevo más de 2 años y entreno con consistencia real.", lvlIdx: 3 },
];

const HEALTH_ISSUE_OPTIONS = [
  { id: "ninguna", emoji: "✅", label: "Ninguna" },
  { id: "rodilla", emoji: "🦵", label: "Rodilla" },
  { id: "cadera", emoji: "🦴", label: "Cadera" },
  { id: "espalda", emoji: "🔙", label: "Espalda o hernia" },
  { id: "hombros", emoji: "💪", label: "Hombros o brazos" },
  { id: "tobillos", emoji: "🦶", label: "Tobillos o pies" },
  { id: "cardio", emoji: "❤️", label: "Condición cardíaca" },
  { id: "saltos", emoji: "⚡", label: "No puedo hacer saltos" },
];

/* Mapa corporal anatómico interactivo: SVG con zonas iluminables + lista de checks a la derecha */
const BODY_MAP_ZONES = [
  { id: "hombros", label: "Hombros", color: "#00E5FF" },
  { id: "pecho", label: "Pecho", color: "#FF6B2B" },
  { id: "brazos", label: "Brazos", color: "#22FF88" },
  { id: "abdomen", label: "Abdomen", color: "#FFD600" },
  { id: "gluteos", label: "Glúteos", color: "#FF9EC4" },
  { id: "piernas", label: "Piernas", color: "#A855F7" },
  { id: "espalda", label: "Espalda", color: "#3B82F6" },
];

function BodyMapSVG({ selected, onChange }) {
  const isSelected = (id) => selected.includes(id) || selected.includes("todo");
  const toggle = (id) => onChange(id);
  const colorFor = (id) => BODY_MAP_ZONES.find((z) => z.id === id)?.color || C.cyan;

  const strokeFor = (id) => (isSelected(id) ? colorFor(id) : C.border);

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <svg viewBox="0 0 120 260" width="120" height="260" style={{ flexShrink: 0, display: "block" }}>
        {/* CABEZA */}
        <ellipse cx="60" cy="22" rx="16" ry="20" fill={C.card} stroke={C.border} strokeWidth="1.5" />
        <ellipse cx="60" cy="20" rx="11" ry="13" fill={C.surface} stroke={C.border} strokeWidth="1" />

        {/* CUELLO */}
        <rect x="54" y="40" width="12" height="10" rx="4" fill={C.card} stroke={C.border} strokeWidth="1" />

        {/* HOMBROS */}
        <ellipse cx="32" cy="60" rx="16" ry="10" fill={isSelected("hombros") ? colorFor("hombros") : C.surface} stroke={strokeFor("hombros")} strokeWidth="1.5" onClick={() => toggle("hombros")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />
        <ellipse cx="88" cy="60" rx="16" ry="10" fill={isSelected("hombros") ? colorFor("hombros") : C.surface} stroke={strokeFor("hombros")} strokeWidth="1.5" onClick={() => toggle("hombros")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />

        {/* PECHO */}
        <path d="M44,52 Q60,48 76,52 L78,85 Q60,90 42,85 Z" fill={isSelected("pecho") ? colorFor("pecho") : C.surface} stroke={strokeFor("pecho")} strokeWidth="1.5" onClick={() => toggle("pecho")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />
        <line x1="60" y1="52" x2="60" y2="86" stroke={isSelected("pecho") ? "#00000033" : C.border} strokeWidth="0.5" />

        {/* BRAZOS SUPERIORES */}
        <ellipse cx="26" cy="88" rx="11" ry="24" fill={isSelected("brazos") ? colorFor("brazos") : C.surface} stroke={strokeFor("brazos")} strokeWidth="1.5" onClick={() => toggle("brazos")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />
        <ellipse cx="94" cy="88" rx="11" ry="24" fill={isSelected("brazos") ? colorFor("brazos") : C.surface} stroke={strokeFor("brazos")} strokeWidth="1.5" onClick={() => toggle("brazos")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />

        {/* ANTEBRAZOS */}
        <ellipse cx="22" cy="128" rx="9" ry="20" fill={isSelected("brazos") ? `${colorFor("brazos")}66` : C.card} stroke={strokeFor("brazos")} strokeWidth="1" onClick={() => toggle("brazos")} style={{ cursor: "pointer" }} />
        <ellipse cx="98" cy="128" rx="9" ry="20" fill={isSelected("brazos") ? `${colorFor("brazos")}66` : C.card} stroke={strokeFor("brazos")} strokeWidth="1" onClick={() => toggle("brazos")} style={{ cursor: "pointer" }} />

        {/* ABDOMEN */}
        <path d="M42,85 Q60,90 78,85 L76,118 Q60,122 44,118 Z" fill={isSelected("abdomen") ? colorFor("abdomen") : C.surface} stroke={strokeFor("abdomen")} strokeWidth="1.5" onClick={() => toggle("abdomen")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />
        {[95, 105].map((y) => (
          <line key={y} x1="49" y1={y} x2="71" y2={y} stroke={isSelected("abdomen") ? "#00000022" : "transparent"} strokeWidth="0.8" />
        ))}
        <line x1="60" y1="86" x2="60" y2="118" stroke={isSelected("abdomen") ? "#00000022" : "transparent"} strokeWidth="0.5" />

        {/* GLÚTEOS / CADERA */}
        <path d="M44,118 Q60,122 76,118 L80,148 Q60,155 40,148 Z" fill={isSelected("gluteos") ? colorFor("gluteos") : C.surface} stroke={strokeFor("gluteos")} strokeWidth="1.5" onClick={() => toggle("gluteos")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />

        {/* MUSLOS / CUÁDRICEPS */}
        <ellipse cx="48" cy="180" rx="16" ry="32" fill={isSelected("piernas") ? colorFor("piernas") : C.surface} stroke={strokeFor("piernas")} strokeWidth="1.5" onClick={() => toggle("piernas")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />
        <ellipse cx="72" cy="180" rx="16" ry="32" fill={isSelected("piernas") ? colorFor("piernas") : C.surface} stroke={strokeFor("piernas")} strokeWidth="1.5" onClick={() => toggle("piernas")} style={{ cursor: "pointer", transition: "fill 0.2s ease" }} />

        {/* RODILLAS */}
        <ellipse cx="48" cy="218" rx="11" ry="8" fill={C.card} stroke={strokeFor("piernas")} strokeWidth="1" />
        <ellipse cx="72" cy="218" rx="11" ry="8" fill={C.card} stroke={strokeFor("piernas")} strokeWidth="1" />

        {/* PANTORRILLAS */}
        <ellipse cx="48" cy="242" rx="11" ry="20" fill={isSelected("piernas") ? `${colorFor("piernas")}66` : C.card} stroke={strokeFor("piernas")} strokeWidth="1" onClick={() => toggle("piernas")} style={{ cursor: "pointer" }} />
        <ellipse cx="72" cy="242" rx="11" ry="20" fill={isSelected("piernas") ? `${colorFor("piernas")}66` : C.card} stroke={strokeFor("piernas")} strokeWidth="1" onClick={() => toggle("piernas")} style={{ cursor: "pointer" }} />

        {/* ESPALDA (indicadores laterales) */}
        {isSelected("espalda") && (
          <>
            <rect x="14" y="55" width="8" height="55" rx="4" fill={colorFor("espalda")} opacity="0.7" />
            <rect x="98" y="55" width="8" height="55" rx="4" fill={colorFor("espalda")} opacity="0.7" />
          </>
        )}

        {/* LABELS en las zonas */}
        {[
          { id: "hombros", x: 60, y: 58, label: "HOMBROS" },
          { id: "pecho", x: 60, y: 72, label: "PECHO" },
          { id: "abdomen", x: 60, y: 103, label: "ABDOMEN" },
          { id: "gluteos", x: 60, y: 136, label: "GLÚTEOS" },
          { id: "piernas", x: 60, y: 182, label: "PIERNAS" },
        ].map(({ id, x, y, label }) => isSelected(id) && (
          <text key={id} x={x} y={y} textAnchor="middle" fontSize="5.5" fill="#07070C" fontWeight="800" opacity="0.7">
            {label}
          </text>
        ))}
      </svg>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {BODY_MAP_ZONES.map((z) => {
          const on = isSelected(z.id);
          return (
            <button
              key={z.id}
              onClick={() => toggle(z.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                padding: "8px 12px", borderRadius: 10,
                border: `2px solid ${on ? z.color : C.border}`,
                background: on ? `${z.color}18` : C.card,
              }}
            >
              <span style={{ fontSize: 10 }}>{on ? "☑" : "☐"}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: on ? z.color : C.text }}>{z.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Ejercicios a evitar o advertir según limitaciones físicas (usado en genRoutine) */
const HEALTH_FILTERS = {
  rodilla: {
    avoid: ["sentadilla con salto", "pistol squat", "zancada con salto", "step-up", "sentadilla búlgara con salto"],
    warn: ["sentadilla", "zancada", "prensa de piernas"],
    warnMessage: "Ve con cuidado — implica rodillas",
  },
  cadera: {
    avoid: ["sentadilla profunda", "peso muerto sumo", "zancada lateral"],
    warn: ["hip thrust", "sentadilla", "zancada"],
    warnMessage: "Rango reducido recomendado",
  },
  espalda: {
    avoid: ["peso muerto convencional", "buenos días", "hiperextensión"],
    warn: ["sentadilla", "peso muerto rumano", "remo con barra"],
    warnMessage: "Mantén espalda estrictamente neutral",
  },
  hombros: {
    avoid: ["press militar", "elevaciones laterales pesadas", "fondos en paralelas", "fondos lastrados", "press inclinado"],
    warn: ["press banca", "jalón al pecho", "dominadas"],
    warnMessage: "Rango limitado, cuidado con el dolor",
  },
  tobillos: {
    avoid: ["salto al cajón", "burpee", "sprint máximo", "saltos"],
    warn: ["sentadilla", "zancada", "step-up"],
    warnMessage: "Superficie plana, sin impacto alto",
  },
  saltos: {
    avoid: ["burpee", "salto al cajón", "saltos laterales", "sentadilla con salto", "zancadas con salto", "flexiones con aplauso", "flexiones con palmada"],
    warn: [],
    warnMessage: "",
  },
};

function healthAvoidSet(issues) {
  const avoid = new Set();
  (issues || []).forEach((id) => (HEALTH_FILTERS[id]?.avoid || []).forEach((t) => avoid.add(t)));
  return avoid;
}
function exerciseHealthWarning(name, issues) {
  const n = name.toLowerCase();
  for (const id of issues || []) {
    const f = HEALTH_FILTERS[id];
    if (f && f.warn.some((t) => n.includes(t))) return f.warnMessage;
  }
  return null;
}
function filterExercisesByHealth(pool, issues) {
  if (!issues || !issues.length || issues.includes("ninguna")) return pool;
  const avoid = healthAvoidSet(issues);
  return pool.filter((e) => {
    const n = (e.n || e.name || "").toLowerCase();
    return ![...avoid].some((t) => n.includes(t));
  });
}

function WeightProjectionChart({ currentWeight, targetWeight, weeks }) {
  const width = 300, height = 120, padding = 20;
  const startY = padding, endY = height - padding;
  const startX = padding, endX = width - padding;
  const losing = targetWeight < currentWeight;
  const path = `M ${startX},${losing ? startY : endY} C ${startX + (endX - startX) * 0.6},${losing ? startY : endY} ${startX + (endX - startX) * 0.4},${losing ? endY : startY} ${endX},${losing ? endY : startY}`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="projGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF6B2B" />
          <stop offset="100%" stopColor="#22FF88" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1={padding} y1={padding + t * (height - 2 * padding)} x2={width - padding} y2={padding + t * (height - 2 * padding)} stroke={C.border} strokeWidth="1" strokeDasharray="4,4" />
      ))}
      <path d={path} fill="none" stroke="url(#projGrad)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={startX} cy={losing ? startY : endY} r="5" fill="#FF6B2B" />
      <circle cx={endX} cy={losing ? endY : startY} r="5" fill="#22FF88" />
      <text x={startX + 8} y={losing ? startY + 4 : endY - 8} fontSize="11" fill="#FF6B2B" fontWeight="700">{currentWeight}kg</text>
      <text x={endX - 40} y={losing ? endY - 8 : startY + 4} fontSize="11" fill="#22FF88" fontWeight="700">{targetWeight}kg</text>
      <text x={width / 2} y={height} fontSize="10" fill={C.dim} textAnchor="middle">~{weeks} semanas estimadas</text>
    </svg>
  );
}

function OnboardingProgress({ step, total }) {
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: "hidden", margin: "0 0 4px" }}>
      <div style={{ height: "100%", width: `${(step / total) * 100}%`, background: C.cyan, borderRadius: 99, transition: "width 0.4s ease" }} />
    </div>
  );
}

function SelectionCard({ emoji, name, subtitle, selected, onSelect, color }) {
  const c = color || C.cyan;
  return (
    <button
      onClick={onSelect}
      style={{
        padding: "16px 20px", borderRadius: 14, border: `2px solid ${selected ? c : C.border}`,
        background: selected ? `${c}18` : C.card, display: "flex", alignItems: "center", gap: 14,
        textAlign: "left", transition: "all 0.15s ease", transform: selected ? "scale(1.01)" : "scale(1)", width: "100%",
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: "50%", border: `2px solid ${selected ? c : C.border}`,
        background: selected ? c : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" stroke="#07070C" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{emoji} {name}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </button>
  );
}

/* Selector deslizable de números (edad, altura, peso). 56px por fila. */
function ScrollPicker({ value, onChange, min, max, unit = "", step = 1 }) {
  const rowH = 56;
  const items = useMemo(() => {
    const arr = [];
    for (let i = min; i <= max; i += step) arr.push(Math.round(i * 10) / 10);
    return arr;
  }, [min, max, step]);
  const idxOf = (v) => Math.max(0, Math.min(items.length - 1, Math.round((v - min) / step)));
  const [scrollY, setScrollY] = useState(idxOf(value) * rowH);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  const onStart = (clientY) => { startY.current = clientY; startScroll.current = scrollY; setDragging(true); };
  const onMove = (clientY) => {
    const delta = startY.current - clientY;
    setScrollY(Math.max(0, Math.min(startScroll.current + delta, (items.length - 1) * rowH)));
  };
  const onEnd = () => {
    setDragging(false);
    const idx = Math.round(scrollY / rowH);
    setScrollY(idx * rowH);
    onChange(items[idx]);
  };

  const activeIdx = Math.round(scrollY / rowH);

  return (
    <div
      style={{ height: rowH * 3, overflow: "hidden", position: "relative", touchAction: "none", userSelect: "none" }}
      onTouchStart={(e) => onStart(e.touches[0].clientY)}
      onTouchMove={(e) => onMove(e.touches[0].clientY)}
      onTouchEnd={onEnd}
      onMouseDown={(e) => { e.preventDefault(); onStart(e.clientY); }}
      onMouseMove={(e) => { if (dragging) onMove(e.clientY); }}
      onMouseUp={onEnd}
      onMouseLeave={() => dragging && onEnd()}
    >
      <div style={{ position: "absolute", top: rowH, left: 0, right: 0, height: rowH, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, pointerEvents: "none", zIndex: 1 }} />
      <div style={{ transform: `translateY(${rowH - scrollY}px)`, transition: dragging ? "none" : "transform 0.2s ease" }}>
        {items.map((item, i) => {
          const distance = Math.abs(i - activeIdx);
          return (
            <div
              key={item}
              style={{
                height: rowH, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: distance === 0 ? 42 : distance === 1 ? 26 : 18,
                fontWeight: distance === 0 ? 900 : 400,
                color: distance === 0 ? C.text : `rgba(255,255,255,${Math.max(0.08, 0.3 - distance * 0.1)})`,
                transition: "all 0.1s ease",
              }}
            >
              {item}{unit}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: rowH, background: `linear-gradient(to bottom, ${C.bg}, transparent)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: rowH, background: `linear-gradient(to top, ${C.bg}, transparent)`, pointerEvents: "none" }} />
    </div>
  );
}

const PLAN_LOADING_MESSAGES = [
  "Analizando tu perfil...",
  "Calculando tu plan óptimo...",
  "Ajustando para tu objetivo...",
  "Configurando tus rutinas...",
  "¡Tu plan está listo!",
];

/* Resumen personalizado reutilizable: recalcula macros con el peso más reciente registrado */
function PersonalSummaryScreen({ name, onBack, sessions = [] }) {
  const weightLog = getWeightLog();
  const weight = weightLog.length ? weightLog[weightLog.length - 1].weight : store.get("weight", 70);
  const height = store.get("height", 170);
  const age = store.get("age", 20);
  const gender = store.get("gender", "m");
  const goalId = store.get("training_goal", null);
  const days = store.get("weekly_goal", 4);
  const targetWeight = store.get("target_weight", weight);
  const healthIssues = store.get("health_issues", []);
  const bodyFat = parseFloat(store.get("body_fat", ""));
  const goalObj = TRAINING_GOALS.find((g) => g.id === goalId) || TRAINING_GOALS[0];
  const sex = gender === "f" ? "f" : "m";
  const tmb = calcTMB(weight, height, age, sex, bodyFat);
  const activityMult = getActivityMult(sessions, days);
  const tdee = tmb * activityMult;
  const calGoal = goalId === "fat_loss" ? tdee - 400 : goalId === "muscle" ? tdee + 300 : goalId === "athletic" || goalId === "endurance" ? tdee + 200 : tdee;
  const calories = Math.round(calGoal);
  const protein = Math.round(weight * (goalId === "fat_loss" ? 2.2 : 2.0));
  const hero0 = HEROES[0];
  const hasIssues = healthIssues.length && !healthIssues.includes("ninguna");
  const weightDiff = Math.round((targetWeight - weight) * 10) / 10;
  const showProjection = Math.abs(weightDiff) >= 1;
  const projectionWeeks = weightDiff < 0 ? Math.max(1, Math.round(Math.abs(weightDiff) / 0.5)) : Math.max(1, Math.round(weightDiff / 0.3));
  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Configuración</button>
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>📊 Tu resumen</h1>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>Basado en tu perfil actual, {name}</p>
      </div>
      {goalId && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: goalObj.color, background: `${goalObj.color}18`, padding: "8px 16px", borderRadius: 99 }}>
            {goalObj.emoji} {goalObj.name}
          </span>
        </div>
      )}
      {showProjection && (
        <div className="card" style={{ marginTop: 14, padding: "10px 8px" }}>
          <WeightProjectionChart currentWeight={weight} targetWeight={targetWeight} weeks={projectionWeeks} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.orange }}>{calories}</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🔥 kcal/día</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.red }}>{protein}g</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🥩 proteína</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.green }}>{days}x</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>📅 sesiones/sem</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12, textAlign: "center", padding: 14 }}>
        <p style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>TU HÉROE INICIAL</p>
        <div style={{ fontSize: 36, marginTop: 6 }}>{hero0.emoji}</div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{hero0.name}</div>
      </div>
      {hasIssues && (
        <div className="card" style={{ marginTop: 10, padding: "10px 14px", borderColor: `${C.green}55` }}>
          <p style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓ Rutinas adaptadas a tu condición física</p>
        </div>
      )}
    </div>
  );
}

function PlanLoadingScreen({ onDone }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx((i) => Math.min(PLAN_LOADING_MESSAGES.length - 1, i + 1)), 400);
    const start = Date.now();
    let raf;
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - start) / 2000) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => { clearInterval(msgTimer); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ minHeight: "100svh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ fontSize: 56, animation: "spin 1.6s linear infinite" }}>⚡</div>
      <p style={{ fontSize: 15, fontWeight: 700, marginTop: 20, color: C.text }}>{PLAN_LOADING_MESSAGES[msgIdx]}</p>
      <div style={{ width: "70%", height: 4, background: C.border, borderRadius: 99, overflow: "hidden", marginTop: 20 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: C.cyan, borderRadius: 99 }} />
      </div>
    </div>
  );
}

const ONBOARD_TOTAL_STEPS = 10;

function Welcome({ onDone }) {
  const [step, setStep] = useState(1);
  const [slide, setSlide] = useState("visible");
  const [value, setValue] = useState("");
  const [gender, setGender] = useState(null);
  const [age, setAge] = useState(20);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [targetWeight, setTargetWeight] = useState(70);
  const [goal, setGoal] = useState(null);
  const [fitnessLevel, setFitnessLevel] = useState(null);
  const [healthIssues, setHealthIssues] = useState([]);
  const [days, setDays] = useState(4);
  const [mode, setMode] = useState("guiado");
  const [showPlanLoading, setShowPlanLoading] = useState(false);
  const [bodyFocus, setBodyFocus] = useState([]);

  const go = (next) => {
    setSlide("exit-left");
    setTimeout(() => {
      setStep(next);
      setSlide("enter-right");
      requestAnimationFrame(() => setSlide("visible"));
    }, 180);
  };
  const back = (prev) => {
    setSlide("exit-left");
    setTimeout(() => {
      setStep(prev);
      setSlide("enter-right");
      requestAnimationFrame(() => setSlide("visible"));
    }, 180);
  };

  const toggleHealthIssue = (id) => {
    setHealthIssues((prev) => {
      if (id === "ninguna") return ["ninguna"];
      const withoutNone = prev.filter((x) => x !== "ninguna");
      return withoutNone.includes(id) ? withoutNone.filter((x) => x !== id) : [...withoutNone, id];
    });
  };

  const skipAll = () => {
    onDone(sanitize(value) || "Atleta", "guiado");
  };

  const finish = () => {
    store.set("gender", gender);
    store.set("age", age);
    store.set("height", height);
    store.set("weight", weight);
    store.set("target_weight", targetWeight);
    store.set("training_goal", goal);
    store.set("fitness_level", fitnessLevel?.id || null);
    store.set("health_issues", healthIssues);
    store.set("body_focus", bodyFocus);
    store.set("weekly_goal", days);
    store.set("profile", { goal, days });
    if (weight) saveWeightEntry(weight);
    const goalObj = TRAINING_GOALS.find((g) => g.id === goal);
    onDone(sanitize(value), mode);
    void goalObj;
  };

  const wrap = (children, { showSkip = false, showBack = true, backTo = null } = {}) => (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        {showBack && step > 1 ? (
          <button onClick={() => back(backTo ?? step - 1)} style={{ color: C.mut, fontSize: 18, padding: 4 }}>←</button>
        ) : <div style={{ width: 26 }} />}
        <div style={{ flex: 1 }}><OnboardingProgress step={step} total={ONBOARD_TOTAL_STEPS} /></div>
        {showSkip && (
          <button onClick={skipAll} style={{ color: C.dim, fontSize: 12, fontWeight: 700 }}>Saltar →</button>
        )}
        {!showSkip && <div style={{ width: 40 }} />}
      </div>
      <div className={`exercise-card-${slide}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "8px 24px 24px", gap: 14 }}>
        {children}
      </div>
    </div>
  );

  const continueBtn = (onClick, disabled, label = "Continuar") => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", height: 56, background: "#fff", color: "#07070C", fontWeight: 800, fontSize: 17,
        borderRadius: 99, border: "none", marginTop: 18, opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );

  if (showPlanLoading) {
    return <PlanLoadingScreen onDone={() => { setShowPlanLoading(false); setStep(11); }} />;
  }

  /* Paso 11 — Resumen final */
  if (step === 11) {
    const goalObj = TRAINING_GOALS.find((g) => g.id === goal) || TRAINING_GOALS[0];
    const w = weight, h = height, a = age;
    const sex = gender === "f" ? "f" : "m";
    const tmb = calcTMB(w, h, a, sex, null);
    const activityMult = getActivityMult([], days);
    const tdee = tmb * activityMult;
    const calGoal = goal === "fat_loss" ? tdee - 400 : goal === "muscle" ? tdee + 300 : goal === "athletic" || goal === "endurance" ? tdee + 200 : tdee;
    const calories = Math.round(calGoal);
    const protein = Math.round(w * (goal === "fat_loss" ? 2.2 : 2.0));
    const hero0 = HEROES[0];
    const lvlIdxStart = fitnessLevel?.lvlIdx ?? 0;
    const estMinutes = 30 + lvlIdxStart * 5;
    const hasIssues = healthIssues.length && !healthIssues.includes("ninguna");
    const weightDiff = Math.round((targetWeight - weight) * 10) / 10;
    const showProjection = Math.abs(weightDiff) >= 1;
    const projectionWeeks = weightDiff < 0 ? Math.max(1, Math.round(Math.abs(weightDiff) / 0.5)) : Math.max(1, Math.round(weightDiff / 0.3));
    return (
      <div style={{ minHeight: "100svh", background: C.bg, padding: "32px 20px", display: "flex", flexDirection: "column" }} className="fade-up">
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>✨ Tu plan está listo</h1>
          <p style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>Personalizado para ti, {value.trim() || "atleta"}</p>
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: goalObj.color, background: `${goalObj.color}18`, padding: "8px 16px", borderRadius: 99 }}>
            {goalObj.emoji} {goalObj.name}
          </span>
        </div>

        {showProjection && (
          <div className="card" style={{ marginTop: 16, padding: "10px 8px" }}>
            <WeightProjectionChart currentWeight={weight} targetWeight={targetWeight} weeks={projectionWeeks} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
          <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.orange }}>{calories}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🔥 kcal/día</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.red }}>{protein}g</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🥩 proteína</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.green }}>{days}x</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>📅 ~{estMinutes} min/sesión</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12, textAlign: "center", padding: "14px" }}>
          <p style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>EMPIEZAS COMO</p>
          <div style={{ fontSize: 40, marginTop: 6 }}>{hero0.emoji}</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{hero0.name}</div>
          <div style={{ fontSize: 12, color: C.mut, fontStyle: "italic", marginTop: 4 }}>“{hero0.quote}”</div>
        </div>

        {hasIssues && (
          <div className="card" style={{ marginTop: 10, padding: "10px 14px", borderColor: `${C.green}55` }}>
            <p style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓ Rutinas adaptadas a tu condición física</p>
          </div>
        )}

        <div className="chip-wrap" style={{ marginTop: 14, justifyContent: "center" }}>
          {MODE_OPTIONS.map((m) => (
            <button key={m.id} className={`chip ${mode === m.id ? "on" : ""}`} style={mode === m.id ? { background: goalObj.color } : {}} onClick={() => setMode(m.id)}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <button
          className="btn-xl"
          onClick={finish}
          style={{ marginTop: 20, height: 64, background: goalObj.color, color: "#07070C", fontSize: 18, fontWeight: 900, borderRadius: 99 }}
        >
          Comenzar mi plan →
        </button>
      </div>
    );
  }

  /* Paso 10 — Días disponibles */
  if (step === 10) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuántos días a la semana puedes entrenar?</p>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: C.cyan }}>{days}x</div>
          <div style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>por semana</div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n} onClick={() => setDays(n)}
                style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${days === n ? C.cyan : C.border}`, background: days === n ? `${C.cyan}20` : C.card, color: days === n ? C.cyan : C.text, fontWeight: 800 }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {continueBtn(() => setShowPlanLoading(true))}
      </>
    );
  }

  /* Paso 9 — Limitaciones de salud */
  if (step === 9) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Tienes alguna limitación física?</p>
        <p style={{ color: C.dim, fontSize: 11, textAlign: "center" }}>Puedes elegir varias</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {HEALTH_ISSUE_OPTIONS.map((h) => (
            <SelectionCard key={h.id} emoji={h.emoji} name={h.label} selected={healthIssues.includes(h.id)} onSelect={() => toggleHealthIssue(h.id)} color={C.green} />
          ))}
        </div>
        {continueBtn(() => go(10), false)}
      </>
    );
  }

  /* Paso 8 — Nivel de fitness */
  if (step === 8) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuál es tu nivel actual?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {FITNESS_LEVEL_OPTIONS.map((f) => (
            <SelectionCard key={f.id} emoji={f.emoji} name={f.label} subtitle={f.desc} selected={fitnessLevel?.id === f.id} onSelect={() => setFitnessLevel(f)} />
          ))}
        </div>
        {continueBtn(() => go(9), !fitnessLevel)}
      </>,
      { backTo: 7.5 }
    );
  }

  /* Paso 7.5 — Zona corporal a priorizar (opcional) */
  if (step === 7.5) {
    const toggleZone = (id) => {
      setBodyFocus((prev) => {
        if (id === "todo") return ["todo"];
        const without = prev.filter((z) => z !== "todo");
        return without.includes(id) ? without.filter((z) => z !== id) : [...without, id];
      });
    };
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Qué zona quieres trabajar más?</p>
        <button
          onClick={() => toggleZone("todo")}
          style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 700, width: "100%",
            border: `1px solid ${bodyFocus.includes("todo") ? C.cyan : C.border}`,
            background: bodyFocus.includes("todo") ? `${C.cyan}18` : C.card,
            color: bodyFocus.includes("todo") ? C.cyan : C.text,
          }}
        >
          {bodyFocus.includes("todo") ? "☑" : "☐"} Todo el cuerpo
        </button>
        <div style={{ marginTop: 12 }}>
          <BodyMapSVG selected={bodyFocus} onChange={toggleZone} />
        </div>
        {continueBtn(() => go(8))}
      </>,
      { backTo: 7 }
    );
  }

  /* Paso 7 — Objetivo principal */
  if (step === 7) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Qué quieres lograr?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
          {TRAINING_GOALS.map((g) => (
            <button
              key={g.id} onClick={() => setGoal(g.id)}
              style={{
                padding: "14px 10px", borderRadius: 14, textAlign: "left",
                border: `2px solid ${goal === g.id ? g.color : C.border}`,
                background: goal === g.id ? `${g.color}18` : C.card,
              }}
            >
              <div style={{ fontSize: 22 }}>{g.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: goal === g.id ? g.color : C.text }}>{g.name}</div>
              <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{g.subtitle}</div>
            </button>
          ))}
        </div>
        {continueBtn(() => go(7.5), !goal)}
      </>
    );
  }

  /* Paso 6 — Peso objetivo */
  if (step === 6) {
    const diff = Math.round((targetWeight - weight) * 10) / 10;
    const diffLabel = diff < -0.4 ? `Perder ${Math.abs(diff)}kg` : diff > 0.4 ? `Ganar ${diff}kg` : "Mantener mi peso";
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuál es tu peso objetivo?</p>
        <ScrollPicker value={targetWeight} onChange={setTargetWeight} min={40} max={200} unit="kg" />
        <p style={{ textAlign: "center", fontSize: 13, color: C.mut, fontWeight: 700 }}>{diffLabel}</p>
        {continueBtn(() => go(7))}
      </>
    );
  }

  /* Paso 5 — Peso actual */
  if (step === 5) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuánto pesas actualmente?</p>
        <ScrollPicker value={weight} onChange={setWeight} min={40} max={200} unit="kg" />
        {continueBtn(() => go(6))}
      </>
    );
  }

  /* Paso 4 — Altura */
  if (step === 4) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuánto mides?</p>
        <ScrollPicker value={height} onChange={setHeight} min={140} max={220} unit="cm" />
        {continueBtn(() => go(5))}
      </>
    );
  }

  /* Paso 3 — Edad */
  if (step === 3) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuántos años tienes?</p>
        <ScrollPicker value={age} onChange={setAge} min={13} max={80} unit="" />
        {continueBtn(() => go(4))}
      </>
    );
  }

  /* Paso 2 — Género */
  if (step === 2) {
    return wrap(
      <>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cuál es tu género?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {GENDER_OPTIONS.map((g) => (
            <SelectionCard key={g.id} emoji={g.emoji} name={g.label} selected={gender === g.id} onSelect={() => setGender(g.id)} color={C.green} />
          ))}
        </div>
        {continueBtn(() => go(3), !gender)}
      </>
    );
  }

  /* Paso 1 — Nombre */
  return wrap(
    <>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div className="pop" style={{ fontSize: 56, marginBottom: 10 }}>⚡</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: 3, background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          F.A.S.E.
        </h1>
      </div>
      <p style={{ color: C.text, fontSize: 16, fontWeight: 700, textAlign: "center" }}>¿Cómo te llamas?</p>
      <input
        className="input"
        placeholder="Tu nombre"
        value={value}
        maxLength={24}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && go(2)}
        autoFocus
        style={{ textAlign: "center", fontSize: 18 }}
      />
      {continueBtn(() => go(2), !value.trim())}
      <p style={{ color: C.dim, fontSize: 12, textAlign: "center", marginTop: 4 }}>
        Sin cuentas ni correos. Todo se guarda solo en tu dispositivo.
      </p>
    </>,
    { showSkip: true, showBack: false }
  );
}

/* ─── Detalle de una sesión del historial (stats + nota) ─── */
function SessionDetail({ session, onBack, onUpdateNote }) {
  const [note, setNote] = useState(session.note || "");
  const isBody = session.kind === "cuerpo";
  const disc = isBody ? null : DISCIPLINES[session.disc];
  const allSets = isBody ? [] : session.exercises.flatMap((e) => e.sets);
  const okSets = allSets.filter((s) => s.ok).length;
  const volume = Math.round(allSets.filter((s) => s.ok).reduce((a, s) => a + s.weight * s.reps, 0));
  const d = new Date(session.ts);
  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Volver</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>
        {isBody ? "🧘 Cuerpo" : `${disc?.icon || "💪"} ${disc?.label || session.disc}`}
      </h2>
      <p className="muted" style={{ marginTop: 2 }}>
        {d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })} · {d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
      </p>

      {!isBody && (
        <>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <StatBox label="Series" value={`${okSets}/${allSets.length}`} accent={C.green} />
            <StatBox label="Volumen" value={formatVolume(volume)} accent={C.cyan} />
            <StatBox label="Duración" value={formatDuration(session.durationMin || 0)} accent={C.orange} />
          </div>
          <div className="sec-title">Ejercicios</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {session.exercises.map((e, i) => {
              const maxW = Math.max(0, ...e.sets.map((s) => s.weight));
              return (
                <div key={i} className="card" style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{e.name}</p>
                  <p style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>
                    {e.sets.filter((s) => s.ok).length}/{e.sets.length} series{maxW > 0 ? ` · ${maxW} kg máx` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="sec-title">📝 Nota de esta sesión (opcional)</div>
      <textarea
        className="input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onUpdateNote?.(session.id, sanitizeNote(note))}
        placeholder="¿Cómo te sentiste? ¿Algo que mejorar?"
        style={{ width: "100%", minHeight: 60, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, fontSize: 13, resize: "vertical" }}
      />
    </div>
  );
}

/* ─── Historial completo con filtros ─── */
const HISTORY_FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "gimnasio", label: "Gimnasio" },
  { id: "calistenia", label: "Calistenia" },
  { id: "futbol", label: "Fútbol" },
  { id: "basquet", label: "Básquetbol" },
  { id: "atletismo", label: "Atletismo" },
  { id: "cuerpo", label: "Cuerpo" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
];

function matchesHistoryFilter(s, filterId) {
  if (filterId === "todas") return true;
  if (filterId === "cuerpo") return s.kind === "cuerpo";
  if (filterId === "gimnasio") return s.disc === "gimnasio";
  if (filterId === "calistenia") return s.disc === "calistenia";
  if (filterId === "futbol") return s.disc === "futbolGym" || s.disc === "futbolParque";
  if (filterId === "basquet") return s.disc === "basquetCancha" || s.disc === "basquetSinCancha";
  if (filterId === "atletismo") return s.disc === "atletismo";
  if (filterId === "semana") return s.ts >= startOfWeek();
  if (filterId === "mes") {
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
    return s.ts >= m.getTime();
  }
  return true;
}

const HISTORY_SORTS = [
  { id: "recent", label: "Más reciente" },
  { id: "volume", label: "Más volumen" },
  { id: "duration", label: "Más duración" },
];

function FullHistory({ sessions, onDelete, onBack, onUpdateNote }) {
  const [filter, setFilter] = useState("todas");
  const [sortBy, setSortBy] = useState("recent");
  const [detail, setDetail] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const records = useMemo(() => computeRecords(sessions), [sessions]);
  const recordTsSet = useMemo(() => new Set(records.map((r) => r.ts)), [records]);

  const sorted = useMemo(() => {
    const filtered = sessions.filter((s) => matchesHistoryFilter(s, filter));
    return [...filtered].sort((a, b) => {
      if (sortBy === "volume") return sessionVolume(b) - sessionVolume(a);
      if (sortBy === "duration") return (b.durationMin || 0) - (a.durationMin || 0);
      return b.ts - a.ts;
    });
  }, [sessions, filter, sortBy]);

  if (detail) return <SessionDetail session={detail} onBack={() => setDetail(null)} onUpdateNote={onUpdateNote} />;

  return (
    <div className="screen">
      <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Inicio</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>Historial — {sessions.length} sesiones totales</h2>

      <div className="chip-wrap" style={{ marginTop: 10 }}>
        {HISTORY_FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      <div className="chip-wrap" style={{ marginTop: 8 }}>
        {HISTORY_SORTS.map((o) => (
          <button
            key={o.id} className={`chip ${sortBy === o.id ? "on" : ""}`}
            style={sortBy === o.id ? { background: C.cyan } : {}} onClick={() => setSortBy(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {sorted.length === 0 ? (
          <p style={{ fontSize: 13, color: C.mut, textAlign: "center", marginTop: 20 }}>No hay sesiones con este filtro.</p>
        ) : (
          sorted.map((s) => {
            const isBody = s.kind === "cuerpo";
            const disc = isBody ? null : DISCIPLINES[s.disc];
            const sec = isBody ? BODY_SECTIONS.find((b) => b.id === s.section) : null;
            const vol = isBody ? 0 : sessionVolume(s);
            const okSets = isBody ? 0 : s.exercises.flatMap((e) => e.sets).filter((st) => st.ok).length;
            const totalSets = isBody ? 0 : s.exercises.flatMap((e) => e.sets).length;
            return (
              <div key={s.id} style={{ position: "relative" }}>
                <button className="card" onClick={() => setDetail(s)} style={{ width: "100%", textAlign: "left", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{isBody ? sec?.icon || "🧘" : disc?.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{isBody ? `Cuerpo · ${sec?.name || ""}` : disc?.label}</span>
                        {recordTsSet.has(s.ts) && <span style={{ fontSize: 12 }}>🏆</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>
                        {timeAgo(s.ts)}{!isBody ? ` · ${LEVELS[s.levelIdx]?.name || ""}` : ""}
                        {!isBody && s.durationMin ? ` · ${formatDuration(s.durationMin)}` : ""}
                        {!isBody && totalSets ? ` · ${okSets}/${totalSets} series` : ""}
                        {vol > 0 ? ` · ${formatVolume(vol)}` : ""}
                      </div>
                      {s.note && (
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          📝 {s.note}
                        </div>
                      )}
                    </div>
                    <span
                      role="button" tabIndex={0} aria-label="Más opciones"
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === s.id ? null : s.id); }}
                      style={{ fontSize: 16, padding: 4 }}
                    >
                      ···
                    </span>
                  </div>
                </button>
                {menuId === s.id && (
                  <div className="card pop" style={{ position: "absolute", top: "100%", right: 8, zIndex: 30, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    <button onClick={() => { setDetail(s); setMenuId(null); }} style={{ fontSize: 12, padding: "6px 10px", textAlign: "left" }}>Ver detalle</button>
                    <button onClick={() => { setConfirmId(s.id); setMenuId(null); }} style={{ fontSize: 12, padding: "6px 10px", textAlign: "left", color: C.red }}>Eliminar sesión</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {confirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="card" style={{ textAlign: "center", padding: 20, maxWidth: 300 }}>
            <p style={{ fontSize: 14, fontWeight: 800 }}>¿Eliminar esta sesión?</p>
            <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>No se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn-xl" onClick={() => setConfirmId(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>Cancelar</button>
              <button className="btn-xl" onClick={() => { onDelete(confirmId); setConfirmId(null); }} style={{ background: C.red, color: "#fff" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── INICIO ─── */
function Home({ name, sessions, streak, onTrain, onStartPlan, onRepeat, mode, broken, canFreeze, onFreeze, onDeleteSession, onSaveMatch, onUpdateNote }) {
  const [menuId, setMenuId] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const longPressRef = useRef(null);
  const prevStreakRef = useRef(streak);
  const [streakBounce, setStreakBounce] = useState(false);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [showRegimenPreview, setShowRegimenPreview] = useState(false);
  const [showMatchDebrief, setShowMatchDebrief] = useState(false);
  const [showCombine, setShowCombine] = useState(false);
  const [previewTip, setPreviewTip] = useState(null);
  const freezesUsedInfo = store.get("freezes_used", null);
  const freezesUsedThisMonth = (() => {
    const now = new Date();
    return freezesUsedInfo && freezesUsedInfo.month === now.getMonth() && freezesUsedInfo.year === now.getFullYear() ? freezesUsedInfo.count : 0;
  })();
  const freezesLeft = Math.max(0, 1 - freezesUsedThisMonth);
  useEffect(() => {
    if (streak > prevStreakRef.current) {
      setStreakBounce(true);
      const t = setTimeout(() => setStreakBounce(false), 500);
      prevStreakRef.current = streak;
      return () => clearTimeout(t);
    }
    prevStreakRef.current = streak;
  }, [streak]);

  /* Plan del día */
  const [dailyPlanState] = useState(() => getDailyPlan(sessions));

  const startLongPress = (id) => {
    longPressRef.current = setTimeout(() => setMenuId(id), 500);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };
  const pro = mode === "pro";
  const hero = heroForStreak(streak);
  const recent = sessions.slice(-3).reverse();
  const lastEntreno = [...sessions].reverse().find((s) => s.kind === "entreno");
  const insight = useMemo(() => computeInsight(sessions), [sessions]);

  /* Resumen semanal (desde el lunes) */
  const week = sessions.filter((s) => s.ts >= startOfWeek()).length;

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
  const trainedToday = sessions.some((s) => dayKey(s.ts) === todayKey());
  const bestStreakEver = Math.max(longestStreakEver(sessions), streak);
  const isStreakRecordToday = streak > 0 && streak === bestStreakEver && trainedToday;

  if (detailSession) return <SessionDetail session={detailSession} onBack={() => setDetailSession(null)} onUpdateNote={onUpdateNote} />;
  if (showFullHistory) {
    return <FullHistory sessions={sessions} onDelete={onDeleteSession} onBack={() => setShowFullHistory(false)} onUpdateNote={onUpdateNote} />;
  }

  const greetHour = new Date().getHours();
  const greetWord = greetHour < 12 ? "Buenos días" : greetHour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="screen home-bg" style={{ paddingTop: 0 }}>
      {!pro && (
        <div style={{ margin: "0 -16px 0", padding: "14px 16px 0", background: C.surface, borderBottom: `1px solid ${C.borderSubtle || C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{hero.emoji}</span>
          <p style={{ fontSize: 13, color: C.dim, flex: 1, minWidth: 0 }}>
            {greetWord}, {name}
            {streak > 0 && <span style={{ marginLeft: 8, fontWeight: 800, color: C.orange }}>🔥 {streak} {streak === 1 ? "día" : "días"}</span>}
            {isStreakRecordToday && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: "#FFD700" }}>🏆 Récord</span>}
          </p>
        </div>
      )}
      {pro && <p style={{ fontSize: 18, fontWeight: 800 }}>Hola, <span style={{ color: C.cyan }}>{name}</span></p>}

      {pro && (
        /* Modo Control total: estadísticas limpias, sin héroes ni animaciones */
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <StatBox label="Sesiones" value={sessions.length} />
          <StatBox label="Volumen total" value={`${totalVolume} kg`} />
          <StatBox label="Días activos (mes)" value={activeDaysMonth} />
        </div>
      )}

      {/* Plan del día inteligente */}
      {(() => {
        const dp = dailyPlanState.plan;
        const info = describeDailyPlan(dp);
        const duration = DAILY_DURATION[dp.discId] || 40;
        return (
          <div
            className="card fade-up"
            style={{
              marginTop: 12, padding: 16,
              background: `linear-gradient(135deg, ${info.color}22 0%, ${C.card2} 60%)`,
              border: `1px solid ${info.color}55`,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 32, lineHeight: 1 }}>{info.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 900 }}>
                  {info.label}{info.focusLabel ? ` · ${info.focusLabel}` : ""}
                </p>
                <p style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: LEVELS[dp.lvlIdx]?.color }}>
                  {LEVELS[dp.lvlIdx]?.emoji} {LEVELS[dp.lvlIdx]?.name} · ~{duration} min
                </p>
                {dp.isEarlySession && (
                  <span style={{ display: "inline-block", fontSize: 9, fontWeight: 800, color: info.color, background: `${info.color}22`, padding: "2px 6px", borderRadius: 99, marginTop: 6 }}>
                    📅 Sesión adelantada
                  </span>
                )}
                <p style={{ fontSize: 12, color: C.mut, marginTop: 6, lineHeight: 1.4 }}>{dp.reason}</p>
              </div>
            </div>
            <button
              className="btn-xl btn-physics"
              onClick={() => onStartPlan?.(dp.discId, dp.focusId, dp.lvlIdx)}
              style={{ marginTop: 12, background: info.color, color: "#07070C", fontSize: 20, minHeight: 68, boxShadow: `0 8px 24px ${info.color}40` }}
            >
              ▶ Empezar este plan
            </button>
            <div style={{ textAlign: "center", display: "flex", justifyContent: "center", gap: 14 }}>
              {lastEntreno && (
                <button onClick={() => onRepeat?.(lastEntreno)} style={{ marginTop: 6, color: C.dim, fontSize: 12 }}>
                  o repetir {DISCIPLINES[lastEntreno.disc]?.label || lastEntreno.discLabel || "sesión"} de ayer →
                </button>
              )}
              <button onClick={() => setShowRegimenPreview(true)} style={{ marginTop: 6, color: C.dim, fontSize: 12 }}>
                ver ejercicios →
              </button>
            </div>
            {showRegimenPreview && (() => {
              let previewExercises = [];
              try { previewExercises = genRoutine(dp.discId, dp.focusId, dp.lvlIdx) || []; } catch { previewExercises = []; }
              const totalMin = previewExercises.reduce((a, e) => a + Math.round((e.sets * 15 + e.sets * e.rest) / 60), 0);
              return (
                <div
                  onClick={() => setShowRegimenPreview(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="card"
                    style={{ width: "100%", maxWidth: 430, maxHeight: "80vh", display: "flex", flexDirection: "column", borderRadius: "20px 20px 0 0", padding: "20px 20px calc(16px + env(safe-area-inset-bottom))", animation: "sheetUp 0.3s ease-out" }}
                  >
                    <p style={{ fontSize: 16, fontWeight: 800 }}>{info.label}{info.focusLabel ? ` — ${info.focusLabel}` : ""} — {LEVELS[dp.lvlIdx]?.name}</p>
                    <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{previewExercises.length} ejercicios · ~{totalMin} minutos</p>
                    <div style={{ overflowY: "auto", marginTop: 10, flex: 1 }}>
                      {previewExercises.map((ex, i) => {
                        const gifUrl = EXERCISE_GIFS[ex.name];
                        const exMin = Math.round((ex.sets * 15 + ex.sets * ex.rest) / 60);
                        return (
                          <button
                            key={i}
                            onClick={() => setPreviewTip(previewTip === i ? null : i)}
                            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "8px 0", borderBottom: i < previewExercises.length - 1 ? `1px solid ${C.borderSubtle || C.border}` : "none" }}
                          >
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: C.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              {gifUrl ? (
                                <img
                                  src={gifUrl} alt={ex.name} loading="lazy"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                <span style={{ fontSize: 18 }}>{getExerciseEmoji(ex.name)}</span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
                              <div style={{ fontSize: 11, color: C.mut }}>{ex.sets} series × {ex.reps}</div>
                              {previewTip === i && <div style={{ fontSize: 11, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>{ex.tip}</div>}
                            </div>
                            <div style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>~{exMin} min</div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      className="btn-xl btn-physics"
                      onClick={() => { setShowRegimenPreview(false); onStartPlan?.(dp.discId, dp.focusId, dp.lvlIdx); }}
                      style={{ marginTop: 12, minHeight: 64, background: info.color, color: "#07070C", fontSize: 18 }}
                    >
                      ▶ Empezar sesión
                    </button>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const goal = getTrainingGoal();
              return goal ? (
                <div style={{ marginTop: 8, textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: goal.color, background: `${goal.color}18`, padding: "4px 10px", borderRadius: 99 }}>
                    Objetivo: {goal.emoji} {goal.name}
                  </span>
                </div>
              ) : null;
            })()}
            {(() => {
              const today = todayInWeeklyStructure();
              return today ? (
                <p style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 6 }}>
                  Día {today.dayNumber} de {today.total} de tu plan — {today.sessionLabel}
                </p>
              ) : null;
            })()}
            {(() => {
              const phase = getTaperingFactor();
              const daysUntil = taperingDaysUntilMatch();
              if (!phase || phase === "normal") return null;
              const info = TAPERING_INFO[phase];
              if (!info.label) return null;
              return (
                <div style={{ marginTop: 8, textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: info.color, background: `${info.color}18`, padding: "4px 10px", borderRadius: 99 }}>
                    {daysUntil === 0 ? info.label : `Partido en ${daysUntil} ${daysUntil === 1 ? "día" : "días"} — ${info.label}`}
                  </span>
                </div>
              );
            })()}
            {store.get("match_day", null) !== null && (
              <div style={{ textAlign: "center" }}>
                <button onClick={() => setShowMatchDebrief(true)} style={{ marginTop: 6, color: C.dim, fontSize: 12 }}>
                  📋 Registrar partido
                </button>
              </div>
            )}
            {showMatchDebrief && (
              <MatchDebriefScreen onSave={onSaveMatch} onClose={() => setShowMatchDebrief(false)} />
            )}
            {(() => {
              if (sessions.filter((s) => s.kind === "entreno").length < 10) return null;
              const daysSince = daysSinceLastCombine();
              if (daysSince !== null && daysSince < 28) return null;
              return (
                <div className="card" style={{ marginTop: 8, padding: "10px 14px", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>🧪 Es hora de tu Combine mensual</p>
                  <button className="btn-xl btn-physics" onClick={() => setShowCombine(true)} style={{ marginTop: 8, minHeight: 44, background: C.cyan, color: "#07070C", fontSize: 13 }}>
                    Hacer tests ahora
                  </button>
                </div>
              );
            })()}
            {showCombine && <CombineScreen onClose={() => setShowCombine(false)} />}
            {(() => {
              const zones = persistentPainZones();
              if (!zones.length) return null;
              return (
                <div className="card" style={{ marginTop: 8, padding: "10px 14px", borderColor: `${C.yellow}55` }}>
                  <p style={{ fontSize: 12, color: C.yellow, fontWeight: 700 }}>⚠️ Dolor persistente en {zones.join(", ")}. Considera descanso o evaluación médica.</p>
                </div>
              );
            })()}
            {!pro && (() => {
              const status = getRecoveryStatus();
              if (!status.groups.length) return null;
              const color = status.level === "green" ? C.green : status.level === "cyan" ? C.cyan : status.level === "yellow" ? C.yellow : C.red;
              return (
                <button
                  onClick={() => setShowRecovery((v) => !v)}
                  className="card"
                  style={{ marginTop: 10, width: "100%", textAlign: "left", padding: "10px 14px", border: `1px solid ${color}55` }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{status.chipLabel}</span>
                  {showRecovery && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, fontWeight: 700 }}>
                          <span style={{ flex: 1 }}>GRUPO</span>
                          <span style={{ flex: 1, textAlign: "center" }}>ESTADO</span>
                          <span style={{ flex: 1, textAlign: "right" }}>TIEMPO</span>
                        </div>
                        {status.groups.map((g) => (
                          <div key={g.group} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ flex: 1, color: C.text, fontWeight: 600 }}>{g.group}</span>
                            <span
                              className={g.phase === "supercompensation" ? "supercomp-pulse" : ""}
                              style={{ flex: 1, textAlign: "center", fontWeight: 700, color: g.color }}
                            >
                              {g.phase === "supercompensation" ? "⚡ Pico ahora" : g.phase === "fatigue" ? "Recuperando" : g.phase === "recovery" ? "Recuperando" : "✓ Listo"}
                            </span>
                            <span style={{ flex: 1, textAlign: "right", color: C.mut }}>
                              {g.phase === "supercompensation" ? "Entrena hoy" : g.recovered ? "—" : `${g.hoursLeft}h más`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 10, color: C.dim, marginTop: 10, fontStyle: "italic" }}>
                        Estimación basada en la intensidad de tus sesiones recientes. Escucha siempre a tu cuerpo.
                      </p>
                    </div>
                  )}
                </button>
              );
            })()}
          </div>
        );
      })()}

      {/* Racha (o mensaje motivacional si se rompió) */}
      {showFreezeConfirm && (
        <div
          onClick={() => setShowFreezeConfirm(false)}
          style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" }}
        >
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 430, textAlign: "center", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))", borderRadius: "20px 20px 0 0", animation: "sheetUp 0.3s ease-out" }}>
            <p style={{ fontSize: 16, fontWeight: 800 }}>¿Usar freeze hoy?</p>
            <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>Te queda{freezesLeft === 1 ? "" : "n"} {freezesLeft} este mes.</p>
            <button className="btn-xl" onClick={() => { onFreeze(); setShowFreezeConfirm(false); }} style={{ marginTop: 16, minHeight: 56, background: C.cyan, color: "#07070C" }}>
              Sí, proteger hoy
            </button>
            <button onClick={() => setShowFreezeConfirm(false)} style={{ marginTop: 12, minHeight: 44, color: C.mut, fontSize: 13, fontWeight: 700 }}>
              No, entrenaré
            </button>
          </div>
        </div>
      )}
      {pro ? (
        <div className="card" style={{ marginTop: 12, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.mut, fontWeight: 700 }}>Racha</span>
          <span className={streakBounce ? "number-bounce" : ""} style={{ fontSize: 18, fontWeight: 800 }}>{streak} {streak === 1 ? "día" : "días"}</span>
        </div>
      ) : broken ? (
        <div className="card fade-up" style={{ marginTop: 12, textAlign: "center", padding: "20px 16px", border: `1px solid ${C.cyan}33` }}>
          <div style={{ fontSize: 34 }}>🌅</div>
          <p style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>Nuevo comienzo</p>
          <p style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>
            Tu mejor racha fue {broken.lost} {broken.lost === 1 ? "día" : "días"}.<br />Hoy empieza la siguiente.
          </p>
          <button
            className="btn-xl btn-physics"
            onClick={onTrain}
            style={{ marginTop: 14, background: C.cyan, color: "#07070C" }}
          >
            Entrenar ahora →
          </button>
          {canFreeze && (
            <button
              onClick={() => setShowFreezeConfirm(true)}
              style={{ marginTop: 10, fontSize: 12, color: C.cyan, fontWeight: 700 }}
            >
              ❄️ {freezesLeft} disponibles
            </button>
          )}
        </div>
      ) : null}

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <StatBox label="Esta semana" value={week} accent={C.cyan} />
        <StatBox
          label="Este mes"
          value={sessions.filter((s) => {
            const d = new Date(s.ts);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && s.kind === "entreno";
          }).length}
          accent={C.purple}
        />
        <StatBox label="Total" value={sessions.filter((s) => s.kind === "entreno").length} accent={C.green} />
      </div>

      {(() => {
        const history = store.get("jump_history", []);
        const todayJump = history.find((j) => dayKey(j.date) === todayKey());
        const baseline = jumpBaseline();
        if (!todayJump || !baseline) return null;
        if (todayJump.height >= baseline * 0.9) return null;
        return (
          <div className="card" style={{ marginTop: 12, padding: "10px 14px", borderColor: `${C.orange}55` }}>
            <p style={{ fontSize: 12, color: C.orange, fontWeight: 700 }}>📉 Salto bajo tu promedio — posible fatiga neuromuscular. Evita sprints máximos hoy.</p>
          </div>
        );
      })()}
      <MuscleRecoveryCard sessions={sessions} />
      <PlanPeriodizationCard sessions={sessions} />
      <DeloadBanner sessions={sessions} />

      {/* Insight del día */}
      <div className="card" style={{ marginTop: 12, padding: "13px 14px" }}>
        <p style={{ fontSize: 13, color: C.mut, lineHeight: 1.4 }}>💡 {insight}</p>
      </div>

      <Heatmap sessions={sessions} color={C.cyan} activeProgram={getActiveProgram()} />

      {/* Historial reciente */}
      <div className="sec-title">Últimas sesiones</div>
      {recent.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<EmptyHistoryIllustration />}
            title={`${name}, tu historia empieza aquí`}
            subtitle="Cada sesión que completes aparecerá aquí con todos sus detalles."
          />
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
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
                    {isBody ? `Cuerpo · ${sec?.name || ""}` : disc?.label}
                    {s.note && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: C.mut }}>
                    {isBody ? "Acondicionamiento" : `${s.focusLabel} · ${LEVELS[s.levelIdx].emoji} ${LEVELS[s.levelIdx].name}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: C.dim }}>{timeAgo(s.ts)}</span>
              </div>
              {menuId === s.id && (
                <div className="card pop" style={{ position: "absolute", top: "100%", right: 8, zIndex: 30, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => { setDetailSession(s); setMenuId(null); }} style={{ fontSize: 12, padding: "6px 10px", textAlign: "left" }}>Ver detalles</button>
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
      {sessions.length > 0 && (
        <button onClick={() => setShowFullHistory(true)} style={{ marginTop: 10, color: C.cyan, fontSize: 12, fontWeight: 700, width: "100%", textAlign: "center", padding: "6px 0" }}>
          Ver todo el historial →
        </button>
      )}

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
  { id: "basquetbol", ...BASQUET_META },
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
        onClick={() => onSave({ id: initial?.id || `custom-${Date.now()}`, name: sanitize(name), exercises: items })}
        style={{ marginTop: 16, background: C.cyan, color: "#07070C" }}
      >
        💾 GUARDAR RUTINA
      </button>
    </div>
  );
}

/* ─── Modo especial: Heavy Duty (Mike Mentzer) ─── */
const HEAVY_DUTY_EXERCISES = {
  Pecho: [
    { name: "Press banca con barra", warmup: "50% × 12" },
    { name: "Aperturas con mancuernas" },
    { name: "Fondos en paralelas" },
  ],
  Espalda: [
    { name: "Dominadas", warmup: "Asistidas si no puedes" },
    { name: "Remo con barra" },
    { name: "Pullover con mancuerna" },
  ],
  Piernas: [
    { name: "Sentadilla con barra", warmup: "50% × 12" },
    { name: "Prensa de piernas" },
    { name: "Curl femoral" },
  ],
  Hombros: [
    { name: "Press militar con barra", warmup: "50% × 12" },
    { name: "Elevaciones laterales" },
    { name: "Face pull" },
  ],
};

function intensityScore(sets) {
  return sets.reduce((score, set) => {
    if (set.reachedFailure) return score + 10;
    if (set.rpe >= 9) return score + 7;
    if (set.rpe >= 8) return score + 4;
    return score + 1;
  }, 0);
}

function HeavyDutyMode({ onFinish, onSave, lvlIdx }) {
  const [group, setGroup] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [exIdx, setExIdx] = useState(0);
  const [phase, setPhase] = useState("warmup"); // warmup | work | failure | rest | done
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [log, setLog] = useState([]);
  const [restLeft, setRestLeft] = useState(240);
  const [failMsg, setFailMsg] = useState(false);
  const restRef = useRef(240);

  const canDo = true; // el acceso ya se filtra en la pantalla de selección de metodología
  const exercises = group ? HEAVY_DUTY_EXERCISES[group] : null;
  const ex = exercises?.[exIdx];

  useEffect(() => {
    if (phase !== "rest") return undefined;
    restRef.current = 240;
    const t = setInterval(() => {
      restRef.current -= 1;
      if (restRef.current <= 0) {
        clearInterval(t);
        tripleBeep();
        setPhase("warmup");
        setExIdx((i) => i + 1);
        setWeight(""); setReps("");
      } else {
        setRestLeft(restRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const logFailure = (reachedFailure) => {
    setLog((prev) => [...prev, { name: ex.name, weight: parseFloat(weight) || 0, reps: parseInt(reps, 10) || 0, reachedFailure }]);
    if (!reachedFailure) {
      setFailMsg(true);
      setTimeout(() => {
        setFailMsg(false);
        if (exIdx + 1 >= exercises.length) setPhase("done");
        else { setRestLeft(240); setPhase("rest"); }
      }, 2000);
      return;
    }
    if (exIdx + 1 >= exercises.length) setPhase("done");
    else { setRestLeft(240); setPhase("rest"); }
  };

  const finish = () => {
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "gimnasio", methodology: "heavy_duty",
      focusLabel: group, levelIdx: lvlIdx,
      exercises: log.map((l) => ({ name: l.name, sets: [{ weight: l.weight, reps: l.reps, ok: l.reachedFailure, rpe: l.reachedFailure ? 10 : 7 }] })),
    });
    store.set("hd_recovery", { group, ts: Date.now() });
    onFinish();
  };

  if (!group) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 12 }}>💀</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Heavy Duty</h2>
        <p className="muted" style={{ marginTop: 4 }}>Alta intensidad, poco volumen. 1-2 series por ejercicio al fallo absoluto. Método de Mike Mentzer. Para avanzados.</p>
        {!canDo ? (
          <div className="card" style={{ marginTop: 16, opacity: 0.6 }}>
            <p style={{ fontSize: 12, color: C.mut }}>Disponible desde nivel Campeón</p>
          </div>
        ) : !accepted ? (
          <div className="card" style={{ marginTop: 16, borderColor: `${C.red}66`, background: "rgba(255,59,92,0.06)" }}>
            <p style={{ fontSize: 12, color: C.red, fontWeight: 700, lineHeight: 1.5 }}>
              ⚠️ Heavy Duty es extremadamente intenso. No hagas más de 2 sesiones por semana del mismo grupo muscular. Si tienes lesiones, consulta un profesional.
            </p>
            <button className="btn-xl" onClick={() => setAccepted(true)} style={{ marginTop: 12, background: C.red, color: "#fff" }}>Entiendo, continuar</button>
          </div>
        ) : (
          <div className="chip-wrap" style={{ marginTop: 16, justifyContent: "center" }}>
            {Object.keys(HEAVY_DUTY_EXERCISES).map((g) => (
              <button key={g} className="chip" onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "rest") {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>DESCANSO ENTRE EJERCICIOS</p>
        <div style={{ fontSize: 52, fontWeight: 900, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
          {String(Math.floor(restLeft / 60)).padStart(2, "0")}:{String(restLeft % 60).padStart(2, "0")}
        </div>
        <button className="btn-xl" onClick={() => { setPhase("warmup"); setExIdx((i) => i + 1); setWeight(""); setReps(""); }} style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, color: C.mut }}>
          Saltar descanso
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const score = intensityScore(log);
    const failures = log.filter((l) => l.reachedFailure).length;
    const hours = getRecoveryTime(group, "heavy_duty");
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <div className="pop" style={{ fontSize: 56 }}>💀</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>Heavy Duty completado</h2>
        <div style={{ fontSize: 42, fontWeight: 900, color: score >= 7 ? C.green : C.orange, marginTop: 10 }}>{score}/10</div>
        <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Intensidad Heavy Duty · Series al fallo: {failures} de {log.length}</p>
        {score < 7 && (
          <div className="card" style={{ marginTop: 12, borderColor: `${C.orange}55` }}>
            <p style={{ fontSize: 12, color: C.orange }}>Para Heavy Duty necesitas llegar al límite. La próxima sesión sube el peso.</p>
          </div>
        )}
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: C.mut }}>Próxima sesión de {group}: en {hours}h mínimo</p>
        </div>
        <button className="btn-xl" onClick={finish} style={{ marginTop: 16, background: C.red, color: "#fff" }}>Guardar y volver</button>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>{group.toUpperCase()} · Ejercicio {exIdx + 1} de {exercises.length}</p>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{ex.name}</h2>
      {phase === "warmup" ? (
        <>
          <p style={{ fontSize: 13, color: C.mut, marginTop: 8 }}>Serie de calentamiento{ex.warmup ? `: ${ex.warmup}` : ""}</p>
          <button className="btn-xl" onClick={() => setPhase("work")} style={{ marginTop: 20, background: C.red, color: "#fff" }}>
            Listo, ir a la serie de trabajo
          </button>
        </>
      ) : phase === "work" ? (
        <>
          <p style={{ fontSize: 13, color: C.red, fontWeight: 800, marginTop: 8 }}>SERIE DE TRABAJO — AL FALLO TOTAL</p>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: C.mut }}>PESO (KG)</label>
              <input className="input" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: C.mut }}>REPS AL FALLO</label>
              <input className="input" type="number" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
          </div>
          <button className="btn-xl" onClick={() => setPhase("failure")} style={{ marginTop: 16, background: C.red, color: "#fff" }}>
            Terminé la serie
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, fontWeight: 800, marginTop: 12 }}>¿Llegaste al fallo?</p>
          {failMsg ? (
            <p style={{ fontSize: 12, color: C.orange, marginTop: 12, fontWeight: 700 }}>Heavy Duty requiere llegar al límite. Prueba más peso.</p>
          ) : (
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-xl" onClick={() => logFailure(true)} style={{ background: C.green, color: "#07070C" }}>Sí</button>
              <button className="btn-xl" onClick={() => logFailure(false)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.mut }}>No</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Modo especial: GVT — German Volume Training (10×10) ─── */
const GVT_EXERCISES = ["Sentadilla con barra", "Press banca con barra", "Peso muerto convencional", "Remo con barra", "Press militar con barra", "Dominadas"];

function estimate1RM(weight, reps) {
  return weight * (1 + reps / 30);
}

function GvtMode({ onFinish, onSave, sessions }) {
  const [exName, setExName] = useState(null);
  const [weight, setWeight] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [setNum, setSetNum] = useState(0);
  const [reps, setReps] = useState([]);
  const [phase, setPhase] = useState("rest"); // rest | work | done
  const [restLeft, setRestLeft] = useState(60);
  const restRef = useRef(60);

  const chooseExercise = (name) => {
    const records = computeRecords(sessions);
    const rec = records.find((r) => r.name === name);
    if (rec && rec.weight > 0) {
      setWeight(Math.round(estimate1RM(rec.weight, rec.reps) * 0.6 * 4) / 4);
      setExName(name);
    } else {
      setExName(name);
    }
  };

  const confirmManualWeight = () => {
    setWeight(Math.round((parseFloat(manualWeight) || 0) * 4) / 4);
  };

  useEffect(() => {
    if (phase !== "rest" || setNum === 0) return undefined;
    restRef.current = 60;
    const t = setInterval(() => {
      restRef.current -= 1;
      if (restRef.current <= 0) {
        clearInterval(t);
        tripleBeep();
        setPhase("work");
      } else {
        setRestLeft(restRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNum]);

  const logSet = (repsDone) => {
    const next = [...reps, repsDone];
    setReps(next);
    if (next.length >= 10) {
      setPhase("done");
      const allTen = next.every((r) => r >= 10);
      const progress = store.get("gvt_progress", {});
      // eslint-disable-next-line react-hooks/purity -- Date.now() en un handler de clic (evento de usuario), no en render
      const finishedAt = Date.now();
      progress[exName] = { weight: allTen ? weight + 2.5 : weight, ts: finishedAt };
      store.set("gvt_progress", progress);
      onSave({
        id: finishedAt, ts: finishedAt, kind: "entreno", disc: "gimnasio", methodology: "gvt",
        focusLabel: exName, levelIdx: 1,
        exercises: [{ name: exName, sets: next.map((r) => ({ weight, reps: r, ok: r > 0 })) }],
      });
    } else {
      setRestLeft(60);
      setSetNum((n) => n + 1);
      setPhase("rest");
    }
  };

  if (!exName) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 12 }}>🔟</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>GVT — 10×10</h2>
        <p className="muted" style={{ marginTop: 4 }}>10 series de 10 repeticiones del mismo ejercicio. El método alemán para ganar masa muscular rápido. Usa el 60% de tu máximo.</p>
        <div className="chip-wrap" style={{ marginTop: 16, justifyContent: "center" }}>
          {GVT_EXERCISES.map((e) => (
            <button key={e} className="chip" onClick={() => chooseExercise(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  }

  if (!weight) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{exName}</h2>
        <p className="muted" style={{ marginTop: 6 }}>No tenemos tu 1RM. Ingresa tu peso de trabajo habitual:</p>
        <input className="input" type="number" value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} style={{ marginTop: 12 }} />
        <button className="btn-xl" onClick={confirmManualWeight} disabled={!manualWeight} style={{ marginTop: 12, background: C.cyan, color: "#07070C" }}>Confirmar</button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 56 }}>💪</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>100 REPS COMPLETADAS</h2>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>{exName} · {weight}kg</p>
        <button className="btn-xl" onClick={onFinish} style={{ marginTop: 20, background: C.cyan, color: "#07070C" }}>VOLVER</button>
      </div>
    );
  }

  const totalReps = reps.reduce((a, b) => a + b, 0);

  if (phase === "rest" && setNum > 0) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>DESCANSO — 60s exactos</p>
        <div style={{ fontSize: 52, fontWeight: 900, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{restLeft}s</div>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>{exName} · {weight}kg</h2>
      <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Serie {setNum + 1} de 10</p>
      <div style={{ fontSize: 13, color: C.cyan, fontWeight: 700, marginTop: 8 }}>Completadas: {totalReps} reps / 100 objetivo</div>
      <div style={{ height: 8, background: C.surface, borderRadius: 99, overflow: "hidden", marginTop: 8, border: `1px solid ${C.border}` }}>
        <div style={{ height: "100%", width: `${totalReps}%`, background: C.cyan, transition: "width .3s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center" }}>
        {[6, 8, 10].map((r) => (
          <button key={r} className="btn-xl" onClick={() => logSet(r)} style={{ background: r === 10 ? C.cyan : C.surface, color: r === 10 ? "#07070C" : C.text, border: r === 10 ? "none" : `1px solid ${C.border}` }}>
            {r} reps
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Modo especial: Century Set (100 reps) ─── */
function CenturySetMode({ onFinish, onSave, sessions }) {
  const [exName, setExName] = useState(null);
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const secRef = useRef(0);

  const weight = useMemo(() => {
    if (!exName) return 0;
    const rec = computeRecords(sessions).find((r) => r.name === exName);
    return rec && rec.weight > 0 ? Math.round(rec.weight * 0.3 * 4) / 4 : 0;
  }, [exName, sessions]);

  const records = store.get("century_records", {});
  const bestTime = exName && records[exName] ? records[exName] : null;

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => { secRef.current += 1; setSecs(secRef.current); }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const addReps = (n) => {
    const next = Math.min(100, total + n);
    setTotal(next);
    if (next >= 100) {
      setRunning(false);
      setDone(true);
      const time = secRef.current;
      const prevBest = records[exName];
      if (!prevBest || time < prevBest) {
        records[exName] = time;
        store.set("century_records", records);
      }
      // eslint-disable-next-line react-hooks/purity -- Date.now() en un handler de clic (evento de usuario), no en render
      const finishedAt = Date.now();
      onSave({
        id: finishedAt, ts: finishedAt, kind: "entreno", disc: "calistenia",
        focusLabel: `Century Set — ${exName}`, levelIdx: 2,
        exercises: [{ name: exName, sets: [{ weight, reps: 100, ok: true }] }],
      });
    }
  };

  if (!exName) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 12 }}>💯</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Century Set</h2>
        <p className="muted" style={{ marginTop: 4 }}>100 repeticiones de un ejercicio en el menor tiempo posible. Rompe mesetas y mejora la resistencia muscular. Peso: 30-40% del máximo.</p>
        <div className="chip-wrap" style={{ marginTop: 16, justifyContent: "center" }}>
          {["Flexiones", "Sentadilla con barra", "Dominadas", "Fondos en paralelas", "Burpees"].map((e) => (
            <button key={e} className="chip" onClick={() => setExName(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 56 }}>💯</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>100 completadas</h2>
        <div style={{ fontSize: 36, fontWeight: 900, color: C.green, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
          {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
        </div>
        <button className="btn-xl" onClick={onFinish} style={{ marginTop: 20, background: C.green, color: "#07070C" }}>VOLVER</button>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>{exName}{weight > 0 ? ` · ${weight}kg` : ""}</h2>
      {bestTime && (
        <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>
          Tu mejor tiempo en 100 {exName.toLowerCase()}: {String(Math.floor(bestTime / 60)).padStart(2, "0")}:{String(bestTime % 60).padStart(2, "0")}
        </p>
      )}
      <div style={{ fontSize: 14, color: C.mut, fontWeight: 700, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
        {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
      </div>
      <div style={{ fontSize: 52, fontWeight: 900, color: C.green, marginTop: 8 }}>{total}/100</div>
      {!running ? (
        <button className="btn-xl" onClick={() => setRunning(true)} style={{ marginTop: 16, background: C.green, color: "#07070C" }}>▶ INICIAR</button>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {[5, 10, 15, 20].map((n) => (
            <button key={n} className="btn-xl" onClick={() => addReps(n)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, minWidth: 70 }}>+{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Modo especial: Wendler 5/3/1 ─── */
const WENDLER_EXERCISES = ["Sentadilla", "Press banca", "Peso muerto", "Press militar"];
const WENDLER_WEEK_SCHEMES = {
  1: { label: "Volumen", sets: [{ pct: 0.65, reps: "5" }, { pct: 0.75, reps: "5" }, { pct: 0.85, reps: "5+", amrap: true }] },
  2: { label: "Intensidad", sets: [{ pct: 0.70, reps: "3" }, { pct: 0.80, reps: "3" }, { pct: 0.90, reps: "3+", amrap: true }] },
  3: { label: "Peak", sets: [{ pct: 0.75, reps: "5" }, { pct: 0.85, reps: "3" }, { pct: 0.95, reps: "1+", amrap: true }] },
  4: { label: "Deload", sets: [{ pct: 0.40, reps: "5" }, { pct: 0.50, reps: "5" }, { pct: 0.60, reps: "5" }] },
};
const wendlerRound = (x) => Math.round(x / 2.5) * 2.5;

function WendlerMode({ onFinish, onSave }) {
  const [exercise, setExercise] = useState(null);
  const [setIdx, setSetIdx] = useState(0);
  const [amrapReps, setAmrapReps] = useState("");
  const [done, setDone] = useState(false);
  const oneRM = store.get("1rm", {});

  if (!exercise) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 12 }}>🏆</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Wendler 5/3/1</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          El programa de fuerza más probado del mundo. 4 semanas de ciclos con porcentajes exactos. Para los 4 básicos.
        </p>
        <div className="chip-wrap" style={{ marginTop: 16, justifyContent: "center" }}>
          {WENDLER_EXERCISES.map((e) => {
            const hasRM = !!oneRM[e]?.rm;
            return (
              <button key={e} className="chip" onClick={() => hasRM && setExercise(e)} style={{ opacity: hasRM ? 1 : 0.4 }}>
                {e}{!hasRM && " 🔒"}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: C.dim, marginTop: 14 }}>
          Necesitas guardar tu 1RM de cada ejercicio primero en Progreso → Mi fuerza.
        </p>
      </div>
    );
  }

  const wendlerData = store.get("wendler", {});
  const state = wendlerData[exercise] || { trainingMax: wendlerRound(oneRM[exercise].rm * 0.9), currentWeek: 1, currentCycle: 1 };
  const scheme = WENDLER_WEEK_SCHEMES[state.currentWeek];
  const set = scheme.sets[setIdx];
  const setWeight = wendlerRound(state.trainingMax * set.pct);

  const finishSession = () => {
    const next = { ...state };
    if (state.currentWeek >= 4) {
      next.currentWeek = 1;
      next.currentCycle = state.currentCycle + 1;
      next.trainingMax = state.trainingMax + (exercise === "Sentadilla" || exercise === "Peso muerto" ? 5 : 2.5);
    } else {
      next.currentWeek = state.currentWeek + 1;
    }
    const allData = { ...wendlerData, [exercise]: next };
    store.set("wendler", allData);
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "gimnasio", methodology: "wendler",
      focusLabel: `Wendler 5/3/1 — ${exercise}`, levelIdx: 3,
      exercises: [{
        name: exercise,
        sets: scheme.sets.map((s, i) => ({
          weight: wendlerRound(state.trainingMax * s.pct),
          reps: i === scheme.sets.length - 1 && s.amrap ? parseInt(amrapReps, 10) || 0 : parseInt(s.reps, 10) || 0,
          ok: true,
        })),
      }],
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 56 }}>🏆</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>Sesión Wendler guardada</h2>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>
          {state.currentWeek >= 4 ? `Ciclo completado. Nuevo Training Max calculado para ${exercise}.` : `Próxima: Semana ${state.currentWeek + 1}.`}
        </p>
        <button className="btn-xl" onClick={onFinish} style={{ marginTop: 20, background: C.cyan, color: "#07070C" }}>VOLVER</button>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>
        Wendler 5/3/1 — Ciclo {state.currentCycle}, Semana {state.currentWeek} ({scheme.label})
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{exercise}</h2>
      <p style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Training Max: {state.trainingMax}kg</p>

      <div className="card" style={{ marginTop: 16, textAlign: "left" }}>
        {scheme.sets.map((s, i) => {
          const w = wendlerRound(state.trainingMax * s.pct);
          return (
            <div
              key={i}
              style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: i < scheme.sets.length - 1 ? `1px solid ${C.border}` : "none",
                opacity: i === setIdx ? 1 : i < setIdx ? 0.5 : 0.7,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: i === setIdx ? 800 : 600 }}>Set {i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: i === setIdx ? C.cyan : C.text }}>
                {w}kg × {s.reps}{s.amrap ? " ← máximo posible" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {set.amrap ? (
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>REPS LOGRADAS EN {setWeight}KG</label>
          <input className="input" type="number" value={amrapReps} onChange={(e) => setAmrapReps(e.target.value)} style={{ marginTop: 6 }} />
          <button className="btn-xl" onClick={finishSession} disabled={!amrapReps} style={{ marginTop: 12, background: C.cyan, color: "#07070C" }}>
            ✓ Terminar sesión Wendler
          </button>
        </div>
      ) : (
        <button className="btn-xl" onClick={() => setSetIdx((i) => i + 1)} style={{ marginTop: 16, background: C.cyan, color: "#07070C" }}>
          ✓ Completé el set {setIdx + 1}
        </button>
      )}
    </div>
  );
}

const AMRAP_WEIGHTED_EXERCISES = ["Dominadas", "Flexiones", "Fondos en paralelas", "Sentadilla con barra", "Burpees"];

/* ─── Modo especial: AMRAP (As Many Rounds As Possible) ─── */
function AmrapMode({ onFinish, onSave }) {
  const [mode, setMode] = useState(null); // "circuit" | "weighted"
  const [weightedEx, setWeightedEx] = useState(null);
  const [weightedLoad, setWeightedLoad] = useState("");
  const [duration, setDuration] = useState(null);
  const [circuit, setCircuit] = useState(null);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [done, setDone] = useState(false);
  const secRef = useRef(0);

  const chooseDuration = (min) => {
    setDuration(min);
    if (mode === "weighted") {
      secRef.current = min * 60;
      setSecondsLeft(min * 60);
      return;
    }
    const c = genRoutine("calistenia", "todo", 2, routineSeed("calistenia", "todo"), { noBar: true }).slice(0, 5);
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
    const recordKey = mode === "weighted" ? `${weightedEx}_${duration}` : duration;
    const records = store.get("amrap_records", {});
    const prevBest = records[recordKey] || 0;
    const isRecord = rounds > prevBest;
    if (isRecord) {
      records[recordKey] = rounds;
      store.set("amrap_records", records);
    }
    const label = mode === "weighted" ? `AMRAP ${weightedEx} ${duration} min` : `AMRAP ${duration} min`;
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "especial",
      focusLabel: label, levelIdx: 2,
      exercises: [{ name: mode === "weighted" ? weightedEx : label, sets: [{ weight: parseFloat(weightedLoad) || 0, reps: rounds, ok: true }] }],
    });
    onFinish();
  };

  if (!mode) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 16 }}>⏱</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>AMRAP</h2>
        <p className="muted" style={{ marginTop: 4 }}>Tantas rondas o repeticiones como puedas en el tiempo elegido</p>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="card" onClick={() => setMode("circuit")} style={{ flex: 1, padding: "16px 8px" }}>
            <div style={{ fontSize: 22 }}>🔄</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>Circuito</div>
          </button>
          <button className="card" onClick={() => setMode("weighted")} style={{ flex: 1, padding: "16px 8px" }}>
            <div style={{ fontSize: 22 }}>🏋️</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>Un ejercicio</div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "weighted" && !weightedEx) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={() => setMode(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ AMRAP</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>¿Qué ejercicio?</h2>
        <div className="chip-wrap" style={{ marginTop: 16, justifyContent: "center" }}>
          {AMRAP_WEIGHTED_EXERCISES.map((e) => (
            <button key={e} className="chip" onClick={() => setWeightedEx(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "weighted" && weightedEx && !duration) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{weightedEx}</h2>
        <p className="muted" style={{ marginTop: 4 }}>¿Con peso adicional? (opcional, en kg)</p>
        <input className="input" type="number" value={weightedLoad} onChange={(e) => setWeightedLoad(e.target.value)} style={{ marginTop: 10 }} />
        <p style={{ fontSize: 12, color: C.mut, marginTop: 16 }}>¿Cuántas {weightedEx.toLowerCase()} puedes hacer en...?</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[3, 5, 10, 15].map((m) => (
            <button key={m} className="card" onClick={() => chooseDuration(m)} style={{ flex: 1, padding: "16px 4px" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{m}</div>
              <div style={{ fontSize: 10, color: C.mut }}>min</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!duration) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={() => setMode(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ AMRAP</button>
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
    const recordKey = mode === "weighted" ? `${weightedEx}_${duration}` : duration;
    const records = store.get("amrap_records", {});
    const prevBest = records[recordKey] || 0;
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 60 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>¡Tiempo!</h2>
        <div style={{ fontSize: 42, fontWeight: 900, color: C.green, marginTop: 10 }}>
          {rounds} {mode === "weighted" ? weightedEx.toLowerCase() : "rondas"}
        </div>
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
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>
        {mode === "weighted" ? `${weightedEx} · ` : ""}AMRAP · {duration} min
      </p>
      <div style={{ fontSize: 56, fontWeight: 900, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
        {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
      </div>
      {mode === "circuit" && (
        <div className="card" style={{ marginTop: 16, textAlign: "left" }}>
          <p style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>CIRCUITO</p>
          {circuit.map((e, i) => (
            <p key={i} style={{ fontSize: 12, marginTop: 4 }}>{i + 1}. {e.name} — {e.reps}</p>
          ))}
        </div>
      )}
      <div style={{ fontSize: 40, fontWeight: 900, color: C.cyan, marginTop: 20 }}>{rounds}</div>
      <p style={{ fontSize: 11, color: C.dim }}>{mode === "weighted" ? `${weightedEx.toLowerCase()} completadas` : "rondas completadas"}</p>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button className="btn-xl" onClick={() => setRounds((r) => Math.max(0, r - 1))} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>−</button>
        <button className="btn-xl" onClick={() => setRounds((r) => r + 1)} style={{ background: C.cyan, color: "#07070C" }}>
          {mode === "weighted" ? "+1" : "+1 RONDA"}
        </button>
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
    const ex = genRoutine("calistenia", "todo", 1, routineSeed("calistenia", "todo"), { noBar: true }).slice(0, 2);
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
          speak("Descansa", { rate: 0.9, pitch: 0.8 });
          if (navigator.vibrate) navigator.vibrate(100);
          setPhase("rest");
          secRef.current = cfg.rest;
          setSecLeft(cfg.rest);
        } else {
          speak("¡Trabaja!", { rate: 1.2, pitch: 1.3 });
          if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
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
    if (cfg.isRSA) {
      onSave({
        id: Date.now(), ts: Date.now(), kind: "entreno", disc: "atletismo", type: "RSA",
        focusLabel: `RSA ${cfg.work}s/${cfg.rest}s×${cfg.rounds}`, levelIdx: 2,
        totalIntervals: cfg.rounds, workTime: cfg.work, restTime: cfg.rest,
        durationMin: Math.round((cfg.work + cfg.rest) * cfg.rounds / 60),
        exercises: [{ name: "RSA — Sprint repetido", sets: [{ weight: 0, reps: cfg.rounds, ok: true }] }],
      });
    } else {
      onSave({
        id: Date.now(), ts: Date.now(), kind: "entreno", disc: "especial",
        focusLabel: `Intervalos ${cfg.work}/${cfg.rest}×${cfg.rounds}`, levelIdx: 2,
        exercises: [{ name: "Intervalos", sets: [{ weight: 0, reps: cfg.rounds, ok: true }] }],
      });
    }
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
          onClick={() => start({ work: 10, rest: 30, rounds: 8, isRSA: true })}
          style={{ marginTop: 20, background: C.cyan, color: "#07070C" }}
        >
          ⚡ RSA — SPRINT REPETIDO (10s/30s×8)
        </button>
        <button
          className="btn-xl"
          onClick={() => start({ work: 20, rest: 10, rounds: 8 })}
          style={{ marginTop: 10, background: C.orange, color: "#07070C" }}
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
      type, target: t, exercise: type === "weight" || type === "distance" ? sanitize(exercise) : null,
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

/* ─── Modo viaje: circuitos fijos de 20 min, sin equipo ─── */
const TRAVEL_CIRCUITS = {
  low: {
    tierLabel: "Iniciado — Guerrero",
    rounds: 3,
    exercises: [
      { name: "Sentadilla sumo lenta", reps: 12 },
      { name: "Flexiones de rodilla o completas", reps: 10 },
      { name: "Plancha", seconds: 30 },
      { name: "Zancada estática (cada pierna)", reps: 10 },
      { name: "Superman en el suelo — extensión dorsal", reps: 12 },
    ],
  },
  mid: {
    tierLabel: "Campeón — Élite",
    rounds: 4,
    exercises: [
      { name: "Sentadilla con salto", reps: 10 },
      { name: "Flexiones explosivas", reps: 8 },
      { name: "Mountain climbers", seconds: 30 },
      { name: "Pistol squat asistido (cada pierna)", reps: 6 },
      { name: "Plancha con toque de hombro", reps: 20 },
      { name: "Burpees", reps: 6 },
    ],
  },
  high: {
    tierLabel: "Leyenda — THE ONE",
    rounds: 5,
    exercises: [
      { name: "Flexiones arqueras (cada lado)", reps: 6 },
      { name: "Sentadilla pistol completa (cada pierna)", reps: 5 },
      { name: "Plancha con extensión de brazo (cada lado)", reps: 10 },
      { name: "Burpee con salto máximo", reps: 8 },
      { name: "Abdominales V-up", reps: 12 },
      { name: "Superman con rotación (cada lado)", reps: 10 },
    ],
  },
};

function travelTierForLevel(lvlIdx) {
  if (lvlIdx <= 1) return "low";
  if (lvlIdx <= 3) return "mid";
  return "high";
}

/* ─── Modo partido: registro de acciones en tiempo real durante un partido de fútbol ─── */
const MATCH_ACTIONS = [
  { id: "sprint", label: "🏃 SPRINT", color: C.orange },
  { id: "tiro", label: "⚽ TIRO", color: C.green },
  { id: "regate", label: "🔄 REGATE", color: C.cyan },
  { id: "pase", label: "✈️ PASE LARGO", color: C.blue },
  { id: "tackle", label: "🛡️ TACKLE", color: C.red },
  { id: "salto", label: "↕️ SALTO", color: C.purple },
];

function MatchMode({ onFinish, onSave }) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [period, setPeriod] = useState(1);
  const [counts, setCounts] = useState({ sprint: 0, tiro: 0, regate: 0, pase: 0, tackle: 0, salto: 0 });
  const [finished, setFinished] = useState(false);
  const secRef = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => { secRef.current += 1; setSeconds(secRef.current); }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const tap = (id) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setCounts((prev) => ({ ...prev, [id]: prev[id] + 1 }));
  };

  const totalActions = Object.values(counts).reduce((a, b) => a + b, 0);
  const distanceKm = ((counts.sprint * 30 + (totalActions - counts.sprint) * 10) / 1000).toFixed(1);

  const finishMatch = () => {
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "futbolParque",
      focusLabel: "Partido", levelIdx: 2, durationMin: Math.round(seconds / 60),
      exercises: MATCH_ACTIONS.filter((a) => counts[a.id] > 0).map((a) => ({
        name: a.label.replace(/^\S+\s/, ""),
        sets: [{ weight: 0, reps: counts[a.id], ok: true }],
      })),
    });
    onFinish();
  };

  if (finished) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <div className="pop" style={{ fontSize: 50 }}>⚽</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>Resumen del partido</h2>
        <div className="card" style={{ marginTop: 16, textAlign: "left" }}>
          {MATCH_ACTIONS.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: 13 }}>{a.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{counts[a.id]}</span>
            </div>
          ))}
          <hr className="divider-gradient" style={{ margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Total acciones</span>
            <span style={{ fontSize: 13, fontWeight: 900 }}>{totalActions}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Distancia estimada</span>
            <span style={{ fontSize: 13, fontWeight: 900 }}>{distanceKm} km</span>
          </div>
        </div>
        <button className="btn-xl" onClick={finishMatch} style={{ marginTop: 16, background: C.green, color: "#07070C" }}>
          GUARDAR Y VOLVER
        </button>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 16 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>PERÍODO {period} · 45 MIN</p>
      <div style={{ fontSize: 40, fontWeight: 900, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        ⏱ {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {MATCH_ACTIONS.map((a) => (
          <button
            key={a.id} onClick={() => tap(a.id)}
            style={{ height: 80, borderRadius: 16, fontSize: 15, fontWeight: 900, color: "#07070C", background: a.color }}
          >
            {a.label}
            <div style={{ fontSize: 20 }}>{counts[a.id]}</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {!running ? (
          <button className="btn-xl" onClick={() => setRunning(true)} style={{ background: C.green, color: "#07070C" }}>▶ INICIAR</button>
        ) : (
          <button className="btn-xl" onClick={() => setRunning(false)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
            PAUSAR
          </button>
        )}
      </div>
      {period === 1 && seconds >= 45 * 60 && (
        <button
          className="btn-xl" onClick={() => { setPeriod(2); setRunning(false); }}
          style={{ marginTop: 10, background: C.orange, color: "#07070C" }}
        >
          Descanso — Empezar 2° tiempo
        </button>
      )}
      <button onClick={() => setFinished(true)} style={{ marginTop: 14, color: C.dim, fontSize: 12, fontWeight: 600 }}>Terminar partido</button>
    </div>
  );
}


function TravelMode({ onFinish, onSave }) {
  const [lvlIdx, setLvlIdx] = useState(null);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [roundsDone, setRoundsDone] = useState(0);
  const [offeredExtra, setOfferedExtra] = useState(false);
  const [done, setDone] = useState(false);
  const secRef = useRef(20 * 60);

  const tier = lvlIdx !== null ? TRAVEL_CIRCUITS[travelTierForLevel(lvlIdx)] : null;

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
    onSave({
      id: Date.now(), ts: Date.now(), kind: "entreno", disc: "viaje",
      focusLabel: "Modo viaje", levelIdx: lvlIdx,
      durationMin: Math.round((20 * 60 - secondsLeft) / 60),
      exercises: [{ name: `Modo viaje — ${tier.tierLabel}`, sets: [{ weight: 0, reps: roundsDone, ok: true }] }],
    });
    onFinish();
  };

  const completeRound = () => {
    const next = roundsDone + 1;
    setRoundsDone(next);
    if (next >= tier.rounds && !offeredExtra) {
      setOfferedExtra(true);
      setRunning(false);
    }
  };

  if (lvlIdx === null) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={onFinish} style={{ color: C.mut, fontSize: 12, fontWeight: 600, display: "block", textAlign: "left" }}>‹ Entrenar</button>
        <div style={{ fontSize: 40, marginTop: 12 }}>✈️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Modo viaje</h2>
        <p className="muted" style={{ marginTop: 6, padding: "0 12px", lineHeight: 1.5 }}>
          Sin equipo, en poco espacio, sin ruido 🤫<br />Rutinas de 20 minutos para cualquier lugar
        </p>
        <div className="sec-title">Elige tu nivel</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LEVELS.map((l, i) => (
            <button key={l.name} className="card" onClick={() => setLvlIdx(i)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "12px 14px" }}>
              <span style={{ fontSize: 20 }}>{l.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: l.color }}>{l.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="pop" style={{ fontSize: 60 }}>✈️</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>¡Viaje completado!</h2>
        <div style={{ fontSize: 36, fontWeight: 900, color: C.green, marginTop: 10 }}>{roundsDone} rondas</div>
        <button className="btn-xl" onClick={finish} style={{ marginTop: 20, background: C.green, color: "#07070C" }}>VOLVER</button>
      </div>
    );
  }

  if (offeredExtra) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 40 }}>🎉</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>¡Terminaste antes de tiempo!</h2>
        <p className="muted" style={{ marginTop: 4 }}>¿Una ronda más?</p>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn-xl" onClick={() => setDone(true)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>Terminar</button>
          <button className="btn-xl" onClick={() => { setOfferedExtra(false); setRunning(true); }} style={{ background: C.green, color: "#07070C" }}>Una ronda más</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 16 }}>
      <p style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>MODO VIAJE · {tier.tierLabel}</p>
      <div style={{ fontSize: 48, fontWeight: 900, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
        {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
      </div>
      <div className="card" style={{ marginTop: 14, textAlign: "left" }}>
        <p style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>CIRCUITO · {tier.rounds} RONDAS</p>
        {tier.exercises.map((e, i) => (
          <p key={i} style={{ fontSize: 12, marginTop: 4 }}>{i + 1}. {e.name} — {e.seconds ? `${e.seconds}s` : `${e.reps} reps`}</p>
        ))}
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color: C.cyan, marginTop: 16 }}>{roundsDone} / {tier.rounds}</div>
      <p style={{ fontSize: 11, color: C.dim }}>rondas completadas</p>
      <button className="btn-xl" onClick={completeRound} style={{ marginTop: 10, background: C.cyan, color: "#07070C" }}>✓ RONDA COMPLETA</button>
      {!running ? (
        <button className="btn-xl" onClick={() => setRunning(true)} style={{ marginTop: 10, background: C.green, color: "#07070C" }}>▶ INICIAR TIEMPO</button>
      ) : (
        <button className="btn-xl" onClick={() => setDone(true)} style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
          TERMINAR AHORA
        </button>
      )}
    </div>
  );
}

function Train({ onStart, onAccent, totalSessions, noEquipment, onSaveSpecial, sessions = [], streak = 0, challenge, onSaveChallenge, onCompleteBody }) {
  const [showBody, setShowBody] = useState(false);
  const [discId, setDiscId] = useState(null); // null | "futbol" (pendiente) | "atletismo" | id concreto
  const [focusId, setFocusId] = useState("todo");
  const [lvlIdx, setLvlIdx] = useState(null);
  const [seed, setSeed] = useState(0);
  const [calLocation, setCalLocation] = useState(null);
  const [gymMethod, setGymMethod] = useState(null);
  const [gymTypeChosen, setGymTypeChosen] = useState(false);
  const [extraFocusIds, setExtraFocusIds] = useState([]);
  const [extraStepDone, setExtraStepDone] = useState(false);
  const [distance, setDistance] = useState(null);
  const [customRoutines, setCustomRoutines] = useState(() => store.get("custom_routines", []));
  const [trainCards] = useState(() => orderedTrainCards());
  const [showProgramsHint, dismissProgramsHint] = useFirstTime("programs");
  const [hdNotSeen, markHdSeen] = useFirstTime("hd_unlock");
  const hdSeen = !hdNotSeen;
  const [showHdUnlock, setShowHdUnlock] = useState(false);
  const [showTutorial] = useState(() => !store.get("tutorial_done", false));
  const [builderMode, setBuilderMode] = useState(null); // null | "new" | routine object para editar
  const [special, setSpecial] = useState(null); // null | "amrap" | "emom" | "intervalos" | "reto" | "viaje" | "biblioteca" | "partido"
  const activeProgram = getActiveProgram();
  const [trainMode, setTrainMode] = useState(() => (activeProgram ? "programa" : "musculo"));
  const lastSession = useMemo(() => [...sessions].reverse().find((s) => s.kind === "entreno"), [sessions]);
  const [weekChoice, setWeekChoice] = useState(null); // null | "solo" | "semana"
  const [weekSavedMsg, setWeekSavedMsg] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  /* La energía elegida se recuerda durante el día */
  const [energy, setEnergy] = useState(() => {
    const saved = store.get("energy", null);
    return saved && saved.day === todayKey() ? saved.value : null;
  });
  /* Modo de entrenamiento global (auto/programa/manual) — solo se pregunta la primera vez */
  const [trainStyle, setTrainStyle] = useState(() => store.get("train_mode", null));
  const [objectiveChoice, setObjectiveChoice] = useState(null);

  const GYM_LEVEL_IDS = ["iniciado", "guerrero", "campeon", "elite", "leyenda", "the_one"];
  const isCampeonPlusGym = ["campeon", "elite", "leyenda", "the_one"].includes(GYM_LEVEL_IDS[mostFrequentLevel(sessions)]);
  useEffect(() => {
    if (discId === "gimnasio" && gymTypeChosen && extraStepDone && !gymMethod && !isCampeonPlusGym) {
      const t = setTimeout(() => setGymMethod("standard"), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [discId, gymTypeChosen, extraStepDone, gymMethod, isCampeonPlusGym]);

  const isConcreteDisc = discId && discId !== "futbol" && discId !== "basquetbol" && discId !== "atletismo";
  const disc = isConcreteDisc ? DISCIPLINES[discId] : null;

  const focusLabelForDUP = isConcreteDisc ? DISCIPLINES[discId]?.focuses.find((f) => f.id === focusId)?.label : null;
  const dupType = useMemo(() => {
    if (discId !== "gimnasio") return null;
    if (gymMethod === "dup") return getDUPDay(sessions, focusLabelForDUP);
    /* DUP automático para Campeón+ sin metodología elegida aún, con 3+ sesiones del mismo enfoque */
    if (!gymMethod && isCampeonPlusGym) {
      const sameGroupCount = sessions.filter((s) => s.kind === "entreno" && s.disc === "gimnasio" && s.focusLabel === focusLabelForDUP).length;
      if (sameGroupCount >= 3) return getDUPDay(sessions, focusLabelForDUP);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discId, gymMethod, focusLabelForDUP, isCampeonPlusGym]);

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
    if (dupType && r.some((e) => e.type === "peso")) {
      const dup = DUP_SCHEMES[dupType];
      r = r.map((e) => (e.type !== "peso" ? e : { ...e, sets: dup.sets, reps: dup.reps, rest: dup.restMin + (dup.restMax - dup.restMin) / 2, dupType }));
    }
    if (discId === "gimnasio" && extraFocusIds.length > 0) {
      r = appendExtraMuscleExercises(r, extraFocusIds, effLvl);
    }
    return r;
  }, [isConcreteDisc, discId, focusId, lvlIdx, seed, energy, totalSessions, calLocation, noEquipment, dupType, extraFocusIds]);

  const atletRoutine = useMemo(() => {
    if (discId !== "atletismo" || !distance || lvlIdx === null) return null;
    const seedVal = Math.floor(totalSessions / 3) * 7919 + seed * 131 + lvlIdx * 17;
    return genAtletismoRoutine(distance, lvlIdx, seedVal);
  }, [discId, distance, lvlIdx, seed, totalSessions]);

  const startAndFinishTutorial = (planToStart) => {
    if (showTutorial) store.set("tutorial_done", true);
    onStart(planToStart);
  };

  if (showBody) {
    return (
      <div className="screen">
        <button onClick={() => setShowBody(false)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Entrenar</button>
        <Body onComplete={onCompleteBody} />
      </div>
    );
  }

  /* ── Modo de entrenamiento: preguntar una sola vez, o mostrar el flujo simplificado según lo elegido ── */
  if (trainStyle === null) {
    return (
      <div className="screen fade-up" style={{ paddingTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, textAlign: "center" }}>¿Cómo prefieres entrenar?</h2>
        <p className="muted" style={{ textAlign: "center", marginTop: 4 }}>Puedes cambiarlo cuando quieras en Configuración</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {TRAIN_MODES.map((m) => (
            <button
              key={m.id} className="card fade-up"
              onClick={() => { store.set("train_mode", m.id); setTrainStyle(m.id); }}
              style={{ textAlign: "left", padding: 16, borderLeft: `4px solid ${C.cyan}` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{m.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{m.name}</span>
              </div>
              <p style={{ fontSize: 12, color: C.mut, marginTop: 6 }}>{m.desc}</p>
              <p style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{m.detail}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if ((trainStyle === "auto" || trainStyle === "program") && !getActiveProgram() && !objectiveChoice) {
    return (
      <div className="screen fade-up" style={{ paddingTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, textAlign: "center" }}>¿Cuál es tu objetivo ahora mismo?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {OBJECTIVE_TO_PROGRAM.map((o) => (
            <button
              key={o.id} className="card" onClick={() => setObjectiveChoice(o)}
              style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "12px 14px" }}
            >
              <span style={{ fontSize: 22 }}>{o.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setTrainStyle("manual")} style={{ marginTop: 16, color: C.dim, fontSize: 12, fontWeight: 700, textAlign: "center", width: "100%" }}>
          Prefiero elegir yo mismo →
        </button>
      </div>
    );
  }

  if ((trainStyle === "auto" || trainStyle === "program") && !getActiveProgram() && objectiveChoice) {
    const rec = PROGRAMS.find((p) => p.id === objectiveChoice.programId);
    return (
      <div className="screen fade-up" style={{ paddingTop: 20 }}>
        <button onClick={() => setObjectiveChoice(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Atrás</button>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 40 }}>{rec.emoji}</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{rec.name}</h2>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 6, lineHeight: 1.5 }}>{rec.desc}</p>
          <p style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{rec.durationWeeks} semanas · {rec.daysPerWeek} días/semana</p>
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>¿Empezar este programa?</p>
        <button
          className="btn-xl" onClick={() => { startProgram(rec.id); setObjectiveChoice(null); }}
          style={{ marginTop: 10, background: rec.color, color: "#07070C" }}
        >
          Sí, empezar
        </button>
        <button
          className="btn-xl" onClick={() => setTrainStyle("__programs_screen")}
          style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.mut }}
        >
          Ver todos los programas
        </button>
      </div>
    );
  }

  if (trainStyle === "__programs_screen") {
    return (
      <div className="screen">
        <button onClick={() => { setTrainStyle("program"); setObjectiveChoice(null); }} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Atrás</button>
        <ProgramsScreen />
      </div>
    );
  }

  if (trainStyle === "auto" && getActiveProgram()) {
    const active = getActiveProgram();
    const candidate = programDailyCandidate(sessions);
    return (
      <div className="screen fade-up" style={{ paddingTop: 20 }}>
        <div className="card" style={{ padding: 16, borderLeft: `4px solid ${active.program.color}` }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: active.program.color }}>📅 {active.program.name} — Semana {active.week}</p>
          {candidate ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 900, marginTop: 8 }}>{candidate.reason.split(": ")[1] || candidate.reason}</p>
              <button
                className="btn-xl" onClick={() => { const p = buildPlanFor(candidate.discId, candidate.focusId, candidate.lvlIdx); if (p) startAndFinishTutorial(p); }}
                style={{ marginTop: 14, background: active.program.color, color: "#07070C", fontSize: 16 }}
              >
                ▶ EMPEZAR SESIÓN
              </button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: C.mut, marginTop: 8 }}>Hoy toca descanso 🧘</p>
          )}
        </div>
        <button onClick={() => setTrainStyle(null)} style={{ marginTop: 14, color: C.dim, fontSize: 12, fontWeight: 700 }}>Cambiar modo de entrenamiento</button>
      </div>
    );
  }

  if (trainStyle === "auto") {
    const dp = getDailyPlan(sessions).plan;
    const info = describeDailyPlan(dp);
    if (!energy) {
      return (
        <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>¿Cuánta energía tienes?</h2>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {ENERGY_OPTIONS.map((o) => (
              <button key={o.id} onClick={() => chooseEnergy(o.id)} className="card" style={{ flex: 1, padding: "18px 8px" }}>
                <div style={{ fontSize: 26 }}>{o.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{o.label}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="screen fade-up" style={{ paddingTop: 20 }}>
        <div className="card" style={{ padding: 16, borderLeft: `4px solid ${info.color}` }}>
          <p style={{ fontSize: 12, color: C.dim, fontWeight: 700 }}>HOY TE SUGERIMOS</p>
          <p style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{info.label}{info.focusLabel ? ` · ${info.focusLabel}` : ""}</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 6 }}>{dp.reason}</p>
          <button
            className="btn-xl" onClick={() => { const p = buildPlanFor(dp.discId, dp.focusId, dp.lvlIdx); if (p) startAndFinishTutorial(p); }}
            style={{ marginTop: 14, background: info.color, color: "#07070C", fontSize: 16 }}
          >
            ▶ EMPEZAR SESIÓN
          </button>
        </div>
        <button onClick={() => setTrainStyle(null)} style={{ marginTop: 14, color: C.dim, fontSize: 12, fontWeight: 700 }}>Cambiar modo de entrenamiento</button>
      </div>
    );
  }

  if (trainStyle === "program") {
    const active = getActiveProgram();
    const candidate = active ? programDailyCandidate(sessions) : null;
    return (
      <div className="screen">
        {active && candidate && (
          <div className="card" style={{ marginTop: 4, padding: 14, borderLeft: `4px solid ${active.program.color}` }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: active.program.color }}>📅 {active.program.name} — Semana {active.week}</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{candidate.reason.split(": ")[1] || candidate.reason}</p>
            <button
              className="btn-xl" onClick={() => { const p = buildPlanFor(candidate.discId, candidate.focusId, candidate.lvlIdx); if (p) startAndFinishTutorial(p); }}
              style={{ marginTop: 10, background: active.program.color, color: "#07070C", fontSize: 14 }}
            >
              ▶ EMPEZAR SESIÓN
            </button>
          </div>
        )}
        {active && !candidate && (
          <div className="card" style={{ marginTop: 4, padding: 14, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.mut }}>Hoy toca descanso 🧘 — Semana {active.week} de {active.program.name}</p>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <ProgramsScreen />
        </div>
        <button onClick={() => setTrainStyle(null)} style={{ marginTop: 14, color: C.dim, fontSize: 12, fontWeight: 700 }}>Cambiar modo de entrenamiento</button>
      </div>
    );
  }


  const chooseEnergy = (v) => {
    setEnergy(v);
    store.set("energy", { day: todayKey(), value: v });
  };

  const pickDisc = (id) => {
    /* Modo sin equipo: fútbol siempre en parque, básquet siempre sin cancha, calistenia siempre en casa */
    let finalId = id === "futbol" && noEquipment ? "futbolParque" : id;
    finalId = finalId === "basquetbol" && noEquipment ? "basquetSinCancha" : finalId;
    setDiscId(finalId);
    setFocusId("todo");
    setLvlIdx(null);
    setCalLocation(finalId === "calistenia" && noEquipment ? "casa" : null);
    setDistance(null);
    setGymTypeChosen(false);
    setExtraFocusIds([]);
    setExtraStepDone(false);
    setGymMethod(null);
    setWeekChoice(null);
    if (finalId === "futbol") onAccent(C.orange);
    else if (finalId === "basquetbol") onAccent("#A855F7");
    else if (finalId === "atletismo") onAccent(C.purple);
    else onAccent(DISCIPLINES[finalId].color);
  };
  const backToDiscs = () => {
    setDiscId(null);
    setGymMethod(null);
    setGymTypeChosen(false);
    setExtraFocusIds([]);
    setExtraStepDone(false);
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
          showToast("Límite alcanzado. Elimina una rutina para crear otra.");
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
    setCustomRoutines((prev) => {
      const next = prev.filter((r) => r.id !== id);
      store.set("custom_routines", next);
      return next;
    });
    setDeleteTarget(null);
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
  if (special === "heavyduty") {
    return <HeavyDutyMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} lvlIdx={mostFrequentLevel(sessions)} />;
  }
  if (special === "gvt") return <GvtMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} sessions={sessions} />;
  if (special === "century") return <CenturySetMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} sessions={sessions} />;
  if (special === "wendler") return <WendlerMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "emom") return <EmomMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "intervalos") return <IntervalMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "viaje") return <TravelMode onFinish={() => setSpecial(null)} onSave={onSaveSpecial} />;
  if (special === "partido") {
    return <MatchMode onFinish={() => { setSpecial(null); setDiscId(null); }} onSave={onSaveSpecial} />;
  }
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
      <div className="screen" style={{ position: "relative" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Entrenar</h2>
        <p className="muted" style={{ marginTop: 2 }}>Elige tu disciplina de hoy</p>
        <FeatureTooltip visible={showProgramsHint} onDismiss={dismissProgramsHint} text="💡 Tenemos metodologías avanzadas aquí (Gimnasio → Estándar/DUP/Heavy Duty…)" />
        {showTutorial && (
          <div className="card" style={{ marginTop: 10, padding: "9px 12px", borderColor: `${C.cyan}66`, background: "rgba(0,229,255,0.08)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>👇 Elige tu disciplina</p>
          </div>
        )}

        {activeProgram ? (
          <button
            className="card fade-up"
            onClick={() => {
              const candidate = programDailyCandidate(sessions);
              if (!candidate) return;
              const p = buildPlanFor(candidate.discId, candidate.focusId, candidate.lvlIdx);
              if (p) onStart(p);
            }}
            style={{ marginTop: 12, width: "100%", textAlign: "left", padding: 14, borderLeft: `4px solid ${activeProgram.program.color}` }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: activeProgram.program.color }}>▶ Continuar: {activeProgram.program.name}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Semana {activeProgram.week} · Toca para iniciar la sesión de hoy</div>
          </button>
        ) : lastSession ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="card"
              onClick={() => { const p = planFromSession(lastSession); if (p) onStart(p); }}
              style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}
            >
              <div style={{ fontSize: 20 }}>🔄</div>
              <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>Repetir última</div>
            </button>
            {customRoutines.length > 0 && (
              <button className="card" onClick={() => setTrainMode("rutina")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
                <div style={{ fontSize: 20 }}>📋</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>Mi rutina guardada</div>
              </button>
            )}
          </div>
        ) : null}

        <div className="chip-wrap" style={{ marginTop: 14 }}>
          <button className={`chip ${trainMode === "musculo" ? "on" : ""}`} onClick={() => setTrainMode("musculo")}>💪 Entrenar por músculo</button>
          <button className={`chip ${trainMode === "programa" ? "on" : ""}`} onClick={() => setTrainMode("programa")}>📅 Programa semanal</button>
          <button className={`chip ${trainMode === "rutina" ? "on" : ""}`} onClick={() => setTrainMode("rutina")}>🔨 Crear mi rutina</button>
        </div>

        {trainMode === "musculo" && (
          <>
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
              <button
                className="card fade-up"
                onClick={() => setShowBody(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                  borderLeft: `4px solid ${C.blue}`, transition: "transform .15s ease",
                }}
              >
                <span style={{ fontSize: 30 }}>🧘</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Movilidad</div>
                  <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>Estiramientos y recuperación activa</div>
                </div>
                <span style={{ marginLeft: "auto", color: C.blue, fontSize: 20 }}>›</span>
              </button>
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
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="card" onClick={() => setSpecial("heavyduty")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
                <div style={{ fontSize: 22 }}>💀</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>Heavy Duty</div>
              </button>
              <button className="card" onClick={() => setSpecial("gvt")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
                <div style={{ fontSize: 22 }}>🔟</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>GVT 10×10</div>
              </button>
              <button className="card" onClick={() => setSpecial("century")} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
                <div style={{ fontSize: 22 }}>💯</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>Century</div>
              </button>
            </div>
            <button className="card" onClick={() => setSpecial("reto")} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, textAlign: "left", borderLeft: `4px solid ${C.yellow}` }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Reto Personal</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{challenge ? "Ver progreso de tu reto activo" : "Crea un desafío contra ti mismo"}</div>
              </div>
            </button>
            <button className="card" onClick={() => setSpecial("viaje")} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: `2px dashed ${C.border}` }}>
              <span style={{ fontSize: 24 }}>✈️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Modo viaje</div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Sin equipo, 20 min, para cualquier lugar</div>
              </div>
            </button>
          </>
        )}

        {trainMode === "programa" && (
          <>
            {activeProgram && (() => {
              const candidate = programDailyCandidate(sessions);
              if (!candidate) return null;
              return (
                <div className="card" style={{ marginTop: 14, padding: 14, borderColor: `${activeProgram.program.color}55` }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: activeProgram.program.color }}>Tu sesión de hoy según el programa</p>
                  <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>{candidate.reason}</p>
                  <button
                    className="btn-xl"
                    onClick={() => { const p = buildPlanFor(candidate.discId, candidate.focusId, candidate.lvlIdx); if (p) onStart(p); }}
                    style={{ marginTop: 10, background: activeProgram.program.color, color: "#07070C", fontSize: 14 }}
                  >
                    ▶ Empezar
                  </button>
                </div>
              );
            })()}
            <div style={{ marginTop: 14 }}>
              <ProgramsScreen />
            </div>
          </>
        )}

        {trainMode === "rutina" && (
          <>
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
                    <button onClick={() => setDeleteTarget(r.id)} style={{ fontSize: 14, padding: 4, color: C.red }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <ConfirmSheet
          visible={deleteTarget !== null}
          title="¿Eliminar esta rutina?"
          confirmLabel="Sí, eliminar"
          confirmColor={C.red}
          onConfirm={() => deleteCustomRoutine(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
        <MiniToast message={toast} />
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
            <button
              key={o.id}
              onClick={() => { setDiscId(o.id); store.set("last_futbol_location", o.id); }}
              className="card"
              style={{ flex: 1, padding: "18px 8px", border: store.get("last_futbol_location", null) === o.id ? `2px solid ${C.orange}` : undefined }}
            >
              <div style={{ fontSize: 30 }}>{o.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>{o.label}</div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>{o.desc}</div>
            </button>
          ))}
        </div>
        <button
          className="card" onClick={() => setSpecial("partido")}
          style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", borderLeft: `4px solid ${C.orange}` }}
        >
          <span style={{ fontSize: 24 }}>⚽</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Modo partido</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Registra acciones en tiempo real durante el partido</div>
          </div>
        </button>
      </div>
    );
  }

  /* ── Básquetbol: preguntar Con cancha o Sin cancha ── */
  if (discId === "basquetbol") {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Disciplinas
        </button>
        <div style={{ fontSize: 44, marginTop: 20 }}>🏀</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>¿Dónde entrenas hoy?</h2>
        <p className="muted" style={{ marginTop: 6 }}>Elige tu entorno de hoy</p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {BASQUET_LOCATIONS.map((o) => (
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

  /* ── Gimnasio Paso 1: ¿Cómo quieres entrenar hoy? (tipo de rutina) ── */
  if (discId === "gimnasio" && !gymTypeChosen) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 20 }}>
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Disciplinas
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>¿Cómo quieres entrenar hoy?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
          {GYM_WORKOUT_TYPES.filter((t) => !t.minLevel || isCampeonPlusGym).map((t) => (
            <button
              key={t.id} className="card" onClick={() => { setFocusId(t.id); setGymTypeChosen(true); setWeekChoice(null); }}
              style={{ textAlign: "left", padding: "12px 10px" }}
            >
              <div style={{ fontSize: 24 }}>{t.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Gimnasio Paso 1B: trabajo extra opcional ── */
  if (discId === "gimnasio" && gymTypeChosen && !extraStepDone) {
    const options = EXTRA_MUSCLE_OPTIONS[focusId] || [];
    if (options.length > 0) {
      return (
        <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
          <button onClick={() => setGymTypeChosen(false)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
            ‹ Tipo de rutina
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>¿Agregar trabajo extra? (opcional)</h2>
          <p className="muted" style={{ marginTop: 6 }}>Máximo 2 músculos adicionales</p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {options.map((o) => (
              <button
                key={o.id}
                className={`chip ${extraFocusIds.includes(o.id) ? "on" : ""}`}
                style={extraFocusIds.includes(o.id) ? { background: C.cyan } : {}}
                onClick={() => setExtraFocusIds((prev) => {
                  if (prev.includes(o.id)) return prev.filter((x) => x !== o.id);
                  if (prev.length >= 2) return prev;
                  return [...prev, o.id];
                })}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            className="btn-xl" onClick={() => setExtraStepDone(true)}
            style={{ marginTop: 20, background: C.cyan, color: "#07070C" }}
          >
            {extraFocusIds.length > 0 ? "Continuar" : `No, solo ${GYM_WORKOUT_TYPES.find((t) => t.id === focusId)?.name || ""}`}
          </button>
        </div>
      );
    }
  }

  /* ── Gimnasio Paso 2: metodología (solo Campeón+; los demás usan Estándar directo) ── */
  if (discId === "gimnasio" && !gymMethod && !isCampeonPlusGym) {
    return null;
  }
  if (discId === "gimnasio" && !gymMethod && isCampeonPlusGym) {
    const userLvl = mostFrequentLevel(sessions);
    const LEVEL_IDS = ["iniciado", "guerrero", "campeon", "elite", "leyenda", "the_one"];
    const levelId = LEVEL_IDS[userLvl];
    const gymSessions = sessions.filter((s) => s.kind === "entreno" && s.disc === "gimnasio").length;
    const oneRM = store.get("1rm", {});
    const wendlerMissing = WENDLER_EXERCISES.filter((e) => !oneRM[e]?.rm);

    const access = {
      standard: { ok: true },
      dup: {
        ok: gymSessions >= 15 || ["campeon", "elite", "leyenda", "the_one"].includes(levelId),
        msg: "Disponible con 15 sesiones de gimnasio", progress: `${gymSessions}/15 sesiones registradas`,
      },
      heavyduty: {
        ok: gymSessions >= 30 || ["elite", "leyenda", "the_one"].includes(levelId),
        msg: "Disponible con 30 sesiones de gimnasio", progress: `${gymSessions}/30 sesiones registradas`,
      },
      gvt: {
        ok: gymSessions >= 20 || ["campeon", "elite", "leyenda", "the_one"].includes(levelId),
        msg: "Disponible con 20 sesiones de gimnasio", progress: `${gymSessions}/20 sesiones registradas`,
      },
      century: { ok: true },
      wendler: {
        ok: wendlerMissing.length === 0,
        msg: "Requiere 1RM registrado en los 4 ejercicios básicos. Ve a Progreso → Calculadora 1RM para registrarlos.",
        progress: `${WENDLER_EXERCISES.length - wendlerMissing.length}/${WENDLER_EXERCISES.length} 1RM registrados`,
      },
    };

    const METHODOLOGIES = [
      { id: "standard", emoji: "📊", name: "Estándar", desc: "Progresión clásica probada", stats: "Series: 3-5 · Reps: 6-15 · Rest: 60-90s" },
      { id: "dup", emoji: "🔄", name: "DUP", desc: "Fuerza, hipertrofia y resistencia rotando", stats: "Series: 3-5 · Reps: Varía · Rest: Varía" },
      { id: "heavyduty", emoji: "💀", name: "Heavy Duty", desc: "Máxima intensidad, mínimo volumen", stats: "Series: 1-2 · Reps: Al fallo · Rest: 3-5 min" },
      { id: "gvt", emoji: "🔟", name: "GVT — 10×10", desc: "10 series del mismo ejercicio", stats: "Series: 10 · Reps: 10 · Rest: 60s exactos" },
      { id: "century", emoji: "💯", name: "Century Set", desc: "100 repeticiones contra el reloj", stats: "Series: 1 · Reps: 100 · Rest: Cuando necesites" },
      { id: "wendler", emoji: "📈", name: "Wendler 5/3/1", desc: "Ciclos de 4 semanas con porcentajes", stats: "Series: 3 · Reps: 5/3/1+ · Rest: 3-5 min" },
    ];
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <button onClick={() => { setGymTypeChosen(false); setExtraStepDone(false); }} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Tipo de rutina
        </button>
        <div style={{ fontSize: 40, marginTop: 12 }}>🏋️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>¿Con qué metodología?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, overflowX: "auto" }}>
          {METHODOLOGIES.map((m) => {
            const av = access[m.id];
            const available = av.ok;
            return (
              <div
                key={m.id} className="card"
                style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, textAlign: "left", opacity: available ? 1 : 0.5 }}
              >
                {!available && <span style={{ position: "absolute", top: 8, right: 10, fontSize: 14 }}>🔒</span>}
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>
                    {available ? m.desc : av.msg}
                  </div>
                  {available && (
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{m.stats}</div>
                  )}
                  {!available && av.progress && (
                    <div style={{ fontSize: 10, color: C.cyan, marginTop: 3, fontWeight: 700 }}>{av.progress}</div>
                  )}
                  {available ? (
                    <button
                      onClick={() => {
                        if (m.id === "heavyduty" && !hdSeen) { setShowHdUnlock(true); return; }
                        if (m.id === "standard" || m.id === "dup") setGymMethod(m.id);
                        else { setSpecial(m.id); setDiscId(null); }
                      }}
                      style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#07070C", background: C.cyan, padding: "8px 14px", borderRadius: 10, minHeight: 36 }}
                    >
                      Seleccionar
                    </button>
                  ) : m.id === "wendler" ? (
                    <p style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: C.cyan }}>
                      Progreso → Calculadora 1RM
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {showHdUnlock && (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div className="card" style={{ maxWidth: 340, textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 30 }}>🔓</div>
              <p style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>Heavy Duty disponible</p>
              <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>
                1-2 series al fallo absoluto. Es el método de los atletas serios.
              </p>
              <button
                className="btn-xl"
                onClick={() => { markHdSeen(); setShowHdUnlock(false); setSpecial("heavyduty"); setDiscId(null); }}
                style={{ marginTop: 14, background: C.red, color: "#fff" }}
              >
                Probarlo ahora
              </button>
              <button
                onClick={() => { markHdSeen(); setShowHdUnlock(false); }}
                style={{ marginTop: 10, minHeight: 44, color: C.mut, fontSize: 13, fontWeight: 700 }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Enfoque con semana completa disponible: preguntar antes del nivel/rutina ── */
  if (discId === "gimnasio" && gymMethod && FOCUS_WEEK_TEMPLATES[focusId] && !weekChoice) {
    const tpl = FOCUS_WEEK_TEMPLATES[focusId];
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 30 }}>
        <div style={{ fontSize: 40 }}>📅</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>{tpl.name}</h2>
        <p className="muted" style={{ marginTop: 6 }}>¿Quieres solo esta sesión o guardar una semana completa?</p>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="card" onClick={() => setWeekChoice("solo")} style={{ flex: 1, padding: "16px 8px" }}>
            <div style={{ fontSize: 22 }}>▶</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>Solo hoy</div>
          </button>
          <button
            className="card"
            onClick={() => {
              const week = generateFocusWeek(focusId);
              if (week) { store.set("weekly_plan", week); setWeekSavedMsg(true); }
            }}
            style={{ flex: 1, padding: "16px 8px", borderColor: `${C.cyan}66` }}
          >
            <div style={{ fontSize: 22 }}>📅</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>Guardar semana completa</div>
          </button>
        </div>
        {weekSavedMsg && (
          <>
            <p style={{ fontSize: 12, color: C.cyan, marginTop: 16, lineHeight: 1.5 }}>
              Semana guardada. Ve a Yo → Progreso → Mi plan para ver tu semana completa.
            </p>
            <button className="btn-xl" onClick={() => setWeekChoice("solo")} style={{ marginTop: 14, background: C.cyan, color: "#07070C" }}>
              Continuar a la sesión de hoy
            </button>
          </>
        )}
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

      {!discId?.startsWith("basquet") && discId !== "gimnasio" && (
        <>
          <div className="sec-title">A · Enfoque</div>
          {showTutorial && (
            <div className="card" style={{ marginBottom: 8, padding: "9px 12px", borderColor: `${C.cyan}66`, background: "rgba(0,229,255,0.08)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Selecciona tu enfoque</p>
            </div>
          )}
          {discId?.startsWith("futbol") ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {disc.focuses.map((f) => (
                <button
                  key={f.id}
                  className="card"
                  style={{
                    textAlign: "left", padding: "8px 10px",
                    border: `1px solid ${focusId === f.id ? disc.color : C.border}`,
                    background: focusId === f.id ? `${disc.color}18` : C.card,
                  }}
                  onClick={() => setFocusId(f.id)}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: focusId === f.id ? disc.color : C.text }}>{f.label}</div>
                  {f.desc && <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{f.desc}</div>}
                </button>
              ))}
            </div>
          ) : (
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
          )}

          {FOCUS_ZONES[discId] && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <MuscleMap zones={FOCUS_ZONES[discId][focusId] || []} />
            </div>
          )}
        </>
      )}

      {discId === "gimnasio" && (
        <div className="card" style={{ marginTop: 4, padding: "10px 12px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>
            {GYM_WORKOUT_TYPES.find((t) => t.id === focusId)?.emoji} {GYM_WORKOUT_TYPES.find((t) => t.id === focusId)?.name || "Rutina"}
            {extraFocusIds.length > 0 && ` + ${extraFocusIds.map((id) => EXTRA_MUSCLE_OPTIONS[focusId]?.find((o) => o.id === id)?.label).filter(Boolean).join(", ")}`}
          </span>
          <button onClick={() => { setGymTypeChosen(false); setExtraStepDone(false); }} style={{ display: "block", margin: "4px auto 0", fontSize: 11, color: C.dim, fontWeight: 700 }}>
            Cambiar
          </button>
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
            <PowerBar levelIdx={i} />
          </button>
        ))}
      </div>

      {dupType && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <span style={{
            fontSize: 12, fontWeight: 800, color: DUP_SCHEMES[dupType].color, background: `${DUP_SCHEMES[dupType].color}18`,
            padding: "6px 14px", borderRadius: 99, border: `1px solid ${DUP_SCHEMES[dupType].color}44`,
          }}>
            DUP — Hoy toca: {DUP_SCHEMES[dupType].name} {dupType === "strength" ? "🔴" : dupType === "hypertrophy" ? "💪" : "🔵"}
          </span>
        </div>
      )}

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
          {(() => {
            const focusLabel = disc.focuses.find((f) => f.id === focusId)?.label;
            const overtraining = checkOvertraining(focusLabel, sessions);
            if (!overtraining) return null;
            return (
              <div className="card" style={{ marginTop: 12, padding: "11px 14px", borderColor: `${C.yellow}55`, background: "rgba(255,214,0,0.06)" }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.yellow }}>⚠️ {overtraining.message}</p>
                <p style={{ fontSize: 11, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>{overtraining.suggestion}</p>
                <p style={{ fontSize: 10, color: C.dim, marginTop: 4, fontStyle: "italic" }}>Esta es solo una referencia — escucha tu cuerpo.</p>
              </div>
            );
          })()}
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
              onClick={() => startAndFinishTutorial({ discId, discLabel: disc.label, discColor: disc.color, discIcon: disc.icon, focusLabel: disc.focuses.find((f) => f.id === focusId).label, lvlIdx, exercises: routine, calLocation: discId === "calistenia" ? calLocation : undefined, dupType })}
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
/* Avanza automáticamente si el plan no tiene contenido educativo asociado */
function NoEducationSkip({ onSkip }) {
  useEffect(() => { onSkip(); }, [onSkip]);
  return null;
}

/* Card educativa pre-sesión; marca la disciplina+enfoque como vista en un efecto (no durante el render) */
function EducationScreen({ plan, eduText, onDone }) {
  useEffect(() => {
    store.set(`seen_edu_${plan.discId}_${plan.focusId || "todo"}`, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      className="screen fade-up"
      style={{ textAlign: "center", paddingTop: 50, background: `linear-gradient(160deg, ${plan.discColor}33, ${C.bg} 70%)`, minHeight: "100vh" }}
    >
      <div style={{ fontSize: 56 }}>{plan.discIcon}</div>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 12, color: "#fff" }}>{plan.discLabel}{plan.focusLabel ? ` · ${plan.focusLabel}` : ""}</h2>
      <p style={{ fontSize: 14, color: "#fff", marginTop: 14, lineHeight: 1.6, padding: "0 8px" }}>{eduText}</p>
      <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "center" }}>
        <button onClick={onDone} style={{ color: "#fff", fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
          Saltar →
        </button>
        <button
          className="btn-xl" onClick={onDone}
          style={{ background: plan.discColor || C.cyan, color: "#07070C" }}
        >
          Empezar sesión ▶
        </button>
      </div>
    </div>
  );
}

function ActiveSession({ plan, streak, sessions, onSave, onSaveNote, onClose, voiceOn, name, onMentor }) {
  const [exIdx, setExIdx] = useState(0);
  const [setNum, setSetNum] = useState(0);
  const [phase, setPhase] = useState("education"); // education | warmupPrompt | warmup | breathing | work | rest | exdone | coolPrompt | cooldown | finished
  const [restLeft, setRestLeft] = useState(0);
  const [logs, setLogs] = useState(() => plan.exercises.map(() => []));
  const [editingSet, setEditingSet] = useState(null);
  const [showExerciseHistory, setShowExerciseHistory] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [leftW, setLeftW] = useState("");
  const [rightW, setRightW] = useState("");
  const [weightUnit, setWeightUnit] = useState(() => store.get("weight_unit", "kg"));
  const [field, setField] = useState(() => (plan.exercises[0].type === "peso" ? "weight" : "reps"));
  const [repsError, setRepsError] = useState(false);
  const [flashDone, setFlashDone] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [flashWhite, setFlashWhite] = useState(false);
  const [photoFinish, setPhotoFinish] = useState(false);
  const recordCelebratedRef = useRef(false);
  const [justWarmedUp, setJustWarmedUp] = useState(false);
  const [pendingLogs, setPendingLogs] = useState(null);
  const [lastRecord, setLastRecord] = useState(null);
  // eslint-disable-next-line no-unused-vars -- se dejó el estado sin eliminar tras quitar el textarea de notas
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [rpeFor, setRpeFor] = useState(null);
  const rpeTimeoutRef = useRef(null);
  const [setBadge, setSetBadge] = useState(null);
  const setBadgeTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(setBadgeTimeoutRef.current), []);
  const [autoDefaultBadge, setAutoDefaultBadge] = useState(null);
  const autoDefaultTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(autoDefaultTimeoutRef.current), []);
  const [idleWarning, setIdleWarning] = useState(false);
  const lastActionRef = useRef(null);
  useEffect(() => {
    lastActionRef.current = Date.now();
    const t = setTimeout(() => setIdleWarning(false), 0);
    return () => clearTimeout(t);
  }, [exIdx, setNum]);
  useEffect(() => {
    if (phase !== "work") {
      const t0 = setTimeout(() => setIdleWarning(false), 0);
      return () => clearTimeout(t0);
    }
    const t = setInterval(() => {
      if (lastActionRef.current !== null && Date.now() - lastActionRef.current > 5 * 60 * 1000) setIdleWarning(true);
    }, 15000);
    return () => clearInterval(t);
  }, [phase, exIdx, setNum]);
  const [showExDoneToast, setShowExDoneToast] = useState(false);
  useEffect(() => {
    if (phase !== "exdone") return undefined;
    const t0 = setTimeout(() => setShowExDoneToast(true), 0);
    const t1 = setTimeout(() => setShowExDoneToast(false), 1000);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [phase]);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [activationDone, setActivationDone] = useState({});
  const [showFullBreathing, setShowFullBreathing] = useState(false);
  const [quickBreathDone, setQuickBreathDone] = useState(false);

  useEffect(() => () => clearTimeout(rpeTimeoutRef.current), []);

  const showAutoBadge = (text) => {
    clearTimeout(autoDefaultTimeoutRef.current);
    setAutoDefaultBadge(text);
    autoDefaultTimeoutRef.current = setTimeout(() => setAutoDefaultBadge(null), 1500);
  };

  const applyRpe = (exI, setI, value, isAuto = false) => {
    clearTimeout(rpeTimeoutRef.current);
    setLogs((prev) => prev.map((arr, i) => (i === exI ? arr.map((s, j) => (j === setI ? { ...s, rpe: value } : s)) : arr)));
    setRpeFor(null);
    if (isAuto) showAutoBadge(`Auto: RPE ${value}`);
  };

  const applyTechnique = (exI, setI, value, isAuto = false) => {
    setLogs((prev) => prev.map((arr, i) => (i === exI ? arr.map((s, j) => (j === setI ? { ...s, technique: value } : s)) : arr)));
    if (isAuto) showAutoBadge("Auto: Técnica: Bien");
    if (value === 1) {
      const count = store.get(`technique_bad_streak_${ex.name}`, 0) + 1;
      store.set(`technique_bad_streak_${ex.name}`, count);
      if (count >= 3) {
        onMentor?.("maestro", `Llevas 3 series con fallo técnico en ${ex.name}. ¿Lo bajamos un nivel?`);
        store.set(`technique_bad_streak_${ex.name}`, 0);
      }
    } else {
      store.set(`technique_bad_streak_${ex.name}`, 0);
    }
  };

  /* Solo para resaltar el botón elegido en "¿Cómo estuvo la técnica?" (no persiste por separado; el valor real se guarda vía applyTechnique) */
  const [lastTechButtonId, setLastTechButtonId] = useState({});
  const rateTechnique = (exerciseName, exerciseIdx, ratingId) => {
    setLastTechButtonId((prev) => ({ ...prev, [exerciseIdx]: ratingId }));
    const value = { perfecta: 3, bien: 2, regular: 2, mal: 1 }[ratingId] ?? 2;
    const exLogs = logs[exerciseIdx] || [];
    if (exLogs.length) applyTechnique(exerciseIdx, exLogs.length - 1, value);
    const streakKey = `technique_bad_streak_${exerciseName}`;
    if (ratingId === "mal" || ratingId === "regular") {
      const count = store.get(streakKey, 0) + 1;
      store.set(streakKey, count);
      if (count >= 3) {
        onMentor?.("maestro", `Llevas 3 sesiones con técnica baja en ${exerciseName}. ¿Lo bajamos un nivel?`);
        store.set(streakKey, 0);
      }
    } else {
      store.set(streakKey, 0);
    }
  };
  /* Cancela cualquier voz pendiente al salir de la sesión */
  useEffect(() => () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);

  useEffect(() => {
    if (!justWarmedUp) return undefined;
    const t = setTimeout(() => setJustWarmedUp(false), 2500);
    return () => clearTimeout(t);
  }, [justWarmedUp]);

  // eslint-disable-next-line no-unused-vars -- ya no se muestra el hint, se deja el estado sin eliminar
  const [showSwipeHint] = useState(() => store.get("session_count", 0) < 3);
  const [showGestureOverlay, setShowGestureOverlay] = useState(() => store.get("session_count", 0) === 0);
  const [showStep4, setShowStep4] = useState(() => store.get("session_count", 0) === 0 && !store.get("tutorial_done", false));
  const [showGoalBanner, setShowGoalBanner] = useState(() => !!goalContextCopy());
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

  useEffect(() => {
    if (!showGoalBanner) return undefined;
    const t = setTimeout(() => setShowGoalBanner(false), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* El cronómetro real arranca cuando empieza el trabajo (no cuenta el calentamiento) */
  const [startTs, setStartTs] = useState(null);
  const beginWork = () => {
    setStartTs(Date.now());
    setPhase("work");
  };

  const ex = plan.exercises[exIdx];
  const isLastEx = exIdx === plan.exercises.length - 1;
  const lvl = LEVELS[plan.lvlIdx];

  const popConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2500);
  };

  /* Cronómetro global de la sesión */
  useEffect(() => {
    if (!startTs) return undefined;
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
    const sameType = priorHistory.filter((s) => s.kind === "entreno" && s.disc === plan.discId).slice(-3);
    if (!sameType.length) return 0;
    return sameType.reduce((a, s) => a + sessionVolume(s), 0) / sameType.length;
  }, [priorHistory, plan.discId]);

  /* Foto finish: celebración especial al batir un récord (o racha 7 / sesión perfecta) */
  useEffect(() => {
    if (phase !== "finished") { recordCelebratedRef.current = false; return; }
    if (recordCelebratedRef.current) return;
    recordCelebratedRef.current = true;

    let nr = null;
    plan.exercises.forEach((e, i) => {
      const okLogs = (logs[i] || []).filter((l) => l.ok);
      if (!okLogs.length) return;
      const best = okLogs.reduce((a, b) => (b.weight * 1000 + b.reps > a.weight * 1000 + a.reps ? b : a));
      const prior = priorRecords.find((r) => r.name === e.name);
      const bestScore = best.weight * 1000 + best.reps;
      if (!prior || bestScore > prior.score) {
        if (!nr || bestScore - (prior?.score || 0) > nr.improvement) {
          nr = { name: e.name, weight: best.weight, prevWeight: prior?.weight || 0, improvement: bestScore - (prior?.score || 0) };
        }
      }
    });

    if (nr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara la celebración una sola vez al entrar a "finished"
      setPhotoFinish(true);
      setTimeout(() => setPhotoFinish(false), 3000);
      shutterClick();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
      onMentor?.("guerrero", `¡${nr.name} → ${nr.prevWeight}kg → ${nr.weight}kg! RÉCORD ROTO 🔥`);
      return;
    }

    const allSets = logs.flat();
    const totalPlanned = plan.exercises.reduce((a, e) => a + e.sets, 0);
    const okCount = allSets.filter((s) => s.ok).length;
    if (streak === 7) {
      onMentor?.("guerrero", `${streak} días seguidos. Eres lo que otros no se atreven a ser.`);
    } else if (totalPlanned > 0 && okCount >= totalPlanned) {
      onMentor?.("guerrero", "¡ESO ES! Nadie te va a detener.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Persiste la sugerencia de próxima sesión para que Inicio la use en el plan del día */
  const nextSuggestionSavedRef = useRef(false);
  useEffect(() => {
    if (phase !== "finished") { nextSuggestionSavedRef.current = false; return; }
    if (nextSuggestionSavedRef.current) return;
    nextSuggestionSavedRef.current = true;
    if (plan.discId !== "gimnasio") return;
    const label = nextMuscleSuggestion(plan.focusLabel);
    store.set("next_suggestion", { label, reason: `Balanceas el trabajo de ${plan.focusLabel || plan.discLabel} de hoy. Recuperación: 48h mínimo.`, ts: Date.now() });
  }, [phase, plan.discId, plan.focusLabel, plan.discLabel]);

  /* Sugerencias de peso calculadas al iniciar la sesión */
  const suggestions = useMemo(
    () => plan.exercises.map((e) => (e.type === "peso" ? weightSuggestion(sessions, e.name) : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const sug = suggestions[exIdx];

  /* Progresión lineal automática por ejercicio (peso sugerido + tendencia + PR + última vez) */
  const progressions = useMemo(
    () => plan.exercises.map((e) => (e.type === "peso" ? calculateNextWeight(e.name, sessions) : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const progression = progressions[exIdx];
  const exPR = priorRecords.find((r) => r.name === ex.name);
  const lastSessionSets = useMemo(() => {
    const prevWithEx = [...sessions].reverse().find((s) => s.kind === "entreno" && s.exercises.some((e) => e.name === ex.name));
    if (!prevWithEx) return null;
    const foundEx = prevWithEx.exercises.find((e) => e.name === ex.name);
    const okSets = foundEx.sets.filter((st) => st.ok);
    if (!okSets.length) return null;
    return okSets.map((st) => (st.weight > 0 ? `${st.weight}kg×${st.reps}` : `${st.reps}`)).join(", ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.name]);

  /* Warm-up específico: solo si hay historial y el peso de trabajo supera los 40kg */
  const workWeight = progression?.weight || 0;
  const activationSets = WARMUP_SETS[ex.name];
  const showActivation = !!(
    ex.type === "peso" && activationSets && progression?.weight !== null && workWeight > 40 &&
    phase === "work" && setNum === 0 && !activationDone[exIdx]
  );

  /* Tiempo estimado restante: promedio de segundos por ejercicio de sesiones previas + descansos pendientes */
  const estMinutesLeft = useMemo(() => {
    const prior = sessions.filter((s) => s.kind === "entreno" && s.disc === plan.discId && s.exercises?.length);
    let avgSecPerEx = 150;
    if (prior.length) {
      const withDuration = prior.filter((s) => s.durationMin > 0);
      if (withDuration.length) {
        avgSecPerEx = withDuration.reduce((a, s) => a + (s.durationMin * 60) / s.exercises.length, 0) / withDuration.length;
      }
    }
    const remainingExercises = plan.exercises.length - exIdx;
    const remainingRest = plan.exercises.slice(exIdx).reduce((a, e) => a + (e.rest || 0), 0);
    const totalSec = remainingExercises * avgSecPerEx + remainingRest;
    return Math.max(0, Math.round(totalSec / 60));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exIdx, plan.discId]);

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
    setPendingLogs(finalLogs);
    setPhase("coolPrompt");
  };

  const completeSession = (finalLogs, gotCooldownBonus) => {
    const record = {
      id: Date.now(),
      ts: Date.now(),
      kind: "entreno",
      disc: plan.discId,
      focusLabel: plan.focusLabel,
      levelIdx: plan.lvlIdx,
      calLocation: plan.calLocation,
      durationMin: Math.round(sessionSecs / 60),
      sesionRapida: sessionSecs < 300,
      cooldownBonus: !!gotCooldownBonus,
      note: sanitizeNote(quickNote) || undefined,
      dupType: plan.dupType || undefined,
      exercises: plan.exercises.map((e, i) => ({ name: e.name, sets: finalLogs[i], technique: lastLoggedTechnique(finalLogs[i]) })),
    };
    onSave(record);
    setLastRecord(record);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (voiceOn) speak(`¡Sesión completada! Eres un ${LEVELS[plan.lvlIdx]?.name || ""}`);
    const allSetsPlanned = plan.exercises.reduce((a, e) => a + e.sets, 0);
    const allSetsOk = finalLogs.flat().filter((s) => s.ok).length;
    const isPerfect = allSetsPlanned > 0 && allSetsOk >= allSetsPlanned;
    const beatRecord = plan.exercises.some((e, i) => {
      const okLogs = (finalLogs[i] || []).filter((l) => l.ok);
      if (!okLogs.length) return false;
      const best = okLogs.reduce((a, b) => (b.weight * 1000 + b.reps > a.weight * 1000 + a.reps ? b : a));
      const prior = priorRecords.find((r) => r.name === e.name);
      return !prior || best.weight * 1000 + best.reps > prior.score;
    });
    if (isPerfect || beatRecord) popConfetti();
    setFlashWhite(true);
    setTimeout(() => setFlashWhite(false), 300);
    setPhase("finished");
  };

  const logSet = (ok, repsOverride = null) => {
    ensureAudio(); // el AudioContext debe nacer en un gesto del usuario (móvil)
    if (ok && navigator.vibrate) navigator.vibrate(50);
    const repsVal = repsOverride !== null ? repsOverride : parseInt(reps, 10) || 0;
    const unilateral = isUnilateral(ex.name);
    const toKg = (v) => (weightUnit === "lbs" ? v / 2.205 : v);
    const lw = toKg(parseFloat(leftW) || 0);
    const rw = toKg(parseFloat(rightW) || 0);
    const weightInKg = toKg(parseFloat(weight) || 0);
    const entry = {
      reps: repsVal, weight: unilateral ? Math.max(lw, rw) : weightInKg, ok,
      ...(unilateral && (lw > 0 || rw > 0) ? { leftWeight: lw, rightWeight: rw } : {}),
    };
    const updatedLogs = logs.map((arr, i) => (i === exIdx ? [...arr, entry] : arr));
    setLogs(updatedLogs);
    setReps("");
    setLeftW("");
    setRightW("");
    if (ok) {
      setJustCompletedSet(setNum);
      setTimeout(() => setJustCompletedSet(null), 300);
      setShowXpBadge(true);
      setTimeout(() => setShowXpBadge(false), 800);
    }
    if (ok) {
      const thisExIdx = exIdx;
      const thisSetIdx = updatedLogs[exIdx].length - 1;
      setRpeFor({ exIdx: thisExIdx, setIdx: thisSetIdx });
      clearTimeout(rpeTimeoutRef.current);
      rpeTimeoutRef.current = setTimeout(() => applyRpe(thisExIdx, thisSetIdx, 7, true), 5000);
      applyTechnique(thisExIdx, thisSetIdx, 2);

      /* Feedback inmediato: compara con el récord y la sesión anterior */
      if (ex.type === "peso" && entry.weight > 0) {
        const prScore = exPR ? exPR.weight * 1000 + exPR.reps : 0;
        const thisScore = entry.weight * 1000 + entry.reps;
        let badge;
        if (thisScore > prScore) badge = { text: "🏆 NUEVO RÉCORD", color: "#FFD700" };
        else if (progression?.weight !== null && entry.weight === progression.weight) badge = { text: "✅ Consistente", color: C.cyan };
        else if (progression?.trend === "up" || entry.weight > (progression?.weight || 0)) badge = { text: "📈 Mejorando", color: C.green };
        else badge = { text: "💪 Sigue adelante", color: C.orange };
        setSetBadge(badge);
        clearTimeout(setBadgeTimeoutRef.current);
        setBadgeTimeoutRef.current = setTimeout(() => setSetBadge(null), 1500);
      }
    }
    if (ok) {
      const doneInCurrentEx = setNum + 1;
      const remainingInCurrentEx = Math.max(0, ex.sets - doneInCurrentEx);
      const remainingInFollowingEx = plan.exercises.slice(exIdx + 1).reduce((a, e) => a + e.sets, 0);
      const totalRemaining = remainingInCurrentEx + remainingInFollowingEx;
      if (totalRemaining === 3) {
        setShowLastSets(true);
        setTimeout(() => setShowLastSets(false), 2000);
      }
    }
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

  const [slideState, setSlideState] = useState("visible");
  const [justCompletedSet, setJustCompletedSet] = useState(null);
  const [showXpBadge, setShowXpBadge] = useState(false);
  const [showLastSets, setShowLastSets] = useState(false);

  const nextExercise = () => {
    if (isLastEx) {
      /* Reserva de seguridad: normalmente ya se pasó a "finished" automáticamente desde logSet */
      finishSession(logs);
    } else {
      setSlideState("exit-left");
      setTimeout(() => {
        const nextEx = plan.exercises[exIdx + 1];
        setExIdx((i) => i + 1);
        setSetNum(0);
        setWeight("");
        setReps("");
        setLeftW("");
        setRightW("");
        setField(nextEx.type === "peso" ? "weight" : "reps");
        setPhase("work");
        setSlideState("enter-right");
        requestAnimationFrame(() => setSlideState("visible"));
      }, 200);
    }
  };

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const quit = () => {
    document.activeElement?.blur();
    setTimeout(() => setShowExitConfirm(true), 150);
  };

  const completedExCount = logs.filter((arr) => arr.some((s) => s.ok)).length;
  const completedSetCount = logs.reduce((a, arr) => a + arr.filter((s) => s.ok).length, 0);

  const saveAndExit = () => {
    if (completedExCount === 0) { onClose(); return; }
    const record = {
      id: Date.now(),
      ts: Date.now(),
      kind: "entreno",
      disc: plan.discId,
      focusLabel: plan.focusLabel,
      levelIdx: plan.lvlIdx,
      calLocation: plan.calLocation,
      durationMin: Math.round(sessionSecs / 60),
      partial: true,
      exercises: plan.exercises
        .map((e, i) => ({ name: e.name, sets: logs[i], technique: lastLoggedTechnique(logs[i]) }))
        .filter((_, i) => logs[i].some((s) => s.ok)),
    };
    onSave(record);
    onClose();
  };

  /* Educación integrada: card breve antes de empezar (o saltar) */
  if (phase === "education") {
    const eduText = getSessionEducation(plan);
    const educationKey = `seen_edu_${plan.discId}_${plan.focusId || "todo"}`;
    if (!eduText || store.get(educationKey, false)) {
      return <NoEducationSkip onSkip={() => setPhase("warmupPrompt")} />;
    }
    return <EducationScreen plan={plan} eduText={eduText} onDone={() => setPhase("warmupPrompt")} />;
  }

  /* Calentamiento opcional antes de la sesión (no se registra en el historial) */
  if (phase === "warmupPrompt") {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 40 }}>🔥</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>Calentamiento — 5 min</h2>
        <p className="muted" style={{ marginTop: 6 }}>Prepara tu cuerpo para {plan.discLabel}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn-xl" onClick={beginWork} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.mut }}>
            Saltar
          </button>
          <button className="btn-xl" onClick={() => setPhase("warmup")} style={{ background: plan.discColor || C.cyan, color: "#07070C" }}>
            Empezar calentamiento
          </button>
        </div>
      </div>
    );
  }

  if (phase === "warmup") {
    return (
      <GuidedMiniFlow
        title="🔥 Calentamiento" subtitle={`Preparando ${plan.discLabel}`} color={plan.discColor || C.cyan}
        exercises={WARMUP_ROUTINES[warmupKeyFor(plan.discId)]}
        onDone={() => { setJustWarmedUp(true); beginWork(); }}
      />
    );
  }

  /* Enfriamiento opcional al terminar, antes de la pantalla de felicitaciones */
  if (phase === "coolPrompt") {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 40 }}>🧊</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>¿Hacer enfriamiento? (Recomendado)</h2>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn-xl" onClick={() => completeSession(pendingLogs, false)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.mut }}>
            Saltar — ver resultados
          </button>
          <button className="btn-xl" onClick={() => setPhase("cooldown")} style={{ background: C.cyan, color: "#07070C" }}>
            Sí, 3 min
          </button>
        </div>
      </div>
    );
  }

  if (phase === "cooldown") {
    return (
      <GuidedMiniFlow
        title="🧊 Enfriamiento" subtitle="Recuperación activa" color={C.cyan}
        exercises={COOLDOWN_ROUTINES[warmupKeyFor(plan.discId)]}
        onDone={() => completeSession(pendingLogs, true)}
      />
    );
  }

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

    /* Sugerencia de la siguiente sesión: día siguiente del programa activo, o equilibrio muscular básico */
    const getSuggestion = () => {
      const grp = plan.muscleGroup || focusGroupOf(plan.focusLabel);
      const map = {
        empuje: "Mañana: Pull o Piernas",
        tiron: "Mañana: Push o Piernas",
        piernas: "Mañana: Push o Pull",
        fullbody: "Mañana: Descanso o movilidad",
        core: "Mañana: Disciplina libre",
        brazos: "Mañana: Piernas",
      };
      return map[grp] || null;
    };
    const activeProgramForSuggestion = getActiveProgram();
    const suggestion = activeProgramForSuggestion
      ? (() => {
          const dayIdx = (new Date().getDay() + 6) % 7;
          const tomorrowIdx = (dayIdx + 1) % 7;
          const tomorrow = activeProgramForSuggestion.program.structure[tomorrowIdx];
          return tomorrow ? `Mañana: ${tomorrow.label}` : "Mañana: Descanso";
        })()
      : plan.discId === "gimnasio" ? getSuggestion() : null;

    const isPerfect = pctComplete >= 1;
    return (
      <div
        className="screen fade-up"
        style={{
          paddingTop: 30, textAlign: "center", paddingBottom: 30,
          background: isPerfect ? `linear-gradient(180deg, rgba(255,214,0,0.14), transparent 40%)` : "none",
          borderTop: !isPerfect && pctComplete > 0.8 ? `3px solid ${C.green}` : "none",
          margin: !isPerfect && pctComplete > 0.8 ? "-1px -1px 0" : 0,
        }}
      >
        {flashWhite && <div className="white-flash" />}
        <Confetti show={confetti} />
        <div className="unlock-pop" style={{ fontSize: 64 }}>{hero.emoji}</div>
        <DisciplineCelebration discId={plan.discId} />
        <h2 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
          {isPerfect ? "⚡ SESIÓN PERFECTA" : pctComplete > 0.8 ? "💪 Gran trabajo" : "🦾 Sigue adelante"}
        </h2>
        <p style={{ color: C.mut, marginTop: 4, fontSize: 13 }}>Sesión de {plan.discLabel} completada</p>

        {lastRecord?.cooldownBonus && (
          <div className="card pop" style={{ marginTop: 12, borderColor: `${C.cyan}55`, background: "rgba(0,229,255,0.08)" }}>
            <p style={{ fontSize: 12, color: C.cyan, fontWeight: 700 }}>Recuperación activa completada ✨ · +50 XP</p>
          </div>
        )}

        {sessionSecs < 300 && (
          <div className="card" style={{ marginTop: 12, borderColor: `${C.orange}55`, background: "rgba(255,122,47,0.08)" }}>
            <p style={{ fontSize: 12, color: C.orange, fontWeight: 700 }}>
              ⏱ Sesión muy corta. Completa al menos 5 minutos para que cuente en tu racha.
            </p>
          </div>
        )}

        {justUnlocked && (
          <div className="card unlock-pop" style={{ marginTop: 14, borderColor: C.yellow, background: "rgba(255,214,0,0.07)" }}>
            <div style={{ fontSize: 36 }}>{justUnlocked.emoji}</div>
            <div style={{ fontWeight: 800, color: C.yellow, marginTop: 4, fontSize: 13 }}>¡Héroe desbloqueado: {justUnlocked.name}!</div>
            <div style={{ fontSize: 11, color: C.mut, fontStyle: "italic" }}>“{justUnlocked.quote}”</div>
          </div>
        )}

        {newRecord && (
          <div className={`card pop slide-up-fade ${photoFinish ? "record-zoom" : ""}`} style={{ marginTop: 12, borderColor: C.yellow, background: "rgba(255,214,0,0.1)", animationDelay: "200ms" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.yellow }}>🏆 NUEVO RÉCORD PERSONAL</div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
              {newRecord.name}: {newRecord.weight > 0 ? `${newRecord.weight} kg × ${newRecord.reps}` : `${newRecord.reps} reps`}
            </div>
          </div>
        )}
        {photoFinish && (
          <div className="record-badge" style={{ position: "fixed", top: 90, left: 20, right: 20, zIndex: 220, textAlign: "center" }}>
            <div style={{
              display: "inline-block", padding: "10px 18px", borderRadius: 99, background: "#FFD700",
              color: "#07070C", fontWeight: 900, fontSize: 14, boxShadow: "0 0 24px #FFD70088",
            }}>
              🏆 NUEVO RÉCORD
            </div>
          </div>
        )}
        {photoFinish && <div className="white-flash" style={{ animationDuration: "200ms" }} />}

        <div className="slide-up-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14, animationDelay: "0ms" }}>
          <div className="card" style={{ padding: "12px 8px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.cyan }}>⏱ {formatDuration(Math.floor(sessionSecs / 60))}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Duración</div>
          </div>
          <div className="card" style={{ padding: "12px 8px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.green }}>💪 {okSets}/{totalPlanned}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Series</div>
          </div>
          <div className="card" style={{ padding: "12px 8px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>🏋️ {volume > 0 ? formatVolume(volume) : "—"}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Volumen</div>
          </div>
          <div className="card" style={{ padding: "12px 8px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.orange }}>🔥 {newStreak} {newStreak === 1 ? "día" : "días"}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Racha</div>
          </div>
        </div>

        {volume > 0 && (
          <p style={{ fontSize: 11, color: C.mut, marginTop: 8 }}>Levantaste el peso de {bulldogs} bulldogs 🐕</p>
        )}

        {volDiffPct !== null && volDiffPct > 0 && (
          <p style={{ fontSize: 12, fontWeight: 700, color: C.green, marginTop: 8 }}>
            📈 +{volDiffPct}% vs tu promedio
          </p>
        )}

        {prevTotals && (() => {
          const durationNow = Math.round(sessionSecs / 60);
          const durationPrev = prevSession.durationMin || 0;
          const volPct = prevTotals.volume > 0 ? Math.round(((volume - prevTotals.volume) / prevTotals.volume) * 100) : 0;
          const setsDiff = okSets - prevTotals.sets;
          const timeDiff = durationNow - durationPrev;
          let analysis;
          if (volPct > 10) analysis = "Sesión notablemente más intensa que la anterior 🔥";
          else if (setsDiff < 0 && volPct > 0) analysis = "Menos series, más peso. Enfoque en intensidad 💪";
          else if (Math.abs(volPct) <= 3 && setsDiff === 0) analysis = "Sesión consistente. La consistencia gana 📊";
          else if (volPct < 0 && setsDiff <= 0) analysis = "Día más flojo. Normal, sigue mañana 💪";
          else analysis = "Sesión completada. Cada entrenamiento suma 💪";
          return (
            <div className="card slide-up-fade" style={{ marginTop: 10, padding: "12px", textAlign: "left", animationDelay: "100ms" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: C.mut, marginBottom: 6 }}>📊 Tu sesión vs la anterior</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.dim }}>Volumen</span>
                <span>{volume.toLocaleString()}kg</span><span style={{ color: C.mut }}>{prevTotals.volume.toLocaleString()}kg</span>
                <span style={{ fontWeight: 800, color: volPct >= 0 ? C.green : C.orange }}>{volPct >= 0 ? "+" : ""}{volPct}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.dim }}>Series</span>
                <span>{okSets}</span><span style={{ color: C.mut }}>{prevTotals.sets}</span>
                <span style={{ fontWeight: 800, color: setsDiff >= 0 ? C.green : C.orange }}>{setsDiff >= 0 ? "+" : ""}{setsDiff}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                <span style={{ color: C.dim }}>Duración</span>
                <span>{durationNow}min</span><span style={{ color: C.mut }}>{durationPrev}min</span>
                <span style={{ fontWeight: 800, color: C.mut }}>{timeDiff >= 0 ? "+" : ""}{timeDiff}min</span>
              </div>
              <p style={{ fontSize: 12, color: C.text, marginTop: 8, fontWeight: 700 }}>{analysis}</p>
            </div>
          );
        })()}

        {suggestion && (
          <div className="card" style={{ marginTop: 8, padding: "11px" }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{suggestion}</span>
          </div>
        )}

        {(() => {
          const failedTechnique = plan.exercises
            .map((e, i) => ({ e, technique: lastLoggedTechnique(logs[i]) }))
            .filter((x) => x.technique === 1);
          if (!failedTechnique.length) return null;
          return (
            <div className="card" style={{ marginTop: 8, padding: "11px", textAlign: "left", borderColor: `${C.yellow}55` }}>
              {failedTechnique.map(({ e }) => (
                <div key={e.name} style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: C.yellow }}>⚠️ Técnica baja en: {e.name}</p>
                  {e.tip && <p style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>Tip: {e.tip}</p>}
                </div>
              ))}
            </div>
          );
        })()}

        {!noteSaved ? (
          <div className="card" style={{ marginTop: 14, textAlign: "center", padding: "16px 14px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.mut, marginBottom: 12 }}>¿Cómo fue la sesión?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {[
                { emoji: "🔥", label: "Excelente", value: "great" },
                { emoji: "💪", label: "Bien", value: "good" },
                { emoji: "😴", label: "Cansado", value: "tired" },
              ].map(({ emoji, label, value }) => (
                <button
                  key={value}
                  onClick={() => {
                    if (lastRecord) onSaveNote?.(lastRecord.id, label);
                    setNoteSaved(true);
                  }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "12px 16px", borderRadius: 14, background: C.surface,
                    border: `1px solid ${C.border}`, minWidth: 72, cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{emoji}</span>
                  <span style={{ fontSize: 11, color: C.mut, fontWeight: 600 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : noteText?.trim() ? (
          <p style={{ fontSize: 11, color: C.green, marginTop: 10, fontWeight: 700 }}>Guardado ✓</p>
        ) : null}

        <button
          className="btn-xl slide-up-fade"
          onClick={async () => {
            const d = new Date();
            const dateStr = d.toLocaleDateString("es", { day: "numeric", month: "long" });
            const timeStr = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
            const lvlName = LEVELS[plan.lvlIdx]?.name || "";
            const sep = "━━━━━━━━━━━━━━━━━━━━━━";
            const exLines = plan.exercises.map((e, i) => {
              const okLogsForEx = (logs[i] || []).filter((l) => l.ok);
              if (!okLogsForEx.length) return `- ${e.name}: 0 series`;
              const lastReps = okLogsForEx[okLogsForEx.length - 1].reps;
              const maxW = Math.max(...okLogsForEx.map((l) => l.weight));
              return maxW > 0
                ? `- ${e.name}: ${okLogsForEx.length}x${lastReps} — ${maxW}kg ✓`
                : `- ${e.name}: ${okLogsForEx.length}x${lastReps} ✓`;
            }).join("\n");
            const text = [
              sep, "⚡ F.A.S.E. — SESIÓN COMPLETADA", sep,
              `👤 ${name || ""} | ${hero.emoji} ${hero.name}`,
              `📅 ${dateStr} | ${timeStr}`,
              `🏋️ ${plan.discLabel} — ${plan.focusLabel || ""}`,
              `📊 Nivel: ${lvlName}`,
              `⏱ Duración: ${Math.round(sessionSecs / 60)} min`,
              sep, "💪 EJERCICIOS:", exLines, sep, "📈 RESUMEN:",
              `Series completadas: ${okSets}/${totalPlanned}`,
              `Volumen total: ${volume}kg`,
              `🔥 Racha actual: ${newStreak} días`,
              newRecord ? `🏆 NUEVO RÉCORD: ${newRecord.name} — ${newRecord.weight > 0 ? `${newRecord.weight}kg` : `${newRecord.reps} reps`}` : null,
              sep, "f-a-s-e.vercel.app",
            ].filter(Boolean).join("\n");
            try {
              await navigator.clipboard.writeText(text);
              setSummaryCopied(true);
              setTimeout(() => setSummaryCopied(false), 2500);
            } catch {
              /* portapapeles no disponible */
            }
          }}
          style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, animationDelay: "300ms" }}
        >
          📋 Copiar resumen
        </button>
        {summaryCopied && (
          <div style={{ position: "fixed", bottom: 24, left: 20, right: 20, zIndex: 300, display: "flex", justifyContent: "center" }}>
            <div className="card pop" style={{ padding: "10px 16px", background: C.card2 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>¡Resumen copiado! Compártelo donde quieras 📤</p>
            </div>
          </div>
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
        <RpeOverlay rpeFor={rpeFor} onPick={applyRpe} />
        {autoDefaultBadge && (
          <div className="pop" style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: C.card, border: `1px solid ${C.cyan}`, borderRadius: 99, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.cyan }}>
            {autoDefaultBadge}
          </div>
        )}
        <div
          style={{
            minHeight: "60vh", width: "100%", maxWidth: 430,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
          }}
        >
          <p style={{ color: C.mut, fontSize: 13, fontWeight: 800, letterSpacing: 4 }}>DESCANSO</p>
          <div style={{ position: "relative", width: 180, height: 180, marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
              <circle cx="90" cy="90" r="82" fill="none" stroke={C.border} strokeWidth="6" />
              <circle
                cx="90" cy="90" r="82" fill="none" stroke={restLeft <= 5 ? C.green : plan.discColor || C.cyan} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={2 * Math.PI * 82}
                strokeDashoffset={2 * Math.PI * 82 * (1 - restLeft / Math.max(1, ex.rest))}
                style={{ transition: "stroke-dashoffset 1s linear, stroke .3s" }}
              />
            </svg>
            <div
              style={{
                fontSize: 56, fontWeight: 900, lineHeight: 1,
                color: restLeft <= 5 ? C.green : C.text, transition: "color .3s",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {restLeft}
            </div>
          </div>
          <p style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>segundos</p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setRestLeft((r) => Math.max(0, r - 15))}
              style={{ padding: "8px 20px", borderRadius: 99, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 13, fontWeight: 700 }}
            >
              -15s
            </button>
            <button
              onClick={() => setRestLeft((r) => r + 15)}
              style={{ padding: "8px 20px", borderRadius: 99, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, fontSize: 13, fontWeight: 700 }}
            >
              +15s
            </button>
          </div>
          {plan.exercises[exIdx + 1] && (
            <p style={{ color: C.dim, fontSize: 12, marginTop: 12 }}>Siguiente: {plan.exercises[exIdx + 1].name}</p>
          )}
        </div>
        <div style={{ width: "100%", maxWidth: 430 }}>
          {(() => {
            const lastSet = logs[exIdx]?.[logs[exIdx].length - 1];
            const lastRpe = lastSet?.rpe;
            let tip;
            if (lastRpe != null && lastRpe >= 9) tip = "Descansa bien, fue duro 💪";
            else if (lastRpe != null && lastRpe <= 6) tip = "¿Peso muy ligero hoy? Considera subirlo";
            else {
              const cat = movementCategory(ex.name);
              if (cat === "empuje" || cat === "pecho") tip = "💡 Mantén los hombros hacia atrás y abajo en el press.";
              else if (cat === "tiron" || cat === "espalda") tip = "💡 Aprieta los omóplatos antes de jalar el peso.";
              else if (cat === "sentadilla" || cat === "piernas") tip = "💡 Rodillas alineadas con los pies, pecho arriba.";
              else if (ex.tag === "velocidad" || plan.discId === "atletismo") tip = "💡 Recupera con respiración profunda, no te sientes de golpe.";
              else tip = `💡 ${DAILY_TIPS[dayOfYear() % DAILY_TIPS.length]}`;
            }
            return tip ? (
              <div className="card" style={{ padding: "8px 12px", marginBottom: 8, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: C.mut }}>{tip}</p>
              </div>
            ) : null;
          })()}
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
  const showQuickBreath = exIdx === 0 && setNum === 0 && phase === "work" && !quickBreathDone && store.get("breathing_pref", true);
  return (
    <div className="screen session-rise" style={{ paddingBottom: 30, position: "relative" }}>
      {showQuickBreath && <QuickBreath onDone={() => setQuickBreathDone(true)} />}
      {showFullBreathing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260 }}>
          <BreathingScreen onDone={() => setShowFullBreathing(false)} voiceOn={voiceOn} />
        </div>
      )}
      <RpeOverlay rpeFor={rpeFor} onPick={applyRpe} />
        {autoDefaultBadge && (
          <div className="pop" style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: C.card, border: `1px solid ${C.cyan}`, borderRadius: 99, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.cyan }}>
            {autoDefaultBadge}
          </div>
        )}
      {showExitConfirm && (
        <div
          onClick={() => setShowExitConfirm(false)}
          style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "100%", maxWidth: 430, textAlign: "center", padding: "20px 20px calc(40px + env(safe-area-inset-bottom))", borderRadius: "20px 20px 0 0", animation: "sheetUp 0.3s ease-out" }}
          >
            <p style={{ fontSize: 16, fontWeight: 800 }}>¿Salir de la sesión?</p>
            <p style={{ fontSize: 13, color: C.mut, marginTop: 6 }}>
              Llevas {completedSetCount} {completedSetCount === 1 ? "serie" : "series"} y {completedExCount} {completedExCount === 1 ? "ejercicio completado" : "ejercicios completados"}.
              {completedExCount < 3 ? " El progreso de esta sesión se perderá." : ""}
            </p>
            <button
              className="btn-xl" onClick={() => setShowExitConfirm(false)} aria-label="Continuar entrenando"
              style={{ marginTop: 16, minHeight: 56, background: C.green, color: "#07070C" }}
            >
              Continuar entrenando
            </button>
            {completedExCount >= 3 && (
              <button
                className="btn-xl" onClick={saveAndExit} aria-label="Guardar y salir"
                style={{ marginTop: 10, minHeight: 48, background: C.cyan, color: "#07070C", fontSize: 14 }}
              >
                Guardar y salir
              </button>
            )}
            <button
              onClick={onClose} aria-label="Salir sin guardar"
              style={{ marginTop: 12, minHeight: 44, color: C.red, fontSize: 13, fontWeight: 700 }}
            >
              Salir sin guardar
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
      {showGoalBanner && goalContextCopy() && (
        <div className="card unlock-pop" style={{ position: "fixed", top: 70, left: 12, right: 12, zIndex: 100, textAlign: "center", padding: 14, borderColor: `${plan.discColor || C.cyan}66` }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: plan.discColor || C.cyan }}>{goalContextCopy()}</p>
        </div>
      )}
      {justWarmedUp && (
        <div className="card unlock-pop" style={{ position: "fixed", top: 70, left: 12, right: 12, zIndex: 100, textAlign: "center", padding: 14, borderColor: `${plan.discColor || C.cyan}66` }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: plan.discColor || C.cyan }}>
            ¡Listo! Cuerpo preparado 🔥 — Empezando {plan.discLabel}
          </p>
        </div>
      )}
      {store.get("deload_active", null) && (
        <div style={{ textAlign: "center", padding: "6px 0", fontSize: 11, fontWeight: 700, color: C.yellow }}>
          🔄 Semana de deload — peso ligero, técnica perfecta
        </div>
      )}
      {/* Header mínimo: Salir — Disciplina·Nivel — Tiempo. Todo lo demás vive detrás de "⋯" */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 48 }}>
        <button onClick={quit} style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>✕ Salir</button>
        <span style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>
          {plan.discIcon} {plan.discLabel} · {lvl.emoji} {lvl.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: sessionSecs > 5400 ? C.orange : C.text, fontVariantNumeric: "tabular-nums" }}>
            ⏱ {String(Math.floor(sessionSecs / 60)).padStart(2, "0")}:{String(sessionSecs % 60).padStart(2, "0")}
          </span>
          <button onClick={() => setShowExtras((v) => !v)} aria-label="Más opciones" style={{ fontSize: 16, minWidth: 44, minHeight: 44, color: C.dim }}>⋯</button>
        </div>
      </div>

      {showExtras && (
        <div className="card fade-up" style={{ marginTop: 6, padding: "10px 12px" }}>
          {(() => {
            const wk = !store.get("deload_active", null) ? getPlanWeekNumber() : null;
            if (!wk || wk > 12) return null;
            const ph = PERIODIZATION[getPlanPhase(wk)];
            return (
              <p style={{ fontSize: 11, fontWeight: 700, color: ph.color, marginBottom: 8 }}>
                Semana de {PERIODIZATION_LABELS[getPlanPhase(wk)].toLowerCase()}: {ph.focus}
              </p>
            );
          })()}
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <button onClick={() => setShowQuickNote((v) => !v)} aria-label="Nota rápida" style={{ fontSize: 18, padding: 4 }}>📝</button>
            <button onClick={() => setShowFullBreathing(true)} aria-label="Respiración guiada" style={{ fontSize: 18, padding: 4 }}>🫁</button>
          </div>
          {showQuickNote && (
            <div style={{ marginTop: 10 }}>
              <textarea
                className="input" rows={2} maxLength={300} placeholder="Apunta algo rápido de esta sesión..."
                value={quickNote} onChange={(e) => setQuickNote(e.target.value)}
                style={{ resize: "none" }}
              />
              <button onClick={() => setShowQuickNote(false)} style={{ marginTop: 6, fontSize: 11, color: C.cyan, fontWeight: 700 }}>
                Listo
              </button>
            </div>
          )}
          {prevTotals && (() => {
            const curSets = logs.flat().filter((s) => s.ok).length;
            const diff = curSets - prevTotals.sets;
            return (
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: C.mut }}>vs tu mejor sesión anterior de {plan.discLabel}: </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: diff >= 0 ? C.green : C.orange }}>
                  {diff >= 0 ? `Vas +${diff} series adelante 🔥` : `Vas ${diff} series atrás ⚠️ — dale!`}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Progreso de la sesión: ícono por tipo de ejercicio */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, justifyContent: "space-between" }}>
        {plan.exercises.map((e, i) => (
          <div
            key={i}
            style={{
              fontSize: i === exIdx ? 18 : 13,
              opacity: i < exIdx ? 1 : i === exIdx ? 1 : 0.4,
              filter: i < exIdx ? "grayscale(0)" : "grayscale(0.5)",
              transition: "all 0.3s ease",
              position: "relative",
            }}
          >
            {exerciseTypeIcon(e.name)}
            {i < exIdx && (
              <span style={{ position: "absolute", top: -4, right: -4, fontSize: 7, background: C.green, borderRadius: "50%", width: 10, height: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>✓</span>
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
        {estMinutesLeft !== null ? `~${estMinutesLeft} min restantes` : `Ejercicio ${exIdx + 1} de ${plan.exercises.length}`}
        {(() => {
          const nextEx = plan.exercises[exIdx + 1];
          if (!nextEx) return null;
          const label = MUSCLE_GROUP_LABELS[nextEx.tag] || MUSCLE_GROUP_LABELS[movementCategory(nextEx.name)];
          return label ? ` · Siguiente: ${label}` : null;
        })()}
      </p>

      <div
        className={`card exercise-card-${slideState}`}
        key={exIdx}
        style={{
          marginTop: 10, borderLeft: `4px solid ${plan.discColor}`,
          boxShadow: flashDone ? `0 0 0 2px ${C.green}` : "none",
          transition: slideState === "visible" ? "box-shadow .3s ease, transform 0.2s ease-out, opacity 0.2s ease-out" : undefined,
        }}
        onTouchStart={(e) => { touchYRef.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (touchYRef.current === null || phase !== "work" || ex.type === "tiempo") return;
          const dy = e.changedTouches[0].clientY - touchYRef.current;
          touchYRef.current = null;
          if (dy < -120) attemptComplete();
          else if (dy > 120) logSet(false);
        }}
      >
        {ex.superset && (
          <span style={{ display: "inline-block", marginTop: 10, fontSize: 10, fontWeight: 800, color: "#07070C", background: ex.superset === "giant" ? C.purple : C.cyan, padding: "3px 10px", borderRadius: 99 }}>
            {ex.superset === "giant" ? "⚡ GIANT SET" : `🔄 SUPERSET ${ex.superset}`}
          </span>
        )}
        <ExerciseDemo exerciseName={ex.name} tip={ex.tip} desc={ex.desc} />
        <h2 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.25, marginTop: 12 }}>{ex.name}</h2>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          <span style={{ color: plan.discColor, fontWeight: 800 }}>{ex.sets} series</span>
          <span style={{ color: C.mut }}> × </span>
          <span style={{ fontWeight: 800 }}>{ex.reps}</span>
          {ex.intensity && (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: C.mut, background: C.surface, padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.border}` }}>
              {ex.intensity}
            </span>
          )}
          {ex.scheme && ex.scheme !== "standard" && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: plan.discColor, background: `${plan.discColor}18`, padding: "2px 8px", borderRadius: 99, border: `1px solid ${plan.discColor}44` }}>
              {SCHEMES[ex.scheme].name}
            </span>
          )}
        </p>
        {ex.scheme && ex.scheme !== "standard" && (
          <p style={{ marginTop: 4, fontSize: 11, color: C.dim }}>{SCHEMES[ex.scheme].desc}</p>
        )}
        <p style={{ marginTop: 10, fontSize: 13, color: C.mut, lineHeight: 1.5 }}>
          <button onClick={() => setShowGuide(true)} style={{ display: "inline", color: EXERCISE_GUIDES[ex.name] ? C.cyan : C.mut, fontWeight: EXERCISE_GUIDES[ex.name] ? 800 : 400 }}>💡</button>{" "}
          {ex.tip}
        </p>
        {showGuide && <TechniqueGuideSheet exerciseName={ex.name} tip={ex.tip} onClose={() => setShowGuide(false)} />}
        <button onClick={() => setShowExerciseHistory(true)} style={{ marginTop: 4, color: C.dim, fontSize: 12, fontWeight: 700 }}>
          📈 Ver historial →
        </button>
        {showExerciseHistory && (
          <div
            onClick={() => setShowExerciseHistory(false)}
            style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{ width: "100%", maxWidth: 430, maxHeight: "70vh", overflowY: "auto", padding: 20, borderRadius: "20px 20px 0 0" }}
            >
              <p style={{ fontSize: 15, fontWeight: 800 }}>{ex.name}</p>
              {(() => {
                const hist = exerciseHistory(sessions, ex.name).rows.slice(-5).reverse();
                if (!hist.length) {
                  return <p style={{ fontSize: 12, color: C.mut, marginTop: 10 }}>Todavía no tienes historial de este ejercicio.</p>;
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                    {hist.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: i < hist.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <span style={{ color: C.mut }}>{timeAgo(r.ts)}</span>
                        <span style={{ fontWeight: 700 }}>{r.weight > 0 ? `${r.weight}kg` : "—"}</span>
                        <span style={{ fontWeight: 700 }}>{r.reps} reps</span>
                        <span style={{ color: C.green, fontWeight: 800 }}>✓</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <button
                className="btn-xl" onClick={() => setShowExerciseHistory(false)}
                style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
        {(() => {
          const warnMsg = exerciseHealthWarning(ex.name, store.get("health_issues", []));
          return warnMsg ? (
            <p style={{ marginTop: 6, fontSize: 11, color: C.yellow, fontWeight: 700 }}>⚠️ {warnMsg}</p>
          ) : null;
        })()}
        {ex.type === "peso" && progression && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              {progression.weight !== null ? (
                <>
                  <span style={{ fontSize: 11, color: C.cyan, fontWeight: 700 }}>HOY → </span>
                  <span style={{
                    fontSize: 20, fontWeight: 900,
                    color: progression.trend === "up" ? C.green : progression.trend === "down" ? C.orange : C.cyan,
                  }}>
                    {progression.weight}kg
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>🌱 Primera vez — registra tu marca inicial</span>
              )}
              <p style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{progression.message}</p>
              {lastSessionSets && (
                <p style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>Última vez: {lastSessionSets}</p>
              )}
            </div>
            {exPR && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "#FFD700", fontWeight: 800 }}>📈 PR: {exPR.weight > 0 ? `${exPR.weight}kg` : `${exPR.reps} reps`}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Series completadas */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {Array.from({ length: ex.sets }).map((_, i) => {
          const log = doneSets[i];
          const isJustCompleted = justCompletedSet === i;
          const isNextActive = i === setNum && phase === "work" && log === undefined;
          const editable = log && log.ok;
          return (
            <button
              key={i}
              onClick={() => editable && setEditingSet({ exIdx, setIdx: i })}
              disabled={!editable}
              style={{
                minWidth: 48, minHeight: 48, padding: "5px 8px", borderRadius: 11, textAlign: "center",
                display: "flex", flexDirection: "column", justifyContent: "center",
                background: log ? (log.ok ? "rgba(34,255,136,0.10)" : "rgba(255,59,92,0.10)") : i === setNum && phase === "work" ? C.card2 : C.surface,
                border: `1px solid ${editingSet?.exIdx === exIdx && editingSet?.setIdx === i ? C.cyan : log ? (log.ok ? "rgba(34,255,136,0.4)" : "rgba(255,59,92,0.4)") : i === setNum && phase === "work" ? plan.discColor : C.border}`,
                animation: isJustCompleted ? "setPulse 0.3s ease" : isNextActive ? "nextSetPulse 1.2s ease infinite" : "none",
              }}
            >
              <div style={{ fontSize: 11, color: C.dim }}>
                S{i + 1}
                {(ex.scheme === "pyramid" || ex.scheme === "reverse_pyramid") && SCHEMES[ex.scheme].repsPerSet[i] && (
                  <span>({SCHEMES[ex.scheme].repsPerSet[i]})</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: log ? (log.ok ? C.green : C.red) : C.mut }}>
                {log ? (log.ok ? `${log.reps || "✓"}` : "✗") : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {editingSet?.exIdx === exIdx && logs[editingSet.exIdx][editingSet.setIdx] && (
        <div style={{ marginTop: 8, padding: "10px 12px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginBottom: 8 }}>
            Editar S{editingSet.setIdx + 1}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {ex.type === "peso" && (
              <input
                type="number"
                defaultValue={logs[editingSet.exIdx][editingSet.setIdx].weight}
                onChange={(e) => {
                  const w = parseFloat(e.target.value) || 0;
                  setLogs((prev) => {
                    const next = prev.map((arr) => [...arr]);
                    next[editingSet.exIdx][editingSet.setIdx] = { ...next[editingSet.exIdx][editingSet.setIdx], weight: w };
                    return next;
                  });
                }}
                style={{ flex: 1, padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 16, textAlign: "center" }}
                placeholder="kg"
              />
            )}
            <input
              type="number"
              defaultValue={logs[editingSet.exIdx][editingSet.setIdx].reps}
              onChange={(e) => {
                const r = parseInt(e.target.value, 10) || 0;
                setLogs((prev) => {
                  const next = prev.map((arr) => [...arr]);
                  next[editingSet.exIdx][editingSet.setIdx] = { ...next[editingSet.exIdx][editingSet.setIdx], reps: r };
                  return next;
                });
              }}
              style={{ flex: 1, padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 16, textAlign: "center" }}
              placeholder="reps"
            />
          </div>
          <button
            onClick={() => setEditingSet(null)}
            style={{ marginTop: 8, fontSize: 12, color: C.cyan, fontWeight: 700 }}
          >
            ✓ Guardar
          </button>
        </div>
      )}

      {setBadge && (
        <div className="set-badge-pop" style={{ textAlign: "center", marginTop: 10 }}>
          <span style={{
            display: "inline-block", padding: "8px 16px", borderRadius: 99, fontWeight: 900, fontSize: 13,
            background: setBadge.color, color: setBadge.color === "#FFD700" ? "#07070C" : "#07070C",
          }}>
            {setBadge.text}
          </span>
        </div>
      )}

      {showLastSets && (
        <div className="set-badge-pop" style={{ textAlign: "center", marginTop: 10 }}>
          <span style={{
            display: "inline-block", padding: "8px 16px", borderRadius: 99, fontWeight: 900, fontSize: 13,
            background: C.orange, color: "#07070C",
          }}>
            💪 Últimas 3 series
          </span>
        </div>
      )}

      {showActivation ? (
        <div className="card fade-up" style={{ marginTop: 14, borderColor: `${C.yellow}55` }}>
          <span style={{
            display: "inline-block", fontSize: 10, fontWeight: 800, color: "#07070C", background: C.yellow,
            padding: "3px 9px", borderRadius: 99,
          }}>
            ⚡ Series de activación (no cuentan en el registro)
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {activationSets.map((w, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: i < activationSets.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ color: C.mut }}>{w.label}</span>
                <span style={{ fontWeight: 800 }}>{Math.round(workWeight * w.pct * 4) / 4}kg × {w.reps}</span>
              </div>
            ))}
          </div>
          <button
            className="btn-xl"
            onClick={() => setActivationDone((prev) => ({ ...prev, [exIdx]: true }))}
            style={{ marginTop: 12, background: C.yellow, color: "#07070C", fontSize: 13 }}
          >
            ✓ Completé la activación
          </button>
          <button
            onClick={() => setActivationDone((prev) => ({ ...prev, [exIdx]: true }))}
            style={{ marginTop: 8, fontSize: 11, color: C.mut, fontWeight: 700 }}
          >
            Saltar activación
          </button>
        </div>
      ) : phase === "work" && ex.type === "tiempo" ? (
        <>
          <Stopwatch
            key={`${exIdx}-${setNum}`}
            target={parseTargetSeconds(ex.reps)}
            onStop={(secs) => logSet(true, secs)}
          />
          <button
            className="btn-xl"
            onClick={() => logSet(false, 0)}
            style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, minHeight: 52, fontSize: 15 }}
          >
            No pude 😤
          </button>
        </>
      ) : phase === "work" ? (
        <>
          {ex.type === "peso" && (
            <div style={{
              display: "flex", gap: 0, border: `1px solid ${C.border}`, borderRadius: 8,
              overflow: "hidden", width: "fit-content", margin: "16px auto 0",
            }}>
              {["kg", "lbs"].map((unit) => (
                <button
                  key={unit}
                  onClick={() => {
                    if (weight !== "") {
                      const val = parseFloat(weight);
                      if (!isNaN(val)) {
                        const converted = unit === "lbs" ? Math.round(val * 2.205 * 4) / 4 : Math.round((val / 2.205) * 4) / 4;
                        setWeight(String(converted));
                      }
                    }
                    setWeightUnit(unit);
                    store.set("weight_unit", unit);
                  }}
                  style={{
                    padding: "4px 12px", fontSize: 11, fontWeight: 700,
                    background: weightUnit === unit ? C.cyan : "transparent",
                    color: weightUnit === unit ? "#07070C" : C.mut,
                    border: "none", cursor: "pointer",
                  }}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: ex.type === "peso" ? 6 : 16 }}>
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
                <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>PESO ({weightUnit.toUpperCase()})</div>
                <div style={{
                  fontSize: 38, fontWeight: 900, marginTop: 2, fontVariantNumeric: "tabular-nums",
                  color: weight === "" ? C.dim : C.text,
                }}>
                  {weight !== "" ? weight : sug ? (weightUnit === "lbs" ? Math.round(sug.weight * 2.205 * 4) / 4 : sug.weight) : "kg"}
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
              {sug ? sug.reason : "🌱 Primera vez — empieza con un peso cómodo"}
            </p>
          )}
          {ex.type === "peso" && isUnilateral(ex.name) && (
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: C.blue, fontWeight: 700 }}>IZQ (KG)</label>
                <input className="input" type="number" value={leftW} onChange={(e) => setLeftW(e.target.value)} style={{ borderColor: C.blue, padding: 10, fontSize: 16, textAlign: "center" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: C.orange, fontWeight: 700 }}>DER (KG)</label>
                <input className="input" type="number" value={rightW} onChange={(e) => setRightW(e.target.value)} style={{ borderColor: C.orange, padding: 10, fontSize: 16, textAlign: "center" }} />
              </div>
            </div>
          )}
          <NumPad onKey={pressKey} />
          <div style={{ position: "relative" }}>
            {showXpBadge && (
              <span
                style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  fontSize: 14, fontWeight: 900, color: C.green, pointerEvents: "none",
                  animation: "xpFloat 0.8s ease-out forwards", zIndex: 5,
                }}
              >
                ✓ +10 XP
              </span>
            )}
            <button
              className="btn-xl btn-physics"
              onClick={attemptComplete}
              style={{ marginTop: 14, background: idleWarning ? C.red : plan.discColor, color: idleWarning ? "#fff" : "#07070C", minHeight: 64, fontSize: 18 }}
            >
              {idleWarning ? "⏰ ¿Sigues ahí? Completa la serie" : "✓ SERIE COMPLETADA"}
            </button>
          </div>
          <button
            className="btn-xl"
            onClick={() => logSet(false)}
            style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.mut, minHeight: 52, fontSize: 15 }}
          >
            No pude 😤
          </button>
        </>
      ) : (
        <>
          {showExDoneToast && (
            <div
              className="pop"
              style={{
                position: "fixed", top: "40%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 300,
                background: C.card, border: `1px solid ${C.green}`, borderRadius: 14, padding: "14px 22px",
                fontSize: 16, fontWeight: 800, color: C.green, textAlign: "center",
              }}
            >
              ✓ Ejercicio completado
            </div>
          )}
          <div className="card fade-up" style={{ marginTop: 16, textAlign: "left" }}>
            <p style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>¿Cómo estuvo la técnica?</p>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[
                { id: "perfecta", emoji: "✅", color: C.green },
                { id: "bien", emoji: "⚡", color: C.cyan },
                { id: "regular", emoji: "⚠️", color: C.yellow },
                { id: "mal", emoji: "❌", color: C.red },
              ].map((t) => (
                <button
                  key={t.id} onClick={() => rateTechnique(ex.name, exIdx, t.id)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 20,
                    background: lastTechButtonId[exIdx] === t.id ? `${t.color}33` : C.surface,
                    border: `1px solid ${lastTechButtonId[exIdx] === t.id ? t.color : C.border}`,
                  }}
                >
                  {t.emoji}
                </button>
              ))}
            </div>
            {(lastTechButtonId[exIdx] === "mal" || lastTechButtonId[exIdx] === "regular") && (
              <div style={{ marginTop: 10 }}>
                {ex.tip && <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.4 }}>💡 {ex.tip}</p>}
                <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>¿Que este ejercicio aparezca con peso más bajo la próxima vez?</p>
                <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                  <button onClick={() => store.set(`reduce_${ex.name}`, true)} style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Sí</button>
                  <button onClick={() => store.set(`reduce_${ex.name}`, false)} style={{ fontSize: 12, color: C.dim }}>No</button>
                </div>
              </div>
            )}
          </div>
          <button
            className="btn-xl pop"
            onClick={nextExercise}
            style={{
              marginTop: 12, background: `linear-gradient(90deg, ${C.green}, #00CC66)`, color: "#07070C",
              boxShadow: "0 8px 30px rgba(34,255,136,0.3)",
            }}
          >
            {isLastEx ? "FINALIZAR ENTRENAMIENTO 🏁" : "SIGUIENTE EJERCICIO →"}
          </button>
        </>
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
// eslint-disable-next-line no-unused-vars -- ya no tiene acceso desde Progreso; se deja el componente sin eliminar
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

/* ─── Configuración ─── */
function SettingsToggle({ on, onClick, "aria-label": ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={on}
      style={{
        width: 44, height: 26, borderRadius: 99, position: "relative", flexShrink: 0,
        background: on ? C.cyan : C.surface, border: `1px solid ${on ? C.cyan : C.border}`,
        transition: "background .2s ease, border-color .2s ease",
      }}
    >
      <span
        style={{
          position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%",
          background: on ? "#07070C" : C.dim, transition: "left .2s ease",
        }}
      />
    </button>
  );
}

function SettingsRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}>
      <span style={{ fontSize: 13, color: C.text }}>{label}</span>
      {children}
    </div>
  );
}

/* ─── Sección colapsable de Configuración ─── */
function AccordionSection({ icon, title, defaultOpen = false, children, danger = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: open ? 12 : 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", color: danger ? C.red : C.text }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>{icon} {title}</span>
        <span style={{ fontSize: 18, color: C.dim, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }}>›</span>
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
    </div>
  );
}

/* ─── Bottom sheet que envuelve la Configuración ─── */
function SettingsSheet({ visible, onClose, children }) {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 430, maxHeight: "90vh", margin: "0 auto", background: C.card,
          borderRadius: "20px 20px 0 0", overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)",
          animation: "sheetUp 0.3s ease-out",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border, margin: "12px auto 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 8px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>⚙️ Configuración</h2>
          <button onClick={onClose} aria-label="Cerrar configuración" style={{ fontSize: 22, color: C.mut, padding: "4px 8px", minHeight: 44 }}>×</button>
        </div>
        <div style={{ padding: "0 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function SettingsScreen({
  name, onRename, mode, onSetMode,
  noEquipment, onToggleEquipment,
  voiceOn, onToggleVoice, darkMode, onToggleDarkMode,
  installPrompt, appInstalled, onInstallApp,
  sessions, onCleanOld, onWipeAll, onShowSummary, showConfirm,
}) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const [profile, setProfile] = useState(() => store.get("profile", {}));
  const [height, setHeight] = useState(() => store.get("height", ""));
  const [vibrationOn, setVibrationOn] = useState(() => store.get("vibration_on", true));
  const [breathingPref, setBreathingPref] = useState(() => store.get("breathing_pref", true));
  const [showTrainModePicker, setShowTrainModePicker] = useState(false);
  const [reminderOn, setReminderOn] = useState(() => store.get("reminder_enabled", false));
  const [reminderHour, setReminderHour] = useState(() => store.get("reminder_hour", 17));
  const [nameInput, setNameInput] = useState(name);
  const [wipeStep, setWipeStep] = useState(0);
  const [wipeText, setWipeText] = useState("");
  const fileRef = useRef(null);
  const weightLog = getWeightLog();
  const currentWeight = weightLog.length ? weightLog[weightLog.length - 1].weight : null;
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isValidBackup(parsed)) throw new Error("formato inválido");
        showConfirm({
          title: "¿Restaurar backup?",
          message: "Esto reemplazará todos tus datos actuales.",
          confirmLabel: "Sí, restaurar",
          confirmColor: C.orange,
          onConfirm: () => { applyBackup(parsed); window.location.reload(); },
        });
      } catch {
        showToast("Archivo de backup inválido o corrupto.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <AccordionSection icon="🎯" title="Mi entrenamiento" defaultOpen>
      <div className="card" style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>MODO DE ENTRENAMIENTO</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {TRAIN_MODES.find((m) => m.id === store.get("train_mode", "manual"))?.emoji || "🎯"}{" "}
            {TRAIN_MODES.find((m) => m.id === store.get("train_mode", "manual"))?.name || "Yo decido"}
          </span>
          <button onClick={() => setShowTrainModePicker(true)} style={{ fontSize: 12, fontWeight: 800, color: C.cyan }}>Cambiar</button>
        </div>
      </div>
      {showTrainModePicker && (
        <div
          onClick={() => setShowTrainModePicker(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card" style={{ width: "100%", maxWidth: 430, padding: "20px 20px calc(20px + env(safe-area-inset-bottom))", borderRadius: "20px 20px 0 0" }}
          >
            <p style={{ fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>¿Cómo prefieres entrenar?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TRAIN_MODES.map((m) => (
                <button
                  key={m.id} className="card"
                  onClick={() => { store.set("train_mode", m.id); setShowTrainModePicker(false); refresh(); }}
                  style={{ textAlign: "left", padding: 14, border: store.get("train_mode", "manual") === m.id ? `2px solid ${C.cyan}` : undefined }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{m.name}</span>
                  </div>
                  <p style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        onClick={onShowSummary}
        style={{ width: "100%", padding: "14px 16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontWeight: 700, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}
      >
        <span>📊 Ver mi resumen personalizado</span>
        <span style={{ color: C.dim }}>›</span>
      </button>
      <div className="card">
        <p style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>OBJETIVO DE ENTRENAMIENTO</p>
        <p style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Toca una opción para actualizarlo cuando quieras.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          {TRAINING_GOALS.map((g) => {
            const active = store.get("training_goal", null) === g.id;
            return (
              <button
                key={g.id}
                className="card"
                onClick={() => { store.set("training_goal", active ? null : g.id); refresh(); }}
                style={{ textAlign: "left", padding: "10px 10px", border: `1px solid ${active ? g.color : C.border}`, background: active ? `${g.color}18` : C.card }}
              >
                <div style={{ fontSize: 20 }}>{g.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4, color: active ? g.color : C.text }}>{g.name}</div>
                <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{g.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        {(() => {
          const discIds = ["gimnasio", "calistenia", "futbolGym", "atletismo", "basquetCancha"];
          const discLabels = { gimnasio: "Gimnasio", calistenia: "Calistenia", futbolGym: "Fútbol", atletismo: "Atletismo", basquetCancha: "Básquetbol" };
          const counts = {};
          sessions.forEach((s) => { if (s.kind === "entreno") counts[s.disc] = (counts[s.disc] || 0) + 1; });
          const favDisc = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          const defaultMethod = store.get("default_methodology", "standard");
          const methods = [
            { id: "standard", label: "Estándar" },
            { id: "heavyduty", label: "Heavy Duty" },
            { id: "gvt", label: "GVT" },
            { id: "dup", label: "DUP" },
          ];
          return (
            <>
              {favDisc && (
                <p style={{ fontSize: 12, color: C.mut }}>Tu disciplina más frecuente: <b style={{ color: C.text }}>{discLabels[favDisc] || favDisc}</b></p>
              )}
              <p style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginTop: 10 }}>METODOLOGÍA POR DEFECTO (GIMNASIO)</p>
              <div className="chip-wrap" style={{ marginTop: 6 }}>
                {methods.map((m) => (
                  <button
                    key={m.id}
                    className={`chip ${defaultMethod === m.id ? "on" : ""}`}
                    style={defaultMethod === m.id ? { background: C.cyan } : {}}
                    onClick={() => { store.set("default_methodology", m.id); refresh(); }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginTop: 14 }}>NIVEL POR DISCIPLINA</p>
              <div style={{ marginTop: 6 }}>
                {discIds.map((id) => {
                  const discSessions = sessions.filter((s) => s.kind === "entreno" && s.disc === id);
                  if (!discSessions.length) return null;
                  const lvl = LEVELS[mostFrequentLevel(discSessions)];
                  return (
                    <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                      <span style={{ color: C.mut }}>{discLabels[id]}</span>
                      <span style={{ color: lvl.color, fontWeight: 700 }}>{lvl.emoji} {lvl.name}</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Se actualizan automáticamente según tu historial.</p>
            </>
          );
        })()}
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <p style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>⚽ DÍA DE PARTIDO SEMANAL</p>
        <p style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>La app ajusta tu carga automáticamente (tapering) según cuánto falte.</p>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => {
            const active = store.get("match_day", null) === i;
            return (
              <button
                key={d}
                className={`chip ${active ? "on" : ""}`}
                style={active ? { background: C.cyan } : {}}
                onClick={() => { store.set("match_day", active ? null : i); refresh(); }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      </AccordionSection>

      <AccordionSection icon="👤" title="Mi perfil">
      <div className="card">
        <label style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>NOMBRE</label>
        <input className="input" value={nameInput} maxLength={24} onChange={(e) => setNameInput(e.target.value)} style={{ marginTop: 4 }} />
        <button
          className="btn-xl" onClick={() => onRename(nameInput)} disabled={!nameInput.trim()}
          style={{ marginTop: 8, background: C.cyan, color: "#07070C", fontSize: 12 }}
        >
          Guardar nombre
        </button>

        <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginTop: 14, display: "block" }}>OBJETIVO PRINCIPAL</label>
        <div className="chip-wrap" style={{ marginTop: 6 }}>
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g.id} className={`chip ${profile.goal === g.id ? "on" : ""}`}
              onClick={() => { const next = { ...profile, goal: g.id }; setProfile(next); store.set("profile", next); }}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        <SettingsRow label="Peso corporal actual">
          <span style={{ fontSize: 13, fontWeight: 700 }}>{currentWeight ? `${currentWeight} kg` : "—"}</span>
        </SettingsRow>
        <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginTop: 6, display: "block" }}>ALTURA (CM)</label>
        <input
          className="input" type="number" value={height}
          onChange={(e) => { setHeight(e.target.value); store.set("height", e.target.value); }}
          style={{ marginTop: 4 }}
        />
      </div>
      </AccordionSection>

      <AccordionSection icon="⚡" title="Preferencias de sesión">
      <div className="card">
        <SettingsRow label={darkMode ? "🌙 Modo oscuro" : "☀️ Modo claro"}>
          <SettingsToggle on={darkMode} onClick={onToggleDarkMode} aria-label="Alternar modo oscuro/claro" />
        </SettingsRow>
        <SettingsRow label="Modo Control Total (sin gamificación)">
          <SettingsToggle on={mode === "pro"} onClick={() => onSetMode(mode === "pro" ? "guiado" : "pro")} aria-label="Alternar modo control total" />
        </SettingsRow>
        <SettingsRow label="Voz en sesiones 🔊">
          <SettingsToggle on={voiceOn} onClick={onToggleVoice} aria-label="Alternar voz en sesiones" />
        </SettingsRow>
        <SettingsRow label="Vibración 📳">
          <SettingsToggle
            on={vibrationOn} aria-label="Alternar vibración"
            onClick={() => { const n = !vibrationOn; setVibrationOn(n); store.set("vibration_on", n); }}
          />
        </SettingsRow>
        <SettingsRow label="Modo sin equipo 🎒">
          <SettingsToggle on={noEquipment} onClick={onToggleEquipment} aria-label="Alternar modo sin equipo" />
        </SettingsRow>
        <SettingsRow label="Respiración pre-sesión 🫁">
          <SettingsToggle
            on={breathingPref} aria-label="Alternar respiración pre-sesión"
            onClick={() => { const n = !breathingPref; setBreathingPref(n); store.set("breathing_pref", n); }}
          />
        </SettingsRow>
        <SettingsRow label="Superseries automáticas">
          <SettingsToggle
            on={store.get("supersets_enabled", false)}
            aria-label="Alternar superseries automáticas"
            onClick={() => { store.set("supersets_enabled", !store.get("supersets_enabled", false)); refresh(); }}
          />
        </SettingsRow>
        <p style={{ fontSize: 11, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>
          Agrupa ejercicios antagonistas claros (ej. press/jalón) sin descanso entre ellos. Solo aplica desde nivel Campeón.
        </p>
      </div>
      </AccordionSection>

      <AccordionSection icon="🔔" title="Recordatorios">
      <div className="card">
        <SettingsRow label="Recordatorio (mientras la app está abierta)">
          <SettingsToggle
            on={reminderOn} aria-label="Alternar recordatorio diario"
            onClick={async () => {
              const next = !reminderOn;
              if (next && window.Notification) {
                try { await Notification.requestPermission(); } catch { /* no disponible */ }
              }
              setReminderOn(next);
              store.set("reminder_enabled", next);
            }}
          />
        </SettingsRow>
        <p style={{ fontSize: 10, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>
          Las notificaciones en segundo plano requieren un servidor. Por ahora solo funcionan si tienes la app abierta a la hora elegida.
        </p>
        {reminderOn && (
          <div className="chip-wrap" style={{ marginTop: 6 }}>
            {[6, 7, 8, 9, 17, 18, 19, 20, 21].map((h) => (
              <button
                key={h} className={`chip ${reminderHour === h ? "on" : ""}`}
                onClick={() => { setReminderHour(h); store.set("reminder_hour", h); }}
              >
                {h}:00
              </button>
            ))}
          </div>
        )}
      </div>
      </AccordionSection>

      {installPrompt && !appInstalled && (
        <div className="card" style={{ marginTop: 10 }}>
          <SettingsRow label="Instalar F.A.S.E. en tu dispositivo 📲">
            <button
              onClick={onInstallApp}
              style={{ background: C.cyan, color: "#07070C", fontSize: 12, fontWeight: 800, padding: "6px 14px", borderRadius: 99 }}
            >
              Instalar
            </button>
          </SettingsRow>
        </div>
      )}

      <AccordionSection icon="📊" title="Plan de 12 semanas">
      <div className="card">
        <SettingsRow label="Periodización de 12 semanas">
          <SettingsToggle
            on={!!store.get("plan_start", null)}
            aria-label="Alternar plan de 12 semanas"
            onClick={() => {
              if (store.get("plan_start", null)) {
                showConfirm({
                  title: "¿Desactivar el plan de 12 semanas?",
                  confirmLabel: "Desactivar",
                  confirmColor: C.orange,
                  onConfirm: () => { store.set("plan_start", null); refresh(); },
                });
              } else {
                store.set("plan_start", new Date().toISOString());
                store.set("plan_last_phase", null);
                refresh();
              }
            }}
          />
        </SettingsRow>
        <p style={{ fontSize: 11, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>
          Ajusta automáticamente series y descansos en 4 fases (base, acumulación, intensificación, deload) durante 12 semanas.
        </p>
      </div>
      </AccordionSection>

      <AccordionSection icon="💾" title="Datos y backup">
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn-xl" onClick={() => exportCSV(sessions)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12 }}>
          📥 Exportar todo (CSV)
        </button>
        <button className="btn-xl" onClick={downloadBackupFile} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12 }}>
          💾 Crear backup completo
        </button>
        <button className="btn-xl" onClick={() => fileRef.current?.click()} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12 }}>
          📂 Restaurar backup
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={handleRestoreFile} style={{ display: "none" }} />
      </div>
      </AccordionSection>

      <AccordionSection icon="☠️" title="Zona de peligro" danger>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8, borderColor: `${C.red}55` }}>
        <button
          className="btn-xl"
          onClick={() => showConfirm({
            title: "¿Limpiar historial antiguo?",
            message: "Se eliminarán sesiones de más de 6 meses.",
            confirmLabel: "Limpiar",
            confirmColor: C.red,
            onConfirm: onCleanOld,
          })}
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.red, fontSize: 12 }}
        >
          🗑️ Limpiar sesiones antiguas (+6 meses)
        </button>

        {wipeStep === 0 && (
          <button
            className="btn-xl" onClick={() => setWipeStep(1)}
            style={{ background: "rgba(255,59,92,0.12)", border: `1px solid ${C.red}`, color: C.red, fontSize: 12 }}
          >
            ☠️ Borrar todos mis datos
          </button>
        )}
        {wipeStep === 1 && (
          <div className="card" style={{ borderColor: C.red }}>
            <p style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>¿Estás seguro? Perderás todo tu progreso.</p>
            <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
              <button onClick={() => setWipeStep(0)} style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>Cancelar</button>
              <button onClick={() => setWipeStep(2)} style={{ fontSize: 12, color: C.red, fontWeight: 800 }}>Continuar</button>
            </div>
          </div>
        )}
        {wipeStep === 2 && (
          <div className="card" style={{ borderColor: C.red }}>
            <p style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>Escribe BORRAR para confirmar</p>
            <input className="input" value={wipeText} onChange={(e) => setWipeText(e.target.value)} style={{ marginTop: 6 }} />
            <button
              className="btn-xl" disabled={wipeText !== "BORRAR"} onClick={onWipeAll}
              style={{ marginTop: 8, background: C.red, color: "#fff", fontSize: 12 }}
            >
              Borrar definitivamente
            </button>
          </div>
        )}
      </div>
      </AccordionSection>

      <div className="card" style={{ textAlign: "center", marginTop: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 800 }}>F.A.S.E. v3.0</p>
        <p style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>Formación Atlética y Sistemas de Entrenamiento</p>
        <p style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>Desarrollado con 💪 para atletas serios</p>
        <p style={{ fontSize: 11, color: C.cyan, marginTop: 6 }}>f-a-s-e.vercel.app</p>
      </div>

      <MiniToast message={toast} />
    </div>
  );
}

/* ─── Backup completo: exporta/restaura todas las claves fase_* de localStorage ─── */
function collectBackupData() {
  const data = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("fase_")) data[key.slice(5)] = window.localStorage.getItem(key);
  }
  return data;
}

function downloadBackupFile() {
  const backup = { version: "1.0", date: new Date().toISOString(), data: collectBackupData() };
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FASE_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isValidBackup(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.version !== "string") return false;
  if (!obj.data || typeof obj.data !== "object") return false;
  return Object.entries(obj.data).every(([k, v]) => typeof k === "string" && typeof v === "string" && v.length <= STORE_MAX_READ);
}

function applyBackup(obj) {
  Object.entries(obj.data).forEach(([k, v]) => {
    try {
      window.localStorage.setItem("fase_" + k, v);
    } catch {
      /* clave omitida por falta de espacio */
    }
  });
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
      <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>
        El 1RM (1 repetición máxima) es el peso máximo que puedes levantar una sola vez. Úsalo para calcular cargas de entrenamiento con porcentajes.
      </p>

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
/* ─── Peso corporal semanal ─── */
function getWeightLog() {
  return store.get("weight_log", []);
}

function saveWeightEntry(weightKg, force = false) {
  const log = getWeightLog();
  const today = todayKey();
  const existingIdx = log.findIndex((e) => dayKey(new Date(e.date).getTime()) === today);
  if (existingIdx >= 0 && !force) return { needsConfirm: true, log };
  if (existingIdx >= 0) {
    const next = [...log];
    next[existingIdx] = { date: new Date().toISOString(), weight: weightKg };
    store.set("weight_log", next);
    return next;
  }
  let next = [...log, { date: new Date().toISOString(), weight: weightKg }];
  if (next.length > 52) next = next.slice(next.length - 52);
  store.set("weight_log", next);
  return next;
}

function WeightSection() {
  const [log, setLog] = useState(() => getWeightLog());
  const [input, setInput] = useState("");
  const [now] = useState(() => Date.now());
  const [pendingWeight, setPendingWeight] = useState(null);

  const submit = () => {
    const w = parseFloat(input);
    if (!(w > 0)) return;
    const result = saveWeightEntry(w);
    if (result.needsConfirm) { setPendingWeight(w); return; }
    setLog(result);
    setInput("");
  };

  if (!log.length) {
    return (
      <div className="card" style={{ marginTop: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 800 }}>⚖️ Mi peso</p>
        <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>Registra tu peso para ver tu evolución</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            className="input" type="number" inputMode="decimal" placeholder="Ej. 72.5 kg"
            value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1, padding: 10, fontSize: 13 }}
          />
          <button className="btn-xl" onClick={submit} disabled={!input} style={{ width: "auto", padding: "0 18px", background: C.cyan, color: "#07070C", fontSize: 13 }}>
            Guardar
          </button>
        </div>
      </div>
    );
  }

  const last8 = log.slice(-8);
  const weights = last8.map((e) => e.weight);
  const minW = Math.min(...weights) - 5;
  const maxW = Math.max(...weights) + 5;
  const range = Math.max(1, maxW - minW);
  const todayStr = todayKey();

  const first = log[0].weight;
  const lastVal = log[log.length - 1].weight;
  const sinceStart = lastVal - first;

  const monthAgo = now - 30 * 86400000;
  const beforeMonth = [...log].reverse().find((e) => new Date(e.date).getTime() < monthAgo);
  const thisMonthDiff = lastVal - (beforeMonth ? beforeMonth.weight : first);

  const trendDiff = log.length >= 2 ? lastVal - log[log.length - 2].weight : 0;
  const trend = Math.abs(trendDiff) < 0.3 ? "Estable" : trendDiff > 0 ? "Subiendo" : "Bajando";

  const fmtDiff = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)} kg`;

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 800 }}>⚖️ Mi peso</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, marginTop: 12 }}>
        {last8.map((e, i) => {
          const h = Math.max(4, Math.round(((e.weight - minW) / range) * 90));
          const prev = last8[i - 1];
          const isToday = dayKey(new Date(e.date).getTime()) === todayStr;
          const color = !prev || e.weight === prev.weight ? C.mut : e.weight > prev.weight ? C.orange : "#0099FF";
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 90 }}>
              <div style={{ width: "100%", height: h, borderRadius: 4, background: color, border: isToday ? `2px solid ${C.cyan}` : "none" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          className="input" type="number" inputMode="decimal" placeholder="Nuevo registro (kg)"
          value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1, padding: 10, fontSize: 13 }}
        />
        <button className="btn-xl" onClick={submit} disabled={!input} style={{ width: "auto", padding: "0 16px", background: C.cyan, color: "#07070C", fontSize: 12 }}>
          Guardar
        </button>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ fontSize: 12, color: C.mut }}>Desde que empezaste: <strong style={{ color: C.text }}>{fmtDiff(sinceStart)}</strong></p>
        <p style={{ fontSize: 12, color: C.mut }}>Este mes: <strong style={{ color: C.text }}>{fmtDiff(thisMonthDiff)}</strong></p>
        <p style={{ fontSize: 12, color: C.mut }}>Tendencia: <strong style={{ color: C.text }}>{trend}</strong></p>
      </div>
      <ConfirmSheet
        visible={pendingWeight !== null}
        title="Ya registraste tu peso hoy"
        message="¿Quieres actualizar el registro?"
        confirmLabel="Actualizar"
        confirmColor={C.cyan}
        onConfirm={() => { setLog(saveWeightEntry(pendingWeight, true)); setPendingWeight(null); setInput(""); }}
        onCancel={() => setPendingWeight(null)}
      />
    </div>
  );
}

/* TMB: Cunningham (más precisa con % de grasa corporal) o Mifflin-St Jeor estándar */
function calcTMB(weight, height, age, sex, bodyFat) {
  if (bodyFat && bodyFat > 0 && bodyFat < 50) {
    const lbm = weight * (1 - bodyFat / 100);
    return 500 + 22 * lbm;
  }
  return sex === "f" ? 10 * weight + 6.25 * height - 5 * age - 161 : 10 * weight + 6.25 * height - 5 * age + 5;
}

/* Multiplicador de actividad: usa el historial real de las últimas 4 semanas si hay datos suficientes */
function getActivityMult(sessions, daysConfig) {
  const recentSessions = sessions.filter((s) => {
    const daysAgo = (Date.now() - s.ts) / 86400000;
    return daysAgo <= 28 && s.kind === "entreno";
  });
  const avgDaysPerWeek = recentSessions.length / 4;
  const effectiveDays = recentSessions.length > 4 ? avgDaysPerWeek : daysConfig;
  if (effectiveDays < 1.5) return 1.2;
  if (effectiveDays < 3) return 1.375;
  if (effectiveDays < 4.5) return 1.55;
  if (effectiveDays < 6) return 1.725;
  return 1.9;
}


/* ─── Calculadora de macros ─── */
const MACRO_GOALS = [
  { id: "muscle", label: "Ganar músculo (superávit)", emoji: "💪" },
  { id: "fat", label: "Perder grasa (déficit)", emoji: "🔥" },
  { id: "maintain", label: "Mantenimiento", emoji: "⚖️" },
  { id: "performance", label: "Rendimiento deportivo", emoji: "⚡" },
];

const MACRO_ACTIVITY = [
  { id: "sedentary", label: "Sedentario", desc: "Oficina, poco ejercicio", emoji: "🛋️", mult: 1.2 },
  { id: "light", label: "Ligero", desc: "1-3 días/semana", emoji: "🚶", mult: 1.375 },
  { id: "moderate", label: "Moderado", desc: "3-5 días/semana", emoji: "🏃", mult: 1.55 },
  { id: "active", label: "Muy activo", desc: "6-7 días/semana", emoji: "💪", mult: 1.725 },
  { id: "athlete", label: "Atleta", desc: "2 sesiones diarias", emoji: "⚡", mult: 1.9 },
];

function MacrosCalculator({ sessions, onBack }) {
  const savedWeightLog = getWeightLog();
  const savedWeight = savedWeightLog.length ? savedWeightLog[savedWeightLog.length - 1].weight : null;
  const [result, setResult] = useState(() => store.get("macros", null));
  const [step, setStep] = useState(() => (store.get("macros", null) ? 0 : 1));
  const [weight, setWeight] = useState(savedWeight || "");
  const [height, setHeight] = useState(() => store.get("height", "") || "");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("m");
  const [bodyFat, setBodyFat] = useState(() => store.get("body_fat", ""));
  const [goal, setGoal] = useState(null);
  const [activity, setActivity] = useState(() => {
    const mult = getActivityMult(sessions, 3);
    return MACRO_ACTIVITY.reduce((best, a) => (Math.abs(a.mult - mult) < Math.abs(best.mult - mult) ? a : best)).id;
  });

  const imc = weight && height ? parseFloat(weight) / (parseFloat(height) / 100) ** 2 : null;

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10) || 30;
    if (!(w > 0) || !(h > 0)) return;
    store.set("height", height);
    const bf = parseFloat(bodyFat);
    if (bf > 0) store.set("body_fat", bodyFat); else store.set("body_fat", "");
    const tmb = calcTMB(w, h, a, sex, bf);
    const mult = MACRO_ACTIVITY.find((x) => x.id === activity)?.mult || 1.55;
    const tdee = tmb * mult;
    const gm = {
      muscle: { calories: tdee + 300, protein: w * 2.0, carbsCals: tdee * 0.45, fatCals: tdee * 0.25 },
      fat: { calories: tdee - 400, protein: w * 2.2, carbsCals: tdee * 0.35, fatCals: tdee * 0.25 },
      maintain: { calories: tdee, protein: w * 1.8, carbsCals: tdee * 0.45, fatCals: tdee * 0.30 },
      performance: { calories: tdee + 200, protein: w * 1.8, carbsCals: tdee * 0.55, fatCals: tdee * 0.20 },
    }[goal || "maintain"];
    const r = {
      calories: Math.round(gm.calories), protein: Math.round(gm.protein),
      carbs: Math.round(gm.carbsCals / 4), fat: Math.round(gm.fatCals / 9),
    };
    store.set("macros", r);
    setResult(r);
    setStep(0);
  };

  if (step === 0 && result) {
    return (
      <div className="screen">
        <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Progreso</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>🧮 Mis macros</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: "1 1 45%", textAlign: "center", padding: "16px 8px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.orange }}>{result.calories}</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🔥 kcal/día</div>
          </div>
          <div className="card" style={{ flex: "1 1 45%", textAlign: "center", padding: "16px 8px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.red }}>{result.protein}g</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🥩 proteína</div>
          </div>
          <div className="card" style={{ flex: "1 1 45%", textAlign: "center", padding: "16px 8px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.yellow }}>{result.carbs}g</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🍚 carbohidratos</div>
          </div>
          <div className="card" style={{ flex: "1 1 45%", textAlign: "center", padding: "16px 8px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{result.fat}g</div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>🥑 grasas</div>
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: C.mut }}>Tu proteína diaria = {Math.round(result.protein / 31)} pechugas de pollo 🍗</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>o {Math.round(result.protein / 6)} huevos 🥚</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>o {Math.round(result.protein / 25)} latas de atún 🐟</p>
        </div>
        <button className="btn-xl" onClick={() => setStep(1)} style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
          Recalcular
        </button>
        <p style={{ fontSize: 10, color: C.dim, textAlign: "center", marginTop: 14, lineHeight: 1.4 }}>
          Cálculo estimado basado en fórmulas estándar. Para un plan personalizado consulta un nutriólogo.
        </p>
      </div>
    );
  }

  if (step === 1 || step === 2 || step === 3) {
    return (
      <div className="screen">
        <button onClick={onBack} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Progreso</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>🧮 Calcular mis macros</h2>

        <div className="sec-title">Tus datos</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, display: "block" }}>PESO (KG)</label>
            <input className="input" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, display: "block" }}>ALTURA (CM)</label>
            <input className="input" type="number" value={height} onChange={(e) => setHeight(e.target.value)} style={{ marginTop: 4 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, display: "block" }}>EDAD</label>
            <input className="input" type="number" value={age} onChange={(e) => setAge(e.target.value)} style={{ marginTop: 4 }} />
          </div>
          <div style={{ flex: 1, paddingTop: 18 }}>
            <div className="chip-wrap">
              <button className={`chip ${sex === "m" ? "on" : ""}`} onClick={() => setSex("m")}>♂ H</button>
              <button className={`chip ${sex === "f" ? "on" : ""}`} onClick={() => setSex("f")}>♀ M</button>
            </div>
          </div>
        </div>
        <label style={{ fontSize: 11, color: C.mut, fontWeight: 700, marginTop: 10, display: "block" }}>% DE GRASA CORPORAL (OPCIONAL)</label>
        <input
          className="input" type="number" min="5" max="50" placeholder="ej: 15"
          value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} style={{ marginTop: 4 }}
        />
        {imc && <p style={{ fontSize: 12, color: C.mut, marginTop: 8 }}>IMC: {imc.toFixed(1)} (informativo, sin juicio de valor)</p>}

        <div className="sec-title" style={{ marginTop: 14 }}>Tu objetivo</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {MACRO_GOALS.map((g) => (
            <button
              key={g.id} className="card"
              onClick={() => setGoal(g.id)}
              style={{
                textAlign: "center", padding: "12px 8px",
                border: goal === g.id ? `2px solid ${C.cyan}` : undefined,
                background: goal === g.id ? `${C.cyan}14` : C.card,
              }}
            >
              <div style={{ fontSize: 22 }}>{g.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{g.label}</div>
            </button>
          ))}
        </div>

        <div className="sec-title" style={{ marginTop: 14 }}>Nivel de actividad</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MACRO_ACTIVITY.map((a) => (
            <button
              key={a.id} className="card"
              onClick={() => setActivity(a.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", textAlign: "left", border: activity === a.id ? `2px solid ${C.cyan}` : undefined }}
            >
              <span style={{ fontSize: 18 }}>{a.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: C.mut }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          className="btn-xl"
          onClick={calculate}
          disabled={!weight || !height || !age || !goal}
          style={{ marginTop: 16, background: C.cyan, color: "#07070C" }}
        >
          Calcular mis macros →
        </button>
      </div>
    );
  }
}

/* ─── DNA Atlético: radar chart SVG puro ─── */
const DNA_AXES = [
  { id: "fuerza", label: "Fuerza" },
  { id: "velocidad", label: "Velocidad" },
  { id: "resistencia", label: "Resistencia" },
  { id: "potencia", label: "Potencia" },
  { id: "movilidad", label: "Movilidad" },
  { id: "consistencia", label: "Consistencia" },
];

function calcDNA(sessions, streak) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const records = computeRecords(sessions);
  const squatRecord = records.find((r) => /sentadilla/i.test(r.name) && !/pistol/i.test(r.name));
  const weightLog = getWeightLog();
  const bodyWeight = weightLog.length ? weightLog[weightLog.length - 1].weight : 75;

  return {
    fuerza: Math.min(100, ((squatRecord?.weight || 0) / (bodyWeight * 1.5)) * 100),
    velocidad: Math.min(100, workouts.filter((s) => s.disc === "atletismo").length * 10),
    resistencia: Math.min(100, workouts.length ? (workouts.filter((s) => (s.durationMin || 0) >= 45).length / workouts.length) * 100 : 0),
    potencia: Math.min(100, workouts.filter((s) => ["futbolGym", "futbolParque", "atletismo"].includes(s.disc)).length * 8),
    movilidad: Math.min(100, sessions.filter((s) => s.kind === "cuerpo").length * 15),
    consistencia: Math.min(100, streak * 3.3),
  };
}

/* ─── Radar de jugador: 6 atributos de fútbol calculados del historial real ─── */
const PLAYER_AXES = [
  { id: "velocidad", label: "Velocidad", genericLabel: "Velocidad" },
  { id: "motor", label: "Motor", genericLabel: "Motor" },
  { id: "defensa", label: "Defensa", genericLabel: "Fuerza" },
  { id: "pase", label: "Pase", genericLabel: "Técnica" },
  { id: "agilidad", label: "Agilidad", genericLabel: "Agilidad" },
  { id: "tiro", label: "Tiro", genericLabel: "Potencia" },
];
function calcPlayerRadar(sessions) {
  const workouts = sessions.filter((s) => s.kind === "entreno" || s.kind === "partido");
  const totalSessions = workouts.length;

  /* VELOCIDAD: sesiones de atletismo/fútbol parque + nivel declarado */
  const atletismoCount = workouts.filter((s) => s.disc === "atletismo" || s.disc === "futbolParque").length;
  const userLevel = getUserLevel("atletismo");
  const velocidad = Math.min(100, Math.round(
    15 + atletismoCount * 6 + userLevel * 10 + (totalSessions > 20 ? 10 : 0)
  ));

  /* DEFENSA (fuerza): 1RM de sentadilla si existe, si no historial de gimnasio */
  const gymSessions = workouts.filter((s) => s.disc === "gimnasio" || s.disc === "futbolGym").length;
  const squat1RM = store.get("1rm", {})["Sentadilla"]?.rm || 0;
  const bodyWeight = store.get("weight", 70);
  const defensa = squat1RM > 0
    ? Math.min(100, Math.round((squat1RM / (bodyWeight * 2)) * 100))
    : Math.min(100, Math.round(15 + gymSessions * 4));

  /* PASE: sesiones de fútbol o partidos jugados */
  const futbolSessions = workouts.filter((s) => s.disc === "futbolParque" || s.disc === "futbolGym" || s.kind === "partido").length;
  const pase = Math.min(100, Math.round(10 + futbolSessions * 5));

  /* AGILIDAD: combinación de disciplinas rápidas */
  const agilidad = Math.min(100, Math.round(
    10 + atletismoCount * 4 + futbolSessions * 3 + (totalSessions > 10 ? 8 : 0)
  ));

  /* TIRO: sesiones de fútbol parque específicamente */
  const parqueSessions = workouts.filter((s) => s.disc === "futbolParque").length;
  const tiro = Math.min(100, Math.round(10 + parqueSessions * 7));

  /* MOTOR: consistencia general y volumen reciente */
  const last4wSessions = workouts.filter((s) => (Date.now() - s.ts) / 86400000 <= 28).length;
  const motor = Math.min(100, Math.round(10 + totalSessions * 1.5 + last4wSessions * 4));

  return { velocidad, defensa, pase, agilidad, tiro, motor };
}
function getPlayerRank(radar) {
  const avg = Object.values(radar).reduce((a, b) => a + b, 0) / 6;
  if (avg >= 90) return { rank: "S", color: "#FFD700", avg: Math.round(avg) };
  if (avg >= 80) return { rank: "A", color: C.cyan, avg: Math.round(avg) };
  if (avg >= 70) return { rank: "B", color: C.green, avg: Math.round(avg) };
  if (avg >= 60) return { rank: "C", color: C.yellow, avg: Math.round(avg) };
  if (avg >= 50) return { rank: "D", color: C.orange, avg: Math.round(avg) };
  return { rank: "E", color: C.red, avg: Math.round(avg) };
}
const PLAYER_WEAPONS = {
  velocidad: { label: "⚡ MOTOR DE ARRANQUE", desc: (v) => `${v}% de velocidad. Tu primer paso es tu arma letal.` },
  motor: { label: "🫁 MOTOR INAGOTABLE", desc: (v) => `${v}% de resistencia. Sigues corriendo cuando otros se detienen.` },
  defensa: { label: "🛡️ MURO DEFENSIVO", desc: (v) => `${v}% de fuerza. En el choque, tú ganas.` },
  pase: { label: "🎯 CEREBRO TÁCTICO", desc: (v) => `${v}% de precisión. Rompes líneas con el pase.` },
  agilidad: { label: "🌀 IMPOSIBLE DE MARCAR", desc: (v) => `${v}% de agilidad. Los defensores no te pueden seguir.` },
  tiro: { label: "💥 DEFINIDOR NATO", desc: (v) => `${v}% de tiro. Defines cuando importa.` },
};
function findPlayerWeapon(radar) {
  const values = Object.entries(radar);
  const avg = values.reduce((a, [, v]) => a + v, 0) / values.length;
  const [topAttr, topVal] = values.sort((a, b) => b[1] - a[1])[0];
  if (topVal < avg * 1.15 || topVal === 0) return null;
  const w = PLAYER_WEAPONS[topAttr];
  return { attr: topAttr, value: topVal, label: w.label, description: w.desc(topVal) };
}

function PlayerRadar({ sessions, isFootball }) {
  const radar = useMemo(() => calcPlayerRadar(sessions), [sessions]);
  const rankInfo = getPlayerRank(radar);
  const weapon = findPlayerWeapon(radar);
  const size = 260;
  const center = size / 2;
  const radius = size * 0.34;
  const axes = PLAYER_AXES.length;
  const values = PLAYER_AXES.map((a) => radar[a.id]);
  const points = values.map((v, i) => radarPoint(v, i, axes, center, radius));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const refPoints = PLAYER_AXES.map((_, i) => radarPoint(85, i, axes, center, radius));
  const refPolygon = refPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 800 }}>{isFootball ? "⚽ Mi perfil de jugador" : "📊 Mi perfil atlético"}</p>
      <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>
        Tu perfil atlético calculado de tu historial. Cada eje refleja diferentes capacidades. Se actualiza con cada sesión.
      </p>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 280, display: "block", margin: "8px auto 0" }}>
        {gridLevels.map((lvl) => {
          const gridPts = Array.from({ length: axes }, (_, i) => radarPoint(lvl, i, axes, center, radius));
          return <polygon key={lvl} points={gridPts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={C.border} strokeWidth="1" />;
        })}
        {PLAYER_AXES.map((a, i) => {
          const edge = radarPoint(100, i, axes, center, radius);
          const labelPt = radarPoint(118, i, axes, center, radius);
          return (
            <g key={a.id}>
              <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke={C.border} strokeWidth="1" />
              <text x={labelPt.x} y={labelPt.y - 4} fontSize="9" fill={C.mut} textAnchor="middle">{(isFootball ? a.label : a.genericLabel).toUpperCase()}</text>
              <text x={labelPt.x} y={labelPt.y + 8} fontSize="9" fontWeight="800" fill={C.cyan} textAnchor="middle">{radar[a.id]}%</text>
            </g>
          );
        })}
        <polygon points={refPolygon} fill="none" stroke="#444" strokeWidth="1.5" strokeDasharray="5,3" />
        <polygon points={polygonPoints} fill={`${C.cyan}33`} stroke={C.cyan} strokeWidth="2" />
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: C.cyan }}>— Tu nivel</span>
        <span style={{ fontSize: 10, color: C.mut }}>- - Referencia élite</span>
      </div>
      <p style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: rankInfo.color, marginTop: 8 }}>
        {rankInfo.rank} ({rankInfo.avg})
      </p>
      {weapon ? (
        <div style={{ marginTop: 10, textAlign: "center", background: "#000", border: `1px solid ${C.cyan}`, borderRadius: 10, padding: "8px 10px" }}>
          <p style={{ fontSize: 12, fontWeight: 900, color: C.cyan, letterSpacing: 0.5 }}>[ARMA: {weapon.label.replace(/^\S+ /, "")}]</p>
          <p style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>{weapon.description}</p>
        </div>
      ) : null}
    </div>
  );
}

function radarPoint(val, i, axes, center, radius) {
  const angle = (i * 2 * Math.PI) / axes - Math.PI / 2;
  const r = (Math.max(0, val) / 100) * radius;
  return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
}

function DNARadar({ sessions, streak }) {
  const dna = useMemo(() => calcDNA(sessions, streak), [sessions, streak]);
  const size = 260;
  const center = size / 2;
  const radius = size * 0.34;
  const axes = DNA_AXES.length;
  const values = DNA_AXES.map((a) => dna[a.id]);
  const points = values.map((v, i) => radarPoint(v, i, axes, center, radius));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const gridLevels = [20, 40, 60, 80, 100];
  const strongestIdx = values.indexOf(Math.max(...values));
  const weakestIdx = values.indexOf(Math.min(...values));

  const [showDnaHint, dismissDnaHint] = useFirstTime("dna");
  return (
    <div className="card" style={{ marginTop: 10, position: "relative" }}>
      <p style={{ fontSize: 13, fontWeight: 800 }}>🧬 Mi DNA Atlético</p>
      <FeatureTooltip visible={showDnaHint} onDismiss={dismissDnaHint} text="🧬 Aquí está tu perfil atlético único" />
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 280, display: "block", margin: "8px auto 0" }}>
        {gridLevels.map((lvl) => {
          const gridPts = Array.from({ length: axes }, (_, i) => radarPoint(lvl, i, axes, center, radius));
          return <polygon key={lvl} points={gridPts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={C.border} strokeWidth="1" />;
        })}
        {DNA_AXES.map((a, i) => {
          const edge = radarPoint(100, i, axes, center, radius);
          return <line key={a.id} x1={center} y1={center} x2={edge.x} y2={edge.y} stroke={C.border} strokeWidth="1" />;
        })}
        <polygon
          points={polygonPoints} fill={C.cyan} fillOpacity="0.3" stroke={C.cyan} strokeWidth="2"
          className="pop" style={{ transformOrigin: `${center}px ${center}px` }}
        />
        {DNA_AXES.map((a, i) => {
          const labelPt = radarPoint(124, i, axes, center, radius);
          const color = i === strongestIdx ? C.green : i === weakestIdx ? C.orange : C.mut;
          return (
            <text key={a.id} x={labelPt.x} y={labelPt.y} textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>
              {a.label} {Math.round(values[i])}%
            </text>
          );
        })}
      </svg>
      <p style={{ fontSize: 12, color: C.mut, textAlign: "center", marginTop: 6 }}>
        Tu fortaleza principal: <strong style={{ color: C.green }}>{DNA_AXES[strongestIdx].label}</strong>
      </p>
      <p style={{ fontSize: 12, color: C.mut, textAlign: "center", marginTop: 2 }}>
        Tu área de mejora: <strong style={{ color: C.orange }}>{DNA_AXES[weakestIdx].label}</strong>
      </p>
      <p style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 6 }}>
        Entrena más para mejorar tu {DNA_AXES[weakestIdx].label.toLowerCase()}
      </p>
    </div>
  );
}

/* ─── Calidad técnica global (feedback de técnica) ─── */
function techniqueQualityPct(sessions) {
  const ratings = sessions
    .filter((s) => s.kind === "entreno")
    .flatMap((s) => s.exercises.map((e) => e.technique))
    .filter(Boolean);
  if (!ratings.length) return null;
  const good = ratings.filter((r) => r === "perfecta" || r === "bien").length;
  return Math.round((good / ratings.length) * 100);
}

/* ─── Comparativa temporal: esta semana vs la anterior ─── */
function weekComparisonStats(sessions) {
  const thisWeekStart = startOfWeek();
  const lastWeekStart = thisWeekStart - 7 * 86400000;
  const thisWeekList = sessions.filter((s) => s.ts >= thisWeekStart);
  const lastWeekList = sessions.filter((s) => s.ts >= lastWeekStart && s.ts < thisWeekStart);
  const statsFor = (list) => {
    const workouts = list.filter((s) => s.kind === "entreno");
    const sets = workouts.flatMap((s) => s.exercises.flatMap((e) => e.sets)).filter((st) => st.ok);
    const volume = Math.round(sets.reduce((a, st) => a + st.weight * st.reps, 0));
    const activeDays = new Set(list.map((s) => dayKey(s.ts))).size;
    return { sessions: list.length, volume, series: sets.length, activeDays };
  };
  return { thisWeek: statsFor(thisWeekList), lastWeek: statsFor(lastWeekList), hasLastWeekData: lastWeekList.length > 0 };
}

// eslint-disable-next-line no-unused-vars -- ya no se usa en Progreso; se deja disponible para otro contexto
function WeekComparisonCard({ sessions }) {
  const { thisWeek, lastWeek, hasLastWeekData } = useMemo(() => weekComparisonStats(sessions), [sessions]);
  if (!hasLastWeekData) {
    return (
      <div className="card" style={{ marginTop: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 800 }}>📊 Esta semana vs anterior</p>
        <p style={{ fontSize: 12, color: C.mut, marginTop: 6 }}>Completa esta semana para ver la comparativa 📅</p>
      </div>
    );
  }
  const rows = [
    { label: "Sesiones", a: thisWeek.sessions, b: lastWeek.sessions, unit: "" },
    { label: "Volumen", a: thisWeek.volume, b: lastWeek.volume, unit: " kg" },
    { label: "Series", a: thisWeek.series, b: lastWeek.series, unit: "" },
    { label: "Días activos", a: thisWeek.activeDays, b: lastWeek.activeDays, unit: "" },
  ];
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 800 }}>📊 Esta semana vs anterior</p>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => {
          const diff = r.a - r.b;
          const pct = r.b > 0 ? Math.round((diff / r.b) * 100) : null;
          const same = diff === 0;
          const improved = diff > 0;
          const color = same ? C.mut : improved ? C.green : C.orange;
          const emoji = same ? "➡️" : improved ? (r.label === "Volumen" ? "📈" : "✅") : "⚠️";
          const diffText = same ? "Igual" : pct !== null ? `${diff > 0 ? "+" : ""}${pct}%` : `${diff > 0 ? "+" : ""}${diff}`;
          return (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: C.mut, flex: 1 }}>{r.label}</span>
              <span style={{ width: 60, textAlign: "right", fontWeight: 700 }}>{r.a}{r.unit}</span>
              <span style={{ width: 60, textAlign: "right", color: C.dim }}>{r.b}{r.unit}</span>
              <span style={{ width: 70, textAlign: "right", color, fontWeight: 800 }}>{diffText} {emoji}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Análisis de punto débil ─── */
const GROUP_TO_PLAN = {
  Pecho: { discId: "gimnasio", focusId: "push" },
  Espalda: { discId: "gimnasio", focusId: "pull" },
  Piernas: { discId: "gimnasio", focusId: "legs" },
  Hombros: { discId: "gimnasio", focusId: "upper" },
  Brazos: { discId: "gimnasio", focusId: "arms" },
  Atletismo: { discId: "atletismo", focusId: "1000m" },
  "Fútbol": { discId: "futbolParque", focusId: "todo" },
  Calistenia: { discId: "calistenia", focusId: "todo" },
};

function findWeakPoint(sessions) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  if (!workouts.length) return null;
  const counts = {};
  Object.keys(GROUP_TO_PLAN).forEach((g) => { counts[g] = 0; });
  const gimFocusToGroup = { pecho: "Pecho", espalda: "Espalda", piernas: "Piernas", hombros: "Hombros", brazos: "Brazos" };
  workouts.forEach((s) => {
    if (s.disc === "gimnasio") {
      const focusId = DISCIPLINES.gimnasio.focuses.find((f) => f.label === s.focusLabel)?.id;
      const key = gimFocusToGroup[focusId];
      if (key) counts[key]++;
    } else if (s.disc === "atletismo") counts.Atletismo++;
    else if (s.disc === "futbolGym" || s.disc === "futbolParque") counts["Fútbol"]++;
    else if (s.disc === "calistenia") counts.Calistenia++;
  });
  const entries = Object.entries(counts);
  const minCount = Math.min(...entries.map(([, c]) => c));
  const maxCount = Math.max(...entries.map(([, c]) => c));
  if (maxCount - minCount <= 1) return { balanced: true };
  const weakest = entries.find(([, c]) => c === minCount)[0];
  return { balanced: false, weakest, count: minCount };
}

function WeakPointCard({ sessions, onTrain }) {
  const weak = useMemo(() => findWeakPoint(sessions), [sessions]);
  if (!weak) return null;
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 800 }}>🎯 Tu punto débil</p>
      {weak.balanced ? (
        <p style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 700 }}>¡Entrenamiento equilibrado! Sigue así 🏆</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 6 }}>
            Llevas {weak.count} {weak.count === 1 ? "sesión" : "sesiones"} sin trabajar <strong style={{ color: C.text }}>{weak.weakest}</strong>.
          </p>
          <p style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Los atletas completos no tienen puntos débiles.</p>
          <button
            className="btn-xl"
            onClick={() => {
              const target = GROUP_TO_PLAN[weak.weakest];
              if (target) onTrain?.(target.discId, target.focusId);
            }}
            style={{ marginTop: 10, background: C.orange, color: "#07070C", fontSize: 13 }}
          >
            Trabajar {weak.weakest} ahora →
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Detector de meseta (plateau) ─── */
const PLATEAU_SUGGESTIONS = [
  { title: "Cambia el esquema de series", desc: "Si hacías 4x8, prueba 5x5 con +5kg. El sistema nervioso necesita nuevo estímulo.", action: "Cambiar esquema" },
  { title: "Semana de deload", desc: "Baja el peso al 60% por una semana. Luego vuelve más fuerte. Es ciencia.", action: "Ver deload" },
  { title: "Cambia el ejercicio temporalmente", desc: "Sustituye por una variación 4 semanas. Vuelve y romperás el récord.", action: "Ver alternativas" },
  { title: "Revisa tu descanso y nutrición", desc: "La meseta a veces no es de entrenamiento. ¿Duermes 7-9h? ¿Comes suficiente proteína?", action: "Ver tips" },
];

function getPlateauSuggestion(exercise) {
  return PLATEAU_SUGGESTIONS[exercise.length % PLATEAU_SUGGESTIONS.length];
}

function detectPlateau(sessions, exerciseName) {
  const relevant = sessions
    .filter((s) => s.kind === "entreno" && s.exercises.some((e) => e.name === exerciseName))
    .slice(-6);
  if (relevant.length < 4) return null;

  const weights = relevant.map((s) => {
    const ex = s.exercises.find((e) => e.name === exerciseName);
    const okWeights = ex.sets.filter((st) => st.ok).map((st) => st.weight || 0);
    return okWeights.length ? Math.max(...okWeights) : 0;
  });

  const recent = weights.slice(-3);
  const older = weights.slice(-6, -3);
  if (older.length < 3) return null;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (recentAvg <= 0) return null; // ejercicio sin carga (solo reps): no aplica meseta de peso

  if (Math.abs(recentAvg - olderAvg) < 2.5) {
    return {
      exercise: exerciseName,
      weeks: Math.max(1, Math.round(relevant.length / 1.5)),
      currentWeight: Math.round(recentAvg * 10) / 10,
      suggestion: getPlateauSuggestion(exerciseName),
    };
  }
  return null;
}

function findMainPlateau(sessions) {
  const workouts = sessions.filter((s) => s.kind === "entreno");
  const exNames = [...new Set(workouts.flatMap((s) => s.exercises.map((e) => e.name)))];
  const dismissed = store.get("plateau_dismissed", {});
  for (const name of exNames) {
    if (dismissed[name]) continue;
    const p = detectPlateau(sessions, name);
    if (p) return p;
  }
  return null;
}

function PlateauCard({ sessions }) {
  const plateau = useMemo(() => findMainPlateau(sessions), [sessions]);
  const [dismissed, setDismissed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  if (!plateau || dismissed) return null;
  return (
    <div className="card" style={{ marginTop: 10, borderColor: `${C.orange}66`, background: "rgba(255,122,47,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>⚠️ Posible meseta detectada</p>
        <button
          aria-label="Descartar alerta de meseta"
          onClick={() => {
            const d = store.get("plateau_dismissed", {});
            d[plateau.exercise] = true;
            store.set("plateau_dismissed", d);
            setDismissed(true);
          }}
          style={{ fontSize: 14, color: C.dim, padding: 2 }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: 12, color: C.text, marginTop: 6 }}>
        {plateau.exercise} — {plateau.weeks} {plateau.weeks === 1 ? "semana" : "semanas"} sin progreso significativo
      </p>
      <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>Peso actual promedio: {plateau.currentWeight}kg</p>
      <p style={{ fontSize: 12, color: C.text, marginTop: 8, fontWeight: 700 }}>💡 Sugerencia: {plateau.suggestion.title}</p>
      <button
        className="btn-xl" onClick={() => setShowDetail((v) => !v)}
        style={{ marginTop: 10, background: C.orange, color: "#07070C", fontSize: 12 }}
      >
        {plateau.suggestion.action}
      </button>
      {showDetail && (
        <p style={{ fontSize: 12, color: C.mut, marginTop: 8, lineHeight: 1.5, padding: "10px 12px", background: C.surface, borderRadius: 10 }}>
          {plateau.suggestion.desc}
        </p>
      )}
    </div>
  );
}

function Progress({ sessions, freezes = [], streak = 0, onQuickStart }) {
  const fatigueLevel = useMemo(() => analyzeFatigue(sessions), [sessions]);
  const [detail, setDetail] = useState(false);
  const [show1rm, setShow1rm] = useState(false);
  const [recordDetail, setRecordDetail] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMacros, setShowMacros] = useState(false);

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
  const totalVolumeShown = useCountUp(globalStats.totalVolume, 1200);

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
  if (showMacros) return <MacrosCalculator sessions={sessions} onBack={() => setShowMacros(false)} />;

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
          <div style={{ ...TYPOGRAPHY.display, color: C.green }}>
            {formatVolume(totalVolumeShown)}
          </div>
          {s.totalVolume > 0 && (
            <div style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>
              Has levantado el peso de {volumeEquivalent(s.totalVolume)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <StatBox label="Días activos" value={s.activeDays} accent={C.orange} />
          <StatBox label="Racha actual" value={streak} accent={C.red} sparkData={last30DaysTrainedArray(sessions)} />
          <StatBox label="Mejor racha" value={bestStreak} accent={C.yellow} />
        </div>

        <Heatmap sessions={sessions} color={C.cyan} freezes={freezes} activeProgram={getActiveProgram()} />

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
        {(() => {
          const avg = avgRpeFor(sessions, recordDetail);
          if (avg === null) return null;
          return <p style={{ fontSize: 12, fontWeight: 700, color: rpeColor(avg), marginTop: 4 }}>RPE promedio: {avg.toFixed(1)}</p>;
        })()}

        <ProgressTimeline exercise={recordDetail} currentValue={maxVal} />

        {(() => {
          const pred = predictRecord(sessions, recordDetail);
          if (!pred) return null;
          if (pred.trend === "falling") {
            return (
              <div className="card" style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: C.mut }}>💡 Tu progresión está estancada. Considera cambiar el estímulo.</p>
              </div>
            );
          }
          return (
            <div className="card" style={{ marginTop: 10, borderColor: `${C.green}55` }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.green }}>📈 A este ritmo en 4 semanas: ~{pred.in4weeks}kg</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.green, marginTop: 4 }}>📈 En 8 semanas: ~{pred.in8weeks}kg</p>
              <p style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Estimado según tu progresión actual</p>
            </div>
          );
        })()}

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
              <span style={{ fontSize: 12, color: C.mut }}>{timeAgo(r.ts)}</span>
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
                → {LEVELS[globalIdx + 1].name} en {nextThreshold - sessions.length} sesiones más
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, color: C.dim, marginTop: 14 }}>Toca para ver el detalle ›</div>
        </button>

        {sessions.length === 0 && (
          <div className="card" style={{ marginTop: 10 }}>
            <EmptyState
              icon={<EmptyProgressIllustration />}
              title="Construye tu perfil atlético"
              subtitle="Tu DNA Atlético se dibuja con cada sesión. Necesitas al menos 5."
              color={C.cyan}
            />
          </div>
        )}

        <div className="card" style={{ marginTop: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.mut }}>⭐ Puntos de esfuerzo</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: C.cyan }}>{xpInfo.xp}</span>
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
          <button className="card" onClick={() => setShowMacros(true)} style={{ flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div style={{ fontSize: 20 }}>🧮</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Mis macros</div>
          </button>
        </div>

        {(() => {
          const workouts = sessions.filter((s) => s.kind === "entreno");
          const counts = {};
          workouts.forEach((s) => { counts[s.disc] = (counts[s.disc] || 0) + 1; });
          const favDisc = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          const isFootball = favDisc === "futbolGym" || favDisc === "futbolParque";
          return <PlayerRadar sessions={sessions} isFootball={isFootball} />;
        })()}
        <JumpTestCard />
        <DNARadar sessions={sessions} streak={streak} />
        {(() => {
          const pct = techniqueQualityPct(sessions);
          if (pct === null) return null;
          const color = pct >= 80 ? C.green : pct >= 60 ? C.yellow : C.orange;
          return (
            <div className="card" style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Calidad técnica</span>
              <span style={{ fontSize: 15, fontWeight: 900, color }}>{pct}% 🎯</span>
            </div>
          );
        })()}
        <PlateauCard sessions={sessions} />
        <WeakPointCard
          sessions={sessions}
          onTrain={(discId, focusId) => {
            const lvlIdx = mostFrequentLevel(sessions);
            const p = buildPlanFor(discId, focusId, lvlIdx);
            if (p) onQuickStart?.(p);
          }}
        />
        <WeightSection />

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

        {(() => {
          const asymmetries = calcAsymmetryByExercise(sessions);
          if (!asymmetries.length) return null;
          return (
            <>
              <div className="sec-title">⚖️ Índice de asimetría</div>
              <div className="card">
                {asymmetries.map((a) => (
                  <div key={a.name} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{a.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: a.pct > 15 ? C.red : C.yellow }}>
                        {a.pct > 15 ? "🚨" : "⚠️"} {a.pct}%
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>
                      <span style={{ color: C.blue }}>IZQ {a.avgLeft}kg</span> · <span style={{ color: C.orange }}>DER {a.avgRight}kg</span> · lado {a.dominant} domina
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
                  Recomendación: 1 serie extra del lado débil al inicio de cada sesión. Sobre 15% de asimetría, pausa la carga pesada hasta nivelar ambos lados.
                </p>
              </div>
            </>
          );
        })()}

        <div className="sec-title">🏆 Mis récords</div>
        {records.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<EmptyRecordsIllustration />}
              title="Sin récords todavía"
              subtitle="Completa tu primera sesión para empezar a registrarlos."
              color={C.yellow}
            />
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
                      {r.weight > 0 ? `${r.weight} kg × ${r.reps} reps` : `${r.reps} reps`} · {timeAgo(r.ts)}
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

      <div className="card" style={{ marginTop: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderColor: `${FATIGUE_INFO[fatigueLevel].color}55` }}>
        <span style={{ fontSize: 20 }}>{FATIGUE_INFO[fatigueLevel].emoji}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: FATIGUE_INFO[fatigueLevel].color }}>{FATIGUE_INFO[fatigueLevel].title}</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{FATIGUE_INFO[fatigueLevel].desc}</div>
        </div>
      </div>

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="card" style={{ padding: "14px 10px", textAlign: "center", background: `linear-gradient(135deg, ${C.orange}14, transparent)` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.orange }}>🔥 {streak}</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>días racha</div>
        </div>
        <div className="card" style={{ padding: "14px 10px", textAlign: "center", background: `linear-gradient(135deg, ${C.cyan}14, transparent)` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.cyan }}>💪 {sessions.length}</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>sesiones</div>
        </div>
        <div className="card" style={{ padding: "14px 10px", textAlign: "center", background: `linear-gradient(135deg, ${C.green}14, transparent)` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>🏋️ {formatVolume(totalVolumeShown)}</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>volumen</div>
        </div>
        <div className="card" style={{ padding: "14px 10px", textAlign: "center", background: `linear-gradient(135deg, ${C.purple}14, transparent)` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.purple }}>⏱ {workouts.reduce((a, s) => a + (s.durationMin || 0), 0)}</div>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 3 }}>min entrenados</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <StatBox label="Peso promedio" value={avgWeight ? `${avgWeight} kg` : "—"} accent={C.cyan} />
        <StatBox label="Reps promedio" value={avgReps || "—"} accent={C.green} />
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
  { id: "inicio", label: "Hoy", Icon: IconHome },
  { id: "entrenar", label: "Entrenar", Icon: IconTrain },
  { id: "yo", label: "Yo", Icon: IconProgress },
];

/* Hint de primera vez para una feature: seen_<key> en localStorage */
function useFirstTime(key) {
  const [seen, setSeenState] = useState(() => store.get(`seen_${key}`, false));
  const markSeen = () => { store.set(`seen_${key}`, true); setSeenState(true); };
  return [!seen, markSeen];
}

/* Bottom sheet de confirmación — reemplaza window.confirm() nativo */
function ConfirmSheet({ visible, title, message, onConfirm, onCancel, confirmLabel = "Confirmar", confirmColor }) {
  if (!visible) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 430, background: C.card,
          borderRadius: "20px 20px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
          animation: "sheetUp 0.3s ease-out", textAlign: "center",
        }}
      >
        {title && <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{title}</p>}
        {message && <p style={{ fontSize: 13, color: C.mut, lineHeight: 1.5, marginBottom: 16 }}>{message}</p>}
        <button
          onClick={onConfirm}
          style={{
            width: "100%", minHeight: 52, background: confirmColor || C.red,
            color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 12,
            border: "none", cursor: "pointer", marginBottom: 8,
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{ width: "100%", minHeight: 44, background: "none", border: "none", color: C.mut, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* Toast simple flotante — reemplaza alert() para mensajes informativos */
function MiniToast({ message }) {
  if (!message) return null;
  return (
    <div
      className="pop"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        background: C.card, border: `1px solid ${C.border}`, color: C.text,
        padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
        zIndex: 400, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", maxWidth: "85%", textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}

function FeatureTooltip({ visible, onDismiss, text }) {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);
  if (!visible) return null;
  return (
    <div
      onClick={onDismiss}
      className="pop"
      style={{
        position: "absolute", top: "100%", left: 0, marginTop: 8,
        background: C.cyan, color: "#07070C", fontSize: 12, fontWeight: 700,
        padding: "8px 12px", borderRadius: 10, zIndex: 100, maxWidth: 220,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)", cursor: "pointer",
      }}
    >
      {text}
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Toca para cerrar</div>
    </div>
  );
}

/* Función (no objeto estático) para que refleje el tema activo al vuelo */
function getTabAccent(tabId) {
  return { inicio: C.cyan, entrenar: C.green, yo: C.purple }[tabId];
}

/* ─── YO: perfil, progreso y cuerpo en un solo lugar (config vive solo en el header) ─── */
function YoScreen({ section, onSection, sessions, freezes, streak, onQuickStart, onCompleteBody }) {
  if (section === "progreso") {
    return (
      <div className="screen">
        <button onClick={() => onSection(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Yo</button>
        <Progress sessions={sessions} freezes={freezes} streak={streak} onQuickStart={onQuickStart} />
      </div>
    );
  }

  if (section === "cuerpo") {
    return (
      <div className="screen">
        <button onClick={() => onSection(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Yo</button>
        <Body onComplete={onCompleteBody} />
      </div>
    );
  }

  const globalIdx = levelFromCount(sessions.length, GLOBAL_LEVEL_THRESHOLDS);
  const globalLvl = LEVELS[globalIdx];
  const nextThreshold = GLOBAL_LEVEL_THRESHOLDS[globalIdx + 1];
  const sessionsToNext = nextThreshold ? nextThreshold - sessions.length : null;
  const prevThreshold = GLOBAL_LEVEL_THRESHOLDS[globalIdx] || 0;

  return (
    <div className="screen">
      <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
        <div style={{ fontSize: 48 }}>{globalLvl.emoji}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: globalLvl.color, marginTop: 8 }}>{globalLvl.name}</div>
        <div style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>
          {sessions.length} {sessions.length === 1 ? "sesión total" : "sesiones totales"}
        </div>
        {sessionsToNext !== null && (
          <>
            <div style={{ height: 6, background: C.surface, borderRadius: 99, margin: "12px 0 6px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (1 - sessionsToNext / (nextThreshold - prevThreshold)) * 100)}%`,
                background: globalLvl.color, borderRadius: 99, transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>
              → {LEVELS[globalIdx + 1]?.name} en {sessionsToNext} sesiones más
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => onSection("progreso")} className="card" style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: 16 }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Mi progreso</div>
            <div style={{ fontSize: 12, color: C.mut }}>Récords, estadísticas, DNA atlético, logros y más</div>
          </div>
          <span style={{ marginLeft: "auto", color: C.dim }}>›</span>
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatBox label="Racha" value={`${streak}d 🔥`} />
        <StatBox label="Esta semana" value={sessions.filter((s) => s.ts >= startOfWeek()).length} />
        <StatBox label="Total" value={sessions.length} />
      </div>
    </div>
  );
}

function ProgramsScreen() {
  const [detail, setDetail] = useState(null);
  const [, setTick] = useState(0);
  const profile = store.get("profile", {});
  const active = getActiveProgram();

  if (detail) {
    const isActive = active?.programId === detail.id;
    return (
      <div className="screen">
        <button onClick={() => setDetail(null)} style={{ color: C.mut, fontSize: 12, fontWeight: 600, padding: "4px 0" }}>‹ Programas</button>
        <div style={{ fontSize: 40, marginTop: 8 }}>{detail.emoji}</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 6, color: detail.color }}>{detail.name}</h2>
        <p style={{ fontSize: 13, color: C.mut, marginTop: 8, lineHeight: 1.5 }}>{detail.desc}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <StatBox label="Duración" value={`${detail.durationWeeks} sem`} accent={detail.color} />
          <StatBox label="Días/semana" value={detail.daysPerWeek} accent={detail.color} />
          <StatBox label="Nivel mín." value={LEVELS[detail.minLevelIdx]?.name} accent={detail.color} />
        </div>
        <div className="sec-title">Estructura semanal</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day, i) => (
            <div key={day} className="card" style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.mut }}>{day}</span>
              <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{detail.structure[i]?.label || "Descanso"}</span>
            </div>
          ))}
        </div>
        {isActive ? (
          <>
            <div className="card" style={{ marginTop: 14, textAlign: "center", padding: "14px", borderColor: `${detail.color}55` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: detail.color }}>Semana {active.week} de {detail.durationWeeks} en curso</span>
            </div>
            <button
              className="btn-xl"
              onClick={() => { stopProgram(); setTick((n) => n + 1); }}
              style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.mut }}
            >
              Detener programa
            </button>
          </>
        ) : (
          <button
            className="btn-xl"
            onClick={() => { startProgram(detail.id); setTick((n) => n + 1); }}
            style={{ marginTop: 14, background: detail.color, color: "#07070C" }}
          >
            ▶ Iniciar programa
          </button>
        )}
      </div>
    );
  }

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return (
    <div className="screen">
      <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>📚 Programas de entrenamiento</h2>
      {active && (
        <div className="card" style={{ marginTop: 12, padding: "14px 16px", borderLeft: `4px solid ${active.program.color}` }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: active.program.color }}>▶ Programa en curso: {active.program.name}</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>
            Semana {active.week}/{active.program.durationWeeks} · Día {dayNames[new Date().getDay()]}
          </p>
          <button onClick={() => setDetail(active.program)} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: active.program.color }}>
            Ver mi progreso →
          </button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        {PROGRAMS.map((p) => {
          const recommended = profile.goal && p.goalTags.includes(profile.goal);
          const isActive = active?.programId === p.id;
          return (
            <button
              key={p.id} className="card"
              onClick={() => setDetail(p)}
              style={{
                textAlign: "left",
                padding: "10px 10px",
                borderTop: `3px solid ${p.color}`,
                position: "relative",
                minHeight: 80,
              }}
            >
              {(recommended || isActive) && (
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  fontSize: 8, fontWeight: 800,
                  color: "#07070C",
                  background: isActive ? p.color : C.green,
                  padding: "2px 5px", borderRadius: 99,
                }}>
                  {isActive ? "ACTIVO" : "✓"}
                </span>
              )}
              <div style={{ fontSize: 22 }}>{p.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>
                {p.name}
              </div>
              <div style={{
                fontSize: 10, color: C.mut, marginTop: 4,
                display: "flex", gap: 4, flexWrap: "wrap",
              }}>
                <span>🗓️ {p.durationWeeks}s</span>
                <span>⚡ {p.daysPerWeek}d</span>
                <span>🛡️ {LEVELS[p.minLevelIdx]?.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(true);
  useGlobalTouchEffects();
  const [name, setName] = useState(() => store.get("name", ""));
  const [mode, setMode] = useState(() => store.get("mode", "guiado"));
  const [sessions, setSessions] = useState(() => {
    const raw = store.get("sessions", []);
    const clean = verifyHistory(raw);
    if (clean.length !== raw.length) store.set("sessions", clean);
    return clean;
  });
  const [heroes, setHeroes] = useState(() => {
    const raw = store.get("heroes_unlocked", store.get("heroes", []));
    const remapped = [...new Set(raw.map((id) => LEGACY_HERO_ID_MAP[id] || id).filter((id) => HEROES.some((h) => h.id === id)))];
    return remapped;
  });
  const [tab, setTab] = useState("inicio");
  const [yoSection, setYoSection] = useState(null);
  const [live, setLive] = useState(null);
  const [accent, setAccent] = useState(() => getTabAccent("inicio"));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [freezes, setFreezes] = useState(() => store.get("freezes", []));
  const [noEquipment, setNoEquipment] = useState(() => store.get("no_equipment", false));
  const [toast, setToast] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(() => {
    const hour = new Date().getHours();
    const inWindow = (hour >= 6 && hour < 10) || (hour >= 16 && hour < 20);
    const dismissedToday = store.get("notif_prompt_seen", null) === todayKey();
    const dismissedForever = store.get("notif_dismissed", false);
    const shownCount = store.get("notif_prompt_shown_count", 0);
    const firstSessionTs = sessions.length ? Math.min(...sessions.map((s) => s.ts)) : null;
    const daysSinceFirst = firstSessionTs ? (Date.now() - firstSessionTs) / 86400000 : 0;
    return (
      inWindow && !dismissedToday && !dismissedForever && shownCount < 3 &&
      daysSinceFirst > 7 && !!window.Notification && Notification.permission === "default"
    );
  });
  useEffect(() => {
    if (showNotifPrompt) store.set("notif_prompt_shown_count", store.get("notif_prompt_shown_count", 0) + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [storageFull, setStorageFull] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => store.get("voice", false));
  const [mentor, setMentor] = useState(null);

  const triggerMentor = (id, message) => {
    if (!canShowMentorToday()) return;
    markMentorShown();
    setMentor({ id, message });
  };
  const [installPrompt, setInstallPrompt] = useState(null);
  const [appInstalled, setAppInstalled] = useState(() => store.get("installed", false));
  const [showIOSHint, setShowIOSHint] = useState(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    return isIOS && !isStandalone && !store.get("ios_install_hint_dismissed", false);
  });

  const dismissIOSHint = () => {
    setShowIOSHint(false);
    store.set("ios_install_hint_dismissed", true);
  };

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
  const [darkMode, setDarkMode] = useState(() => {
    const isDark = store.get("theme", "dark") !== "light";
    applyDarkMode(isDark);
    return isDark;
  });
  const [showSummary, setShowSummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const showConfirm = (config) => setConfirmConfig(config);
  const hideConfirm = () => setConfirmConfig(null);

  const saveChallenge = (c) => {
    setChallenge(c);
    store.set("challenge", c);
  };

  const toggleDarkMode = () => {
    setDarkMode((v) => {
      const next = !v;
      applyDarkMode(next);
      store.set("theme", next ? "dark" : "light");
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

  /* PWA: capturar el prompt de instalación y detectar si ya quedó instalada */
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      store.set("installed", true);
      setAppInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try {
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        store.set("installed", true);
        setAppInstalled(true);
      }
    } catch {
      /* prompt descartado */
    }
    setInstallPrompt(null);
  };

  /* Aviso cuando el service worker cachea una nueva versión de la app */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onMessage = (e) => {
      if (e.data?.type === "SW_UPDATED") {
        setToast("App actualizada a la última versión ✨");
        setTimeout(() => setToast(null), 2500);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  const [visitedTabs, setVisitedTabs] = useState(() => store.get("visited_tabs", { inicio: true }));
  const changeTab = (t) => {
    setTab(t);
    setAccent(getTabAccent(t));
    if (!visitedTabs[t]) {
      const next = { ...visitedTabs, [t]: true };
      setVisitedTabs(next);
      store.set("visited_tabs", next);
    }
  };

  /* Skeleton loaders breves: al entrar a una pestaña (más si el historial es grande) */
  useEffect(() => {
    const t = setTimeout(() => setCalculating(false), sessions.length > 50 ? 500 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const streak = useMemo(() => calcStreak(sessions, freezes), [sessions, freezes]);
  const fatigueLevel = useMemo(() => analyzeFatigue(sessions), [sessions]);

  /* El Médico aparece cuando la fatiga es crítica (máximo 1 mentor al día) */
  useEffect(() => {
    if (fatigueLevel === "critical") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza un modal con un valor externo (localStorage) que cambia entre renders
      triggerMentor("medico", "Tu cuerpo habla. Escúchalo antes de que grite. Descansa 2 días completos y luego retoma con Cuerpo o Movilidad suave.");
    }
  }, [fatigueLevel]);

  /* El Coach aparece los lunes y al entrar a una nueva fase del plan de 12 semanas */
  useEffect(() => {
    const isMonday = new Date().getDay() === 1;
    if (isMonday && store.get("coach_monday_shown", null) !== todayKey()) {
      store.set("coach_monday_shown", todayKey());
      // eslint-disable-next-line react-hooks/set-state-in-effect -- muestra el modal una vez al montar según una fecha externa
      triggerMentor("coach", "Nueva semana, nueva oportunidad. Planifica ahora — los que planifican, logran.");
      return;
    }
    const wk = getPlanWeekNumber();
    if (wk && wk <= 12) {
      const phaseId = getPlanPhase(wk);
      const lastPhase = store.get("plan_last_phase", null);
      if (lastPhase !== null && lastPhase !== phaseId) {
        triggerMentor("coach", `Entraste a la fase de ${PERIODIZATION_LABELS[phaseId].toLowerCase()}. ${PERIODIZATION[phaseId].focus}.`);
      }
      store.set("plan_last_phase", phaseId);
    }
  }, []);

  /* Recordatorios inteligentes: mejor esfuerzo del lado del cliente (revisa mientras la
     app está abierta; no es un push real en segundo plano sin servidor). */
  useEffect(() => {
    const legacyHour = { morning: 7, afternoon: 17, night: 20 }[store.get("notif_hour", null)];
    const remindersOn = store.get("reminder_enabled", false) || legacyHour !== undefined;
    if (!remindersOn || !window.Notification || Notification.permission !== "granted") return undefined;
    const targetHour = store.get("reminder_hour", legacyHour ?? 17);

    const check = () => {
      const now = new Date();
      const today = dayKey(now.getTime());
      const trainedToday = sessions.some((s) => dayKey(s.ts) === today);

      const lastShown = store.get("notif_last_shown", null);
      if (now.getHours() === targetHour && lastShown !== today && !trainedToday) {
        const msg = streak === 0
          ? "¿Empezamos hoy? Tu cuerpo está listo"
          : streak < 7
          ? `🔥 Llevas ${streak} días. No rompas la racha`
          : `${streak} días seguidos. Eres una máquina ⚡`;
        try {
          new Notification("F.A.S.E. ⚡", { body: msg, icon: "/icon-192.png" });
        } catch {
          /* silencioso */
        }
        store.set("notif_last_shown", today);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [streak, sessions]);

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


  const saveName = (n, m) => {
    setName(n);
    store.set("name", n);
    setMode(m);
    store.set("mode", m);
  };

  const renameUser = (n) => {
    const clean = sanitize(n);
    if (!clean) return;
    setName(clean);
    store.set("name", clean);
  };

  const wipeAllData = () => {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("fase_")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } finally {
      window.location.reload();
    }
  };

  const MAX_SESSIONS = 500;
  const TRIM_SESSIONS = 50;

  const saveSession = (recordIn) => {
    const record = recordIn.kind === "entreno" && recordIn.disc === "gimnasio" && !recordIn.muscleGroup
      ? { ...recordIn, muscleGroup: focusGroupOf(recordIn.focusLabel) }
      : recordIn;
    let next = [...sessions, record];
    if (next.length > MAX_SESSIONS) {
      exportCSV(next);
      next = next.slice(TRIM_SESSIONS);
      setToast("Se eliminaron sesiones antiguas para liberar espacio. Tu historial reciente está completo.");
      setTimeout(() => setToast(null), 4000);
    }
    setSessions(next);
    store.set("sessions", next);
    if (record.kind === "entreno") {
      updateRecoveryState(record);
      if (!store.get("first_session_date", null)) store.set("first_session_date", record.ts);
    }
    const s = calcStreak(next, freezes);
    const earned = HEROES.filter((h) => s >= h.days).map((h) => h.id);
    const merged = [...new Set([...heroes, ...earned])];
    if (merged.length !== heroes.length) {
      setHeroes(merged);
      store.set("heroes_unlocked", merged);
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

  const updateSessionNote = (id, note) => {
    const next = sessions.map((s) => (s.id === id ? { ...s, note } : s));
    setSessions(next);
    store.set("sessions", next);
  };


  if (loading) return <Splash onDone={() => setLoading(false)} />;

  if (!name) return <Welcome onDone={saveName} />;

  if (showSummary) {
    return <PersonalSummaryScreen name={name} onBack={() => setShowSummary(false)} sessions={sessions} />;
  }

  if (showSettings) {
    return (
      <>
        <SettingsSheet visible onClose={() => setShowSettings(false)}>
          <SettingsScreen
            name={name} onRename={renameUser}
            mode={mode} onSetMode={(m) => { setMode(m); store.set("mode", m); }}
            noEquipment={noEquipment} onToggleEquipment={toggleEquipment}
            voiceOn={voiceOn} onToggleVoice={() => setVoiceOn((v) => { const next = !v; store.set("voice", next); return next; })}
            darkMode={darkMode} onToggleDarkMode={toggleDarkMode}
            installPrompt={installPrompt} appInstalled={appInstalled} onInstallApp={installApp}
            sessions={sessions} onCleanOld={cleanOldSessions} onWipeAll={wipeAllData}
            onShowSummary={() => setShowSummary(true)}
            showConfirm={showConfirm}
          />
        </SettingsSheet>
        <ConfirmSheet
          visible={!!confirmConfig}
          title={confirmConfig?.title}
          message={confirmConfig?.message}
          confirmLabel={confirmConfig?.confirmLabel}
          confirmColor={confirmConfig?.confirmColor}
          onConfirm={() => { confirmConfig?.onConfirm?.(); hideConfirm(); }}
          onCancel={hideConfirm}
        />
      </>
    );
  }

  if (live) {
    return (
      <ActiveSession
        plan={live}
        streak={streak}
        sessions={sessions}
        onSave={saveSession}
        onSaveNote={updateSessionNote}
        onClose={() => { setLive(null); setTab("inicio"); }}
        name={name}
        onMentor={triggerMentor}
        voiceOn={voiceOn}
      />
    );
  }

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
          background: "rgba(120,120,130,0.12)", borderBottom: "1px solid rgba(120,120,130,0.3)",
          color: C.mut, fontSize: 12, fontWeight: 600,
        }}>
          📵 Sin conexión
        </div>
      )}
      {toast && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50, textAlign: "center", padding: "6px 32px 6px 10px",
          background: "rgba(0,229,255,0.15)", borderBottom: "1px solid rgba(0,229,255,0.4)",
          color: C.cyan, fontSize: 12, fontWeight: 700,
        }}>
          {toast}
          <button
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.cyan, fontSize: 14, fontWeight: 800, padding: 4 }}
          >
            ✕
          </button>
        </div>
      )}
      {showNotifPrompt && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50, textAlign: "center", padding: "8px 10px",
          background: "rgba(0,229,255,0.12)", borderBottom: "1px solid rgba(0,229,255,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>🔔 ¿Activar recordatorios de F.A.S.E.?</span>
          <button
            onClick={async () => {
              try { await Notification.requestPermission(); } catch { /* no disponible */ }
              store.set("reminder_enabled", true);
              store.set("notif_dismissed", true);
              setShowNotifPrompt(false);
            }}
            style={{ fontSize: 11, fontWeight: 800, color: "#07070C", background: C.cyan, padding: "4px 10px", borderRadius: 99 }}
          >
            Activar
          </button>
          <button
            onClick={() => { store.set("notif_prompt_seen", todayKey()); setShowNotifPrompt(false); }}
            style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}
          >
            Ahora no
          </button>
          <button
            onClick={() => { store.set("notif_dismissed", true); setShowNotifPrompt(false); }}
            style={{ fontSize: 11, color: C.dim, fontWeight: 700, textDecoration: "underline" }}
          >
            No me vuelvas a preguntar
          </button>
        </div>
      )}
      {mentor && <MentorToast mentorId={mentor.id} message={mentor.message} onClose={() => setMentor(null)} />}
      <header className="header" style={{ borderBottomColor: `${accent}55`, transition: "border-color .3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          {/* Izquierda: logo */}
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, color: C.cyan }}>
            F.A.S.E.
          </div>

          {/* Centro: vacío (respiro visual) */}
          <div />

          {/* Derecha: configuración */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowSettings(true)} aria-label="Configuración" style={{ fontSize: 17, padding: 4 }}>⚙️</button>
          </div>
        </div>
      </header>

      <div key={tab} className="tab-slide">
        {calculating ? (
          <div className="screen">
            <SkeletonCard height={90} />
            <div style={{ marginTop: 10 }}><SkeletonCard height={70} /></div>
            <div style={{ marginTop: 10 }}><SkeletonCard height={70} /></div>
          </div>
        ) : (
          <>
            {tab === "inicio" && (
              <div style={{ position: "relative" }}>
                {darkMode && <ParticleBackground />}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Home
                    name={name} sessions={sessions} streak={streak}
                    onTrain={() => changeTab("entrenar")} mode={mode}
                    onStartPlan={(discId, focusId, lvlIdx) => {
                      if (discId === "cuerpo") { setYoSection("cuerpo"); changeTab("yo"); return; }
                      const p = buildPlanFor(discId, focusId, lvlIdx);
                      if (p) setLive(p);
                    }}
                    onRepeat={(session) => { const p = planFromSession(session); if (p) setLive(p); }}
                    broken={freezeInfo.broken} canFreeze={freezeInfo.canFreeze} onFreeze={useFreeze}
                    onDeleteSession={deleteSession}
                    onSaveMatch={saveSession}
                    onUpdateNote={updateSessionNote}
                  />
                </div>
              </div>
            )}
            {tab === "entrenar" && (
              <Train
                onStart={setLive} onAccent={(c) => setAccent(c || getTabAccent("entrenar"))} totalSessions={sessions.length}
                noEquipment={noEquipment} onSaveSpecial={saveSession} name={name}
                sessions={sessions} streak={streak} challenge={challenge} onSaveChallenge={saveChallenge}
                onCompleteBody={completeBody}
              />
            )}
            {tab === "yo" && (
              <YoScreen
                section={yoSection} onSection={setYoSection}
                sessions={sessions} freezes={freezes} streak={streak} onQuickStart={setLive}
                onCompleteBody={completeBody}
              />
            )}
          </>
        )}
      </div>

      <nav className="tabbar">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id} className={`tab ${active ? "on" : ""}`} onClick={() => changeTab(t.id)}
              style={{ "--glow-color": `${accent}50`, position: "relative" }}
            >
              {!visitedTabs[t.id] && (
                <span style={{ position: "absolute", top: 6, right: "28%", width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
              )}
              <span className="ico"><t.Icon color={active ? accent : C.dim} /></span>
              {t.label}
            </button>
          );
        })}
      </nav>

      {showIOSHint && (
        <div
          style={{
            position: "fixed", left: 12, right: 12, bottom: 76, zIndex: 70,
            background: C.card, border: `1px solid ${C.cyan}55`, borderRadius: 14,
            padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontSize: 22 }}>📲</span>
          <p style={{ fontSize: 12, color: C.text, flex: 1, lineHeight: 1.4 }}>
            Para instalar en iPhone: toca el ícono compartir <strong>⬆️</strong> y luego{" "}
            <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.
          </p>
          <button
            onClick={dismissIOSHint}
            aria-label="Cerrar instrucciones de instalación"
            style={{ fontSize: 14, color: C.mut, fontWeight: 800, padding: 4 }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
