import { useState } from "react";

const COLORS = {
  bg: "#0A0A0F",
  surface: "#13131A",
  card: "#1C1C26",
  border: "#2A2A38",
  accent: "#00E5FF",
  accentDim: "#00E5FF22",
  green: "#00FF85",
  greenDim: "#00FF8520",
  orange: "#FF6B2B",
  orangeDim: "#FF6B2B20",
  red: "#FF3B5C",
  redDim: "#FF3B5C20",
  text: "#F0F0F5",
  textMuted: "#7A7A9A",
  textDim: "#4A4A6A",
};

const NAV_ITEMS = [
  { id: "home", icon: "⚡", label: "Hoy" },
  { id: "rutinas", icon: "🏋️", label: "Rutinas" },
  { id: "rehab", icon: "🦶", label: "Rehab" },
  { id: "futbol", icon: "⚽", label: "Fútbol" },
  { id: "nutricion", icon: "🥗", label: "Nutrición" },
];

const WEEK_PHASE = {
  phase: "FOUNDATION",
  week: 2,
  totalWeeks: 4,
  day: "Lunes",
  dayNum: 1,
};

// ─── COMPONENTS ───────────────────────────────────────────────

function PhaseBadge({ phase }) {
  const colors = {
    FOUNDATION: { bg: COLORS.accentDim, color: COLORS.accent },
    ACCUMULATION: { bg: COLORS.greenDim, color: COLORS.green },
    INTENSIFICATION: { bg: COLORS.orangeDim, color: COLORS.orange },
    DELOAD: { bg: "#ffffff15", color: "#aaa" },
  };
  const c = colors[phase] || colors.FOUNDATION;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: 10, fontWeight: 700, letterSpacing: 2,
      padding: "3px 10px", borderRadius: 20,
      border: `1px solid ${c.color}33`,
    }}>
      {phase}
    </span>
  );
}

function DifficultyDot({ level }) {
  const map = { easy: COLORS.green, medium: "#FFD600", hard: COLORS.red };
  const emoji = { easy: "🟢", medium: "🟡", hard: "🔴" };
  return <span style={{ fontSize: 13 }}>{emoji[level]}</span>;
}

function ProgressBar({ value, max, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.border, borderRadius: 99, height: 5, overflow: "hidden" }}>
      <div style={{
        width: `${(value / max) * 100}%`, height: "100%",
        background: color, borderRadius: 99,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

function StatCard({ label, value, unit, color = COLORS.accent }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 14, padding: "14px 16px", flex: 1,
    }}>
      <div style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ color, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

function ExerciseRow({ name, sets, reps, rest, difficulty, note }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: open ? COLORS.accentDim : "transparent",
        border: `1px solid ${open ? COLORS.accent + "44" : COLORS.border}`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 8,
        cursor: "pointer", transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <DifficultyDot level={difficulty} />
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{name}</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
            {sets} series · {reps} · {rest}s descanso
          </div>
        </div>
        <span style={{ color: COLORS.textDim, fontSize: 18 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: `1px solid ${COLORS.border}`,
          color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6,
        }}>
          💡 {note}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ color, icon, title, subtitle }) {
  return (
    <div style={{
      background: color + "18",
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: "0 12px 12px 0",
      padding: "10px 14px", marginBottom: 12, marginTop: 20,
    }}>
      <div style={{ color, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
        {icon} {title.toUpperCase()}
      </div>
      {subtitle && <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      background: color + "20", color,
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 20, border: `1px solid ${color}33`,
    }}>{label}</span>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────

function HomeScreen() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.accentDim} 0%, transparent 60%)`,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18, padding: "20px 18px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>
              {WEEK_PHASE.day.toUpperCase()} · DÍA {WEEK_PHASE.dayNum}
            </div>
            <div style={{ color: COLORS.text, fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>
              Velocidad<br />
              <span style={{ color: COLORS.accent }}>+ Fuerza</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <PhaseBadge phase={WEEK_PHASE.phase} />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: COLORS.accent, fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
              {WEEK_PHASE.week}
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 11 }}>
              de {WEEK_PHASE.totalWeeks} sem
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Progreso del bloque</span>
            <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700 }}>50%</span>
          </div>
          <ProgressBar value={2} max={4} color={COLORS.accent} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard label="Sesión" value="95" unit="min" color={COLORS.accent} />
        <StatCard label="Semana" value="3" unit="días" color={COLORS.green} />
        <StatCard label="Tobillo" value="P1" unit="fase" color={COLORS.orange} />
      </div>

      {/* Today's plan */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>Plan de hoy</div>
        </div>
        {[
          { time: "00:00", title: "Rehabilitación", duration: "15 min", color: COLORS.orange, icon: "🦶" },
          { time: "00:15", title: "Parque — Velocidad", duration: "35 min", color: COLORS.green, icon: "🏃" },
          { time: "00:50", title: "Gym — Fuerza", duration: "50 min", color: COLORS.accent, icon: "🏋️" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "13px 16px",
            borderBottom: i < 2 ? `1px solid ${COLORS.border}` : "none",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: item.color + "20",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{item.title}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{item.duration}</div>
            </div>
            <div style={{ color: item.color, fontSize: 11, fontWeight: 700 }}>{item.time}</div>
          </div>
        ))}
      </div>

      {/* Start button */}
      <button style={{
        width: "100%", padding: "16px",
        background: `linear-gradient(135deg, ${COLORS.accent}, #0099CC)`,
        border: "none", borderRadius: 14, cursor: "pointer",
        color: "#000", fontWeight: 800, fontSize: 16, letterSpacing: 1,
      }}>
        ▶ INICIAR SESIÓN
      </button>
    </div>
  );
}

function RutinasScreen() {
  const [activeDay, setActiveDay] = useState("Lunes");
  const days = ["Lunes", "Martes", "Miérc", "Jueves", "Viernes"];

  const sampleExercises = [
    { name: "Sprint 30m con salida baja", sets: 6, reps: "1 rep", rest: 90, difficulty: "hard", note: "CNS fresco — máxima velocidad. Tiempo cada rep. Salida de 3 puntos." },
    { name: "Cambios de dirección 5-10-5", sets: 5, reps: "3 reps", rest: 60, difficulty: "medium", note: "Cono central a 5m cada lado. Enfócate en el primer paso explosivo." },
    { name: "Saltos de valla lateral", sets: 4, reps: "8 reps", rest: 45, difficulty: "medium", note: "Minimiza tiempo de contacto. Rodillas suaves al aterrizar." },
  ];

  const gymExercises = [
    { name: "Sentadilla con barra", sets: 4, reps: "5 reps", rest: 180, difficulty: "hard", note: "Fuerza máxima. 85% 1RM. Pausa 1s en fondo." },
    { name: "Press banca inclinado", sets: 4, reps: "6 reps", rest: 120, difficulty: "medium", note: "45° inclinación. Escápulas retraídas todo el movimiento." },
    { name: "Jalón al pecho agarre ancho", sets: 3, reps: "10 reps", rest: 90, difficulty: "easy", note: "Codo a cadera en el fondo. Contracción 1s." },
  ];

  return (
    <div>
      <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Rutinas</div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>Selecciona el día</div>

      {/* Day selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
        {days.map(d => (
          <button key={d} onClick={() => setActiveDay(d)} style={{
            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: activeDay === d ? COLORS.accent : COLORS.card,
            color: activeDay === d ? "#000" : COLORS.textMuted,
            fontWeight: activeDay === d ? 700 : 500,
            fontSize: 13, whiteSpace: "nowrap",
            border: `1px solid ${activeDay === d ? COLORS.accent : COLORS.border}`,
            transition: "all 0.15s",
          }}>{d}</button>
        ))}
      </div>

      {/* Focus tags */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <Tag label="🧠 CNS Máximo" color={COLORS.accent} />
        <Tag label="⚡ Velocidad" color={COLORS.green} />
        <Tag label="💪 Fuerza Max" color={COLORS.orange} />
      </div>

      <SectionHeader color={COLORS.green} icon="🟩" title="Parque — Velocidad" subtitle="Primero · CNS fresco · 35 min" />
      {sampleExercises.map((ex, i) => <ExerciseRow key={i} {...ex} />)}

      <SectionHeader color={COLORS.accent} icon="🟦" title="Gym — Fuerza" subtitle="Segundo · 50 min" />
      {gymExercises.map((ex, i) => <ExerciseRow key={i} {...ex} />)}
    </div>
  );
}

function RehabScreen() {
  const [ankle, setAnkle] = useState("acute");

  return (
    <div>
      <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Rehabilitación</div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>Protocolo bilateral de tobillos</div>

      {/* Ankle selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { id: "acute", label: "Tobillo Agudo", phase: "Fase 1", color: COLORS.red },
          { id: "chronic", label: "Tobillo Crónico", phase: "Fase 2+", color: COLORS.orange },
        ].map(a => (
          <button key={a.id} onClick={() => setAnkle(a.id)} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
            background: ankle === a.id ? a.color + "25" : COLORS.card,
            border: `1px solid ${ankle === a.id ? a.color : COLORS.border}`,
            transition: "all 0.15s",
          }}>
            <div style={{ color: ankle === a.id ? a.color : COLORS.textMuted, fontWeight: 700, fontSize: 13 }}>{a.label}</div>
            <div style={{ color: ankle === a.id ? a.color + "AA" : COLORS.textDim, fontSize: 11, marginTop: 2 }}>{a.phase}</div>
          </button>
        ))}
      </div>

      {ankle === "acute" ? (
        <>
          <div style={{
            background: COLORS.redDim, border: `1px solid ${COLORS.red}33`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 16,
            display: "flex", gap: 10, alignItems: "center",
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ color: COLORS.red, fontSize: 13 }}>
              Dolor en reposo presente. Trabaja primero y con más cuidado.
            </div>
          </div>
          <SectionHeader color={COLORS.red} icon="🟥" title="Fase 1 — Agudo" subtitle="Sin carga · Movilidad pasiva" />
          {[
            { name: "Círculos de tobillo pasivos", sets: 3, reps: "10 cada dir", rest: 30, difficulty: "easy", note: "Sin dolor. Rango mínimo y creciente. Sentado." },
            { name: "Bombas de tobillo (flexión/extensión)", sets: 3, reps: "15 reps", rest: 30, difficulty: "easy", note: "Activa circulación. Despacio, sin forzar el rango." },
            { name: "Letras del alfabeto con pie", sets: 2, reps: "1 set completo", rest: 45, difficulty: "easy", note: "Control motor fino. Parar si hay dolor agudo." },
          ].map((ex, i) => <ExerciseRow key={i} {...ex} />)}
        </>
      ) : (
        <>
          <SectionHeader color={COLORS.orange} icon="🟧" title="Fase 2 — Estabilidad" subtitle="Carga progresiva · Propiocepción" />
          {[
            { name: "Equilibrio monopodal estático", sets: 4, reps: "30 seg", rest: 30, difficulty: "medium", note: "Ojos cerrados cuando domines con ojos abiertos." },
            { name: "Calf raises excéntricos", sets: 3, reps: "12 reps", rest: 45, difficulty: "medium", note: "Subida bilateral, bajada unilateral. 3 seg excéntrico." },
            { name: "Lateral band walks", sets: 3, reps: "15 pasos c/lado", rest: 45, difficulty: "medium", note: "Banda sobre rodillas. Postura futbolista." },
          ].map((ex, i) => <ExerciseRow key={i} {...ex} />)}
        </>
      )}
    </div>
  );
}

function FutbolScreen() {
  const positions = ["Portero", "Defensa Central", "Lateral", "Mediocampista", "Extremo", "Delantero"];
  const [selected, setSelected] = useState(null);

  if (selected !== null) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{
          background: "none", border: "none", color: COLORS.accent,
          fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 6,
        }}>← Volver</button>
        <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{positions[selected]}</div>
        <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>Entrenamiento individual · Pared de cancha</div>

        <SectionHeader color={COLORS.green} icon="⚽" title="Técnica" subtitle="15–20 min" />
        {[
          { name: "Control orientado contra pared", sets: 4, reps: "2 min", rest: 30, difficulty: "medium", note: "Lanza a la pared, orienta al primer toque hacia espacio imaginario." },
          { name: "Pase a 1 toque — alternando piernas", sets: 3, reps: "3 min", rest: 45, difficulty: "easy", note: "Pie derecho e izquierdo en secuencia. Mantén balón bajo." },
        ].map((ex, i) => <ExerciseRow key={i} {...ex} />)}

        <SectionHeader color={COLORS.accent} icon="🧠" title="Táctica individual" subtitle="10 min" />
        {[
          { name: "Movimientos sin balón + sprint a recepción", sets: 5, reps: "1 rep", rest: 60, difficulty: "hard", note: "Visualiza al oponente. Sprint de 10m para recibir balón imaginario." },
        ].map((ex, i) => <ExerciseRow key={i} {...ex} />)}
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Técnica Fútbol</div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>Selecciona una posición</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {positions.map((pos, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: "16px 14px", cursor: "pointer",
            textAlign: "left", transition: "all 0.15s",
          }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>
              {["🧤","🛡️","↔️","⚙️","🏃","🎯"][i]}
            </div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{pos}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 3 }}>Solo · Pared</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NutricionScreen() {
  const [plan, setPlan] = useState("A");

  const plans = {
    A: {
      label: "Plan A — Completo",
      color: COLORS.green,
      desc: "Ingredientes disponibles · Recetas completas",
      meals: [
        { time: "07:00", name: "Desayuno power", kcal: 650, items: ["Avena con leche", "3 huevos revueltos", "Plátano + miel"] },
        { time: "10:00", name: "Pre-entreno", kcal: 300, items: ["Arroz + pollo", "Manzana"] },
        { time: "13:30", name: "Post-entreno", kcal: 750, items: ["Arroz integral", "Pechuga 200g", "Brócoli + aceite oliva"] },
        { time: "16:30", name: "Merienda", kcal: 400, items: ["Pan integral", "Atún", "Yogur griego"] },
        { time: "20:00", name: "Cena", kcal: 600, items: ["Pasta integral", "Carne molida", "Ensalada"] },
      ],
    },
    B: {
      label: "Plan B — Simplificado",
      color: COLORS.accent,
      desc: "Tiempo limitado · Rotación fácil",
      meals: [
        { time: "07:00", name: "Desayuno rápido", kcal: 500, items: ["Tortillas + huevos", "Café con leche"] },
        { time: "12:00", name: "Almuerzo", kcal: 700, items: ["Frijoles + arroz", "Pollo asado"] },
        { time: "19:00", name: "Cena", kcal: 550, items: ["Sopa de pollo", "Pan integral"] },
      ],
    },
    C: {
      label: "Plan C — Emergencia",
      color: COLORS.orange,
      desc: "Sin tiempo · Suplementos de respaldo",
      meals: [
        { time: "Mañana", name: "Shake completo", kcal: 400, items: ["Proteína whey", "Leche + plátano", "Avena en polvo"] },
        { time: "Tarde", name: "Lo que haya", kcal: 500, items: ["Atún en lata", "Galletas integrales", "Fruta"] },
        { time: "Noche", name: "Shake nocturno", kcal: 350, items: ["Caseína o whey", "Maní"] },
      ],
    },
  };

  const active = plans[plan];
  const totalKcal = active.meals.reduce((s, m) => s + m.kcal, 0);

  return (
    <div>
      <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Nutrición</div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>Selecciona tu plan del día</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["A", "B", "C"].map(p => (
          <button key={p} onClick={() => setPlan(p)} style={{
            flex: 1, padding: "10px", borderRadius: 12, border: "none", cursor: "pointer",
            background: plan === p ? plans[p].color + "25" : COLORS.card,
            border: `1px solid ${plan === p ? plans[p].color : COLORS.border}`,
            color: plan === p ? plans[p].color : COLORS.textMuted,
            fontWeight: 700, fontSize: 14, transition: "all 0.15s",
          }}>Plan {p}</button>
        ))}
      </div>

      <div style={{
        background: active.color + "15", border: `1px solid ${active.color}33`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: active.color, fontWeight: 700, fontSize: 13 }}>{active.label}</div>
          <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{active.desc}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: active.color, fontWeight: 800, fontSize: 20 }}>{totalKcal}</div>
          <div style={{ color: COLORS.textMuted, fontSize: 10 }}>kcal total</div>
        </div>
      </div>

      {active.meals.map((meal, i) => (
        <div key={i} style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 12, padding: "13px 14px", marginBottom: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{meal.name}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: active.color, fontSize: 12, fontWeight: 700 }}>{meal.kcal} kcal</span>
              <span style={{ color: COLORS.textDim, fontSize: 12 }}>{meal.time}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {meal.items.map((item, j) => (
              <span key={j} style={{
                background: COLORS.border, color: COLORS.textMuted,
                fontSize: 11, padding: "3px 9px", borderRadius: 20,
              }}>{item}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("home");

  const screens = {
    home: <HomeScreen />,
    rutinas: <RutinasScreen />,
    rehab: <RehabScreen />,
    futbol: <FutbolScreen />,
    nutricion: <NutricionScreen />,
  };

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 18px 14px",
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, background: COLORS.bg + "EE",
        backdropFilter: "blur(12px)", zIndex: 10,
      }}>
        <div>
          <div style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>ELITE TRAINING</div>
          <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1 }}>Semana 2 · Foundation</div>
        </div>
        <div style={{
          background: COLORS.accentDim, border: `1px solid ${COLORS.accent}33`,
          borderRadius: 20, padding: "4px 12px",
          color: COLORS.accent, fontSize: 11, fontWeight: 700,
        }}>🎯 CL LEVEL</div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {screens[screen]}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: COLORS.surface + "F5", backdropFilter: "blur(16px)",
        borderTop: `1px solid ${COLORS.border}`,
        display: "flex",
      }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)} style={{
            flex: 1, padding: "10px 0 14px", border: "none", background: "none",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              color: screen === item.id ? COLORS.accent : COLORS.textDim,
              transition: "color 0.15s",
            }}>{item.label}</span>
            {screen === item.id && (
              <div style={{
                position: "absolute", bottom: 0,
                width: 24, height: 2, background: COLORS.accent, borderRadius: 99,
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
