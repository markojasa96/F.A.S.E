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
      /* sin storage disponible */
    }
  },
};

/* ─── Niveles de entrenamiento ─── */
const LEVELS = [
  { name: "Novato", emoji: "🔵", color: C.blue },
  { name: "Amateur", emoji: "🟢", color: C.green },
  { name: "Destacado", emoji: "🟡", color: C.yellow },
  { name: "Honorable", emoji: "🟠", color: C.orange },
  { name: "Leyenda", emoji: "🔴", color: C.red },
  { name: "THE ONE", emoji: "⚡", color: C.purple },
];

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

/* ─── Base de ejercicios ───
   t: peso | reps | tiempo · f: enfoques · lv: [nivel mín, nivel máx] 0-5 */
const EXDB = {
  gimnasio: [
    { n: "Press banca con barra", t: "peso", f: ["pecho"], lv: [1, 5], s: 4, r: "6-10", rest: 120, tip: "Baja la barra al pecho con control, codos a 45°." },
    { n: "Press banca con mancuernas", t: "peso", f: ["pecho"], lv: [0, 3], s: 3, r: "8-12", rest: 90, tip: "Recorrido completo, junta las mancuernas arriba sin chocarlas." },
    { n: "Press inclinado con mancuernas", t: "peso", f: ["pecho"], lv: [0, 5], s: 3, r: "8-12", rest: 90, tip: "Banco a 30°, no arquees la zona lumbar." },
    { n: "Aperturas con mancuernas", t: "peso", f: ["pecho"], lv: [0, 4], s: 3, r: "10-15", rest: 60, tip: "Codos ligeramente flexionados, siente el estiramiento del pecho." },
    { n: "Cruce de poleas", t: "peso", f: ["pecho"], lv: [1, 5], s: 3, r: "12-15", rest: 60, tip: "Contrae el pecho al cerrar, controla la vuelta." },
    { n: "Press banca con pausa", t: "peso", f: ["pecho"], lv: [3, 5], s: 4, r: "4-6", rest: 180, tip: "Pausa de 1 segundo en el pecho antes de empujar." },
    { n: "Jalón al pecho", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Lleva la barra a la clavícula con el pecho arriba." },
    { n: "Dominadas", t: "reps", f: ["espalda"], lv: [1, 3], s: 4, r: "5-10", rest: 120, tip: "Barbilla sobre la barra, baja hasta extender los brazos." },
    { n: "Dominadas lastradas", t: "peso", f: ["espalda"], lv: [3, 5], s: 4, r: "4-6", rest: 150, tip: "Añade peso al cinturón, mantén el control al bajar." },
    { n: "Remo con barra", t: "peso", f: ["espalda"], lv: [1, 5], s: 4, r: "6-10", rest: 120, tip: "Torso a 45°, tira hacia el ombligo sin dar tirones." },
    { n: "Remo con mancuerna a una mano", t: "peso", f: ["espalda"], lv: [0, 4], s: 3, r: "8-12", rest: 90, tip: "Apoya la rodilla en el banco, espalda recta." },
    { n: "Remo en polea baja", t: "peso", f: ["espalda"], lv: [0, 3], s: 3, r: "10-12", rest: 90, tip: "Saca pecho y lleva los codos atrás pegados al cuerpo." },
    { n: "Peso muerto convencional", t: "peso", f: ["espalda", "piernas"], lv: [2, 5], s: 4, r: "3-6", rest: 210, tip: "Espalda neutra, empuja el suelo con las piernas." },
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
    { n: "Sentadilla con barra", t: "peso", f: ["piernas", "gluteos"], lv: [1, 5], s: 4, r: "5-8", rest: 180, tip: "Pecho arriba, baja todo lo que tu movilidad permita." },
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
  ],
  calistenia: [
    { n: "Flexiones con rodillas", t: "reps", f: ["empuje"], lv: [0, 0], s: 3, r: "8-12", rest: 60, tip: "Cuerpo alineado de rodillas a cabeza, pecho al suelo." },
    { n: "Flexiones", t: "reps", f: ["empuje"], lv: [0, 2], s: 3, r: "10-20", rest: 60, tip: "Cuerpo en línea recta, codos a 45° del torso." },
    { n: "Flexiones diamante", t: "reps", f: ["empuje"], lv: [1, 4], s: 3, r: "8-15", rest: 90, tip: "Manos juntas formando un diamante bajo el pecho." },
    { n: "Flexiones declinadas", t: "reps", f: ["empuje"], lv: [2, 4], s: 3, r: "10-15", rest: 90, tip: "Pies elevados en un banco o muro bajo." },
    { n: "Flexiones arqueras", t: "reps", f: ["empuje"], lv: [3, 5], s: 4, r: "6 c/lado", rest: 120, tip: "Un brazo empuja, el otro se extiende recto al lado." },
    { n: "Pike push-ups", t: "reps", f: ["empuje"], lv: [1, 3], s: 3, r: "8-12", rest: 90, tip: "Cadera alta en V invertida, baja la cabeza entre las manos." },
    { n: "Flexiones de pino en pared", t: "reps", f: ["empuje"], lv: [3, 5], s: 4, r: "4-8", rest: 150, tip: "Pies apoyados en la pared, baja la cabeza con control." },
    { n: "Fondos en banco", t: "reps", f: ["empuje"], lv: [0, 2], s: 3, r: "10-15", rest: 60, tip: "Manos en el borde, baja hasta codos a 90°." },
    { n: "Fondos en paralelas", t: "reps", f: ["empuje"], lv: [2, 4], s: 4, r: "8-12", rest: 120, tip: "Baja hasta que el hombro pase la línea del codo." },
    { n: "Flexiones a una mano (progresión)", t: "reps", f: ["empuje"], lv: [4, 5], s: 4, r: "3-5 c/lado", rest: 180, tip: "Piernas muy abiertas, la mano libre en la espalda." },
    { n: "Remo invertido", t: "reps", f: ["tiron"], lv: [0, 2], s: 3, r: "8-12", rest: 90, tip: "Bajo una barra baja o mesa firme, pecho a la barra." },
    { n: "Dominadas asistidas", t: "reps", f: ["tiron"], lv: [0, 1], s: 3, r: "5-8", rest: 120, tip: "Usa banda elástica, o salta y baja muy lento." },
    { n: "Dominadas", t: "reps", f: ["tiron"], lv: [2, 4], s: 4, r: "6-10", rest: 120, tip: "Desde brazos extendidos, barbilla sobre la barra." },
    { n: "Dominadas supinas", t: "reps", f: ["tiron"], lv: [1, 4], s: 3, r: "6-10", rest: 120, tip: "Palmas hacia ti: más trabajo de bíceps." },
    { n: "Dominadas arqueras", t: "reps", f: ["tiron"], lv: [4, 5], s: 4, r: "4 c/lado", rest: 180, tip: "Sube hacia una mano con el otro brazo casi recto." },
    { n: "Muscle-up (progresión)", t: "reps", f: ["tiron", "explosivo"], lv: [4, 5], s: 4, r: "3-5", rest: 180, tip: "Dominada explosiva y transición por encima de la barra." },
    { n: "Colgado activo", t: "tiempo", f: ["tiron"], lv: [0, 3], s: 3, r: "20-40s", rest: 60, tip: "Cuelga de la barra hundiendo los hombros hacia abajo." },
    { n: "Plancha", t: "tiempo", f: ["core"], lv: [0, 2], s: 3, r: "30-45s", rest: 45, tip: "Aprieta glúteos y abdomen, no dejes caer la cadera." },
    { n: "Plancha lateral", t: "tiempo", f: ["core"], lv: [0, 3], s: 3, r: "20-30s c/lado", rest: 45, tip: "Cuerpo en línea, cadera alta todo el tiempo." },
    { n: "Crunch bicicleta", t: "reps", f: ["core"], lv: [0, 2], s: 3, r: "15 c/lado", rest: 45, tip: "Codo a la rodilla contraria, lento y controlado." },
    { n: "Elevaciones de piernas tumbado", t: "reps", f: ["core"], lv: [0, 2], s: 3, r: "10-15", rest: 60, tip: "Lumbar pegada al suelo, baja las piernas sin tocarlo." },
    { n: "Elevaciones de piernas colgado", t: "reps", f: ["core"], lv: [2, 4], s: 3, r: "8-12", rest: 90, tip: "Sin balanceo, sube las piernas rectas o las rodillas." },
    { n: "Hollow body hold", t: "tiempo", f: ["core"], lv: [1, 4], s: 3, r: "20-40s", rest: 60, tip: "Forma de banana: lumbar al suelo, brazos y piernas extendidos." },
    { n: "L-sit (progresión)", t: "tiempo", f: ["core"], lv: [3, 5], s: 4, r: "10-20s", rest: 90, tip: "En paralelas o en el suelo, piernas rectas al frente." },
    { n: "Dragon flag (progresión)", t: "reps", f: ["core"], lv: [4, 5], s: 3, r: "5-8", rest: 120, tip: "Sujétate de un poste y baja el cuerpo recto sin quebrar la cadera." },
    { n: "Sentadillas", t: "reps", f: ["piernas"], lv: [0, 1], s: 3, r: "15-25", rest: 60, tip: "Baja profundo con los talones en el suelo." },
    { n: "Zancadas alternadas", t: "reps", f: ["piernas"], lv: [0, 2], s: 3, r: "10 c/pierna", rest: 60, tip: "Paso largo y torso vertical." },
    { n: "Sentadilla búlgara", t: "reps", f: ["piernas"], lv: [1, 4], s: 3, r: "10 c/pierna", rest: 90, tip: "Pie trasero apoyado en banco o muro bajo." },
    { n: "Sentadilla sissy", t: "reps", f: ["piernas"], lv: [2, 4], s: 3, r: "8-12", rest: 90, tip: "Rodillas adelante y talones arriba; sujétate si hace falta." },
    { n: "Pistol squat asistida", t: "reps", f: ["piernas"], lv: [2, 4], s: 3, r: "5 c/pierna", rest: 120, tip: "Sujétate de un poste y baja a una pierna." },
    { n: "Pistol squat", t: "reps", f: ["piernas"], lv: [4, 5], s: 4, r: "5 c/pierna", rest: 120, tip: "Una pierna extendida al frente, baja completo." },
    { n: "Puente de glúteos a una pierna", t: "reps", f: ["piernas"], lv: [1, 3], s: 3, r: "12 c/pierna", rest: 60, tip: "Empuja con el talón y aguanta la cadera arriba 2 segundos." },
    { n: "Elevación de talones a una pierna", t: "reps", f: ["piernas"], lv: [0, 4], s: 3, r: "15 c/pierna", rest: 45, tip: "En un escalón: estira abajo y pausa arriba." },
    { n: "Burpees", t: "reps", f: ["explosivo"], lv: [0, 3], s: 3, r: "10-15", rest: 60, tip: "Pecho al suelo y salto con palmada arriba." },
    { n: "Sentadillas con salto", t: "reps", f: ["explosivo", "piernas"], lv: [0, 3], s: 3, r: "10-12", rest: 60, tip: "Aterriza suave con las rodillas flexionadas." },
    { n: "Flexiones con aplauso", t: "reps", f: ["explosivo", "empuje"], lv: [2, 5], s: 4, r: "6-10", rest: 120, tip: "Empuja explosivo, aplaude y amortigua la caída." },
    { n: "Zancadas con salto", t: "reps", f: ["explosivo", "piernas"], lv: [1, 4], s: 3, r: "8 c/pierna", rest: 90, tip: "Cambia de pierna en el aire y aterriza estable." },
    { n: "Mountain climbers sprint", t: "tiempo", f: ["explosivo", "core"], lv: [0, 2], s: 3, r: "30s", rest: 45, tip: "Rodillas al pecho lo más rápido que puedas." },
    { n: "Burpee con rodillas al pecho", t: "reps", f: ["explosivo"], lv: [3, 5], s: 4, r: "8-12", rest: 90, tip: "En el salto, lleva las rodillas hasta el pecho." },
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
  ],
};

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
function genRoutine(discId, focusId, lvlIdx, seed = 0) {
  const rnd = mulberry32(seed);
  const db = EXDB[discId];
  const focus = DISCIPLINES[discId].focuses.find((f) => f.id === focusId);
  const matchFocus = (e) => !focus.tags || e.f.some((t) => focus.tags.includes(t));

  let pool = db.filter((e) => matchFocus(e) && e.lv[0] <= lvlIdx && lvlIdx <= e.lv[1]);
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
  }));
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
          style={{
            height: 64, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`,
            fontSize: 22, fontWeight: 800, color: k === "⌫" ? C.red : C.text,
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

/* Área de demostración: cuando exista un GIF real, pasar src={url} */
function ExerciseDemo({ emoji, src }) {
  return (
    <div
      style={{
        width: "100%", aspectRatio: "16 / 9", maxHeight: 200, borderRadius: 14,
        background: "#1A1A2E", border: `1px solid ${C.border}`, overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12,
      }}
    >
      {src ? (
        <img src={src} alt="Demostración del ejercicio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          <span style={{ fontSize: 40 }}>{emoji}</span>
          <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>Demostración próximamente</span>
        </>
      )}
    </div>
  );
}

function Heatmap({ sessions, color }) {
  const days = useMemo(() => {
    const set = new Set(sessions.map((s) => dayKey(s.ts)));
    const arr = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(set.has(dayKey(d.getTime())));
    }
    return arr;
  }, [sessions]);
  const month = new Date().toLocaleDateString("es", { month: "long", year: "numeric" });
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.mut }}>ACTIVIDAD</span>
        <span style={{ fontSize: 12, color: C.mut, textTransform: "capitalize" }}>{month}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginTop: 10 }}>
        {days.map((active, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1", borderRadius: 6,
              background: active ? color : "#1A1A2E",
              border: `1px solid ${active ? color : C.border}`,
              transition: "background .3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8, textAlign: "right" }}>Últimos 35 días</div>
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
        <span style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>
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
function Welcome({ onDone }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const n = value.trim();
    if (n) onDone(n);
  };
  return (
    <div
      className="fade-up"
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 28,
        gap: 12,
      }}
    >
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
        <p style={{ color: C.mut, fontSize: 14, marginTop: 8 }}>
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
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <button
        className="btn-xl"
        disabled={!value.trim()}
        onClick={submit}
        style={{ background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`, color: "#07070C", marginTop: 8 }}
      >
        COMENZAR
      </button>
      <p style={{ color: C.dim, fontSize: 12, textAlign: "center", marginTop: 8 }}>
        Sin cuentas ni correos. Todo se guarda solo en tu dispositivo.
      </p>
    </div>
  );
}

/* ─── INICIO ─── */
function Home({ name, sessions, streak, unlockedHeroes, onTrain, broken, canFreeze, onFreeze }) {
  const hero = heroForStreak(streak);
  const nextHero = HEROES.find((h) => h.days > streak);
  const recent = sessions.slice(-5).reverse();

  /* Resumen semanal (desde el lunes) */
  const weekList = sessions.filter((s) => s.ts >= startOfWeek());
  const week = weekList.length;
  const weekSets = weekList
    .filter((s) => s.kind === "entreno")
    .flatMap((s) => s.exercises.flatMap((e) => e.sets))
    .filter((st) => st.ok);
  const weekKg = Math.round(weekSets.reduce((a, st) => a + st.weight * st.reps, 0));

  return (
    <div className="screen">
      <p style={{ fontSize: 22, fontWeight: 800 }}>
        Hola, <span style={{ color: C.cyan }}>{name}</span> 👋
      </p>
      <p className="muted" style={{ marginTop: 2 }}>Tu momento es ahora.</p>

      {/* Héroe */}
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
              <div key={h.id} style={{ textAlign: "center", opacity: has ? 1 : 0.35 }} title={h.name}>
                <div style={{ fontSize: 20, filter: has ? "none" : "grayscale(1)" }}>{has ? h.emoji : "🔒"}</div>
                <div style={{ fontSize: 9, color: has ? C.mut : C.dim, marginTop: 2 }}>{h.days}d</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Racha (o mensaje motivacional si se rompió) */}
      {broken ? (
        <div className="card fade-up" style={{ marginTop: 12, textAlign: "center", padding: "20px 16px" }}>
          <div style={{ fontSize: 34 }}>🌅</div>
          <p style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>
            Tu racha se rompió en {broken.lost} {broken.lost === 1 ? "día" : "días"}. ¿Empezamos una nueva?
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
              style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.cyan}55`, color: C.cyan, fontSize: 14, padding: 13 }}
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
      <Heatmap sessions={sessions} color={hero.color} />

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
            <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span style={{ fontSize: 24 }}>{isBody ? sec?.icon || "🧘" : disc?.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {isBody ? `Cuerpo · ${sec?.name || ""}` : disc?.label}
                </div>
                <div style={{ fontSize: 12, color: C.mut }}>
                  {isBody ? "Acondicionamiento" : `${s.focusLabel} · ${LEVELS[s.levelIdx].emoji} ${LEVELS[s.levelIdx].name}`}
                </div>
              </div>
              <span style={{ fontSize: 12, color: C.dim }}>{fmtDate(s.ts)}</span>
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

function Train({ onStart, onAccent, totalSessions }) {
  const [discId, setDiscId] = useState(null);
  const [focusId, setFocusId] = useState("todo");
  const [lvlIdx, setLvlIdx] = useState(null);
  const [seed, setSeed] = useState(0);
  /* La energía elegida se recuerda durante el día */
  const [energy, setEnergy] = useState(() => {
    const saved = store.get("energy", null);
    return saved && saved.day === todayKey() ? saved.value : null;
  });

  const chooseEnergy = (v) => {
    setEnergy(v);
    store.set("energy", { day: todayKey(), value: v });
  };

  const pickDisc = (id) => {
    setDiscId(id);
    setFocusId("todo");
    setLvlIdx(null);
    onAccent(id.startsWith("futbol") ? C.orange : DISCIPLINES[id].color);
  };
  const backToDiscs = () => {
    setDiscId(null);
    onAccent(null);
  };

  const disc = discId ? DISCIPLINES[discId] : null;

  const routine = useMemo(() => {
    if (!discId || lvlIdx === null) return null;
    /* Con poca energía: un nivel menos y una serie menos por ejercicio */
    const effLvl = energy === "low" ? Math.max(0, lvlIdx - 1) : lvlIdx;
    /* Semilla automática: cambia cada 3 sesiones + botón "Variar" */
    const focusHash = [...(discId + focusId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const seedVal = Math.floor(totalSessions / 3) * 7919 + seed * 131 + effLvl * 17 + focusHash;
    let r = genRoutine(discId, focusId, effLvl, seedVal);
    if (energy === "low") r = r.map((e) => ({ ...e, sets: Math.max(1, e.sets - 1) }));
    if (energy === "high") r = r.map((e, i) => (i === 0 ? { ...e, sets: Math.min(6, e.sets + 1) } : e));
    return r;
  }, [discId, focusId, lvlIdx, seed, energy, totalSessions]);

  if (!discId) {
    return (
      <div className="screen">
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Entrenar</h2>
        <p className="muted" style={{ marginTop: 2 }}>Elige tu disciplina de hoy</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {Object.entries(DISCIPLINES).map(([id, d]) => (
            <button
              key={id}
              className="card fade-up"
              onClick={() => pickDisc(id)}
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
      </div>
    );
  }

  /* Pregunta rápida de energía antes de los selectores */
  if (!energy) {
    return (
      <div className="screen fade-up" style={{ textAlign: "center", paddingTop: 40 }}>
        <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 14, fontWeight: 600, padding: "4px 0", display: "block", textAlign: "left" }}>
          ‹ Disciplinas
        </button>
        <div style={{ fontSize: 44, marginTop: 20 }}>{disc.icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>¿Cómo tienes la energía hoy?</h2>
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

  return (
    <div className="screen" key={discId}>
      <button onClick={backToDiscs} style={{ color: C.mut, fontSize: 14, fontWeight: 600, padding: "4px 0" }}>
        ‹ Disciplinas
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 30 }}>{disc.icon}</span>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: disc.color }}>{disc.label}</h2>
          <p style={{ fontSize: 12, color: C.mut }}>{disc.desc}</p>
        </div>
      </div>

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
      <div className="chip-wrap">
        {LEVELS.map((l, i) => (
          <button
            key={l.name}
            className={`chip ${lvlIdx === i ? "on" : ""}`}
            style={lvlIdx === i ? { background: l.color, color: i === 5 ? "#fff" : "#07070C" } : {}}
            onClick={() => setLvlIdx(i)}
          >
            {l.emoji} {l.name}
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
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{e.name}</div>
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
              onClick={() => onStart({ discId, discLabel: disc.label, discColor: disc.color, discIcon: disc.icon, focusLabel: disc.focuses.find((f) => f.id === focusId).label, lvlIdx, exercises: routine })}
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
function ActiveSession({ plan, streak, sessions, onSave, onClose }) {
  const [exIdx, setExIdx] = useState(0);
  const [setNum, setSetNum] = useState(0);
  const [phase, setPhase] = useState("work"); // work | rest | exdone | finished
  const [restLeft, setRestLeft] = useState(0);
  const [logs, setLogs] = useState(() => plan.exercises.map(() => []));
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [field, setField] = useState(() => (plan.exercises[0].type === "peso" ? "weight" : "reps"));
  const restRef = useRef(0);

  const ex = plan.exercises[exIdx];
  const isLastEx = exIdx === plan.exercises.length - 1;
  const lvl = LEVELS[plan.lvlIdx];

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
      if (restRef.current <= 0) {
        setPhase("work");
        setSetNum((n) => n + 1);
      } else {
        setRestLeft(restRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

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
    if (field === "weight") setWeight(next);
    else setReps(next);
  };

  const logSet = (ok) => {
    if (ok && navigator.vibrate) navigator.vibrate(100);
    const entry = { reps: parseInt(reps, 10) || 0, weight: parseFloat(weight) || 0, ok };
    setLogs((prev) => prev.map((arr, i) => (i === exIdx ? [...arr, entry] : arr)));
    setReps("");
    if (setNum + 1 >= ex.sets) {
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
      const record = {
        id: Date.now(),
        ts: Date.now(),
        kind: "entreno",
        disc: plan.discId,
        focusLabel: plan.focusLabel,
        levelIdx: plan.lvlIdx,
        exercises: plan.exercises.map((e, i) => ({ name: e.name, sets: logs[i] })),
      };
      onSave(record);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setPhase("finished");
    } else {
      const nextEx = plan.exercises[exIdx + 1];
      setExIdx((i) => i + 1);
      setSetNum(0);
      setWeight("");
      setField(nextEx.type === "peso" ? "weight" : "reps");
      setPhase("work");
    }
  };

  const quit = () => {
    if (window.confirm("¿Abandonar la sesión? No se guardará el progreso.")) onClose();
  };

  /* Felicitaciones */
  if (phase === "finished") {
    const allSets = logs.flat();
    const okSets = allSets.filter((s) => s.ok).length;
    const volume = Math.round(allSets.reduce((acc, s) => acc + s.weight * s.reps, 0));
    const newStreak = streak;
    const hero = heroForStreak(newStreak);
    const justUnlocked = HEROES.find((h) => h.days === newStreak);
    return (
      <div className="screen fade-up" style={{ paddingTop: 40, textAlign: "center", paddingBottom: 30 }}>
        <div className="pop" style={{ fontSize: 70 }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginTop: 10 }}>¡FELICITACIONES!</h2>
        <p style={{ color: C.mut, marginTop: 6, fontSize: 14 }}>
          Sesión de {plan.discLabel} completada
        </p>
        {justUnlocked && (
          <div className="card pop" style={{ marginTop: 16, borderColor: C.yellow, background: "rgba(255,214,0,0.07)" }}>
            <div style={{ fontSize: 40 }}>{justUnlocked.emoji}</div>
            <div style={{ fontWeight: 800, color: C.yellow, marginTop: 4 }}>¡Héroe desbloqueado: {justUnlocked.name}!</div>
            <div style={{ fontSize: 12, color: C.mut, fontStyle: "italic" }}>“{justUnlocked.quote}”</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <StatBox label="Ejercicios" value={plan.exercises.length} accent={plan.discColor} />
          <StatBox label="Series ✓" value={okSets} accent={C.green} />
          <StatBox label="Racha 🔥" value={newStreak} accent={C.orange} />
        </div>
        {volume > 0 && (
          <div className="card" style={{ marginTop: 10, padding: "12px" }}>
            <span style={{ fontSize: 13, color: C.mut }}>Volumen total movido: </span>
            <span style={{ fontWeight: 800, color: C.cyan }}>{volume} kg</span>
          </div>
        )}
        <div className="card" style={{ marginTop: 10, padding: "14px" }}>
          <span style={{ fontSize: 26 }}>{hero.emoji}</span>
          <div style={{ fontSize: 13, color: C.mut, marginTop: 4 }}>
            {hero === EGG ? "Sigue así: tu héroe está por nacer." : `${hero.name} está orgulloso de ti.`}
          </div>
        </div>
        <button
          className="btn-xl"
          onClick={onClose}
          style={{ marginTop: 20, background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`, color: "#07070C" }}
        >
          VOLVER AL INICIO
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
          <p style={{ color: C.mut, fontSize: 15, fontWeight: 800, letterSpacing: 4 }}>DESCANSO</p>
          <div
            style={{
              fontSize: 110, fontWeight: 900, lineHeight: 1, marginTop: 14,
              color: restLeft <= 5 ? C.green : C.text, transition: "color .3s",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {restLeft}
          </div>
          <p style={{ color: C.dim, fontSize: 14, marginTop: 8 }}>segundos</p>
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
    <div className="screen" style={{ paddingBottom: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={quit} style={{ color: C.dim, fontSize: 14, fontWeight: 600 }}>✕ Salir</button>
        <span style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>
          {plan.discIcon} {plan.discLabel} · {lvl.emoji} {lvl.name}
        </span>
      </div>

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

      <div className="card fade-up" key={exIdx} style={{ marginTop: 10, borderLeft: `4px solid ${plan.discColor}` }}>
        <h2 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.25 }}>{ex.name}</h2>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          <span style={{ color: plan.discColor, fontWeight: 800 }}>{ex.sets} series</span>
          <span style={{ color: C.mut }}> × </span>
          <span style={{ fontWeight: 800 }}>{ex.reps}</span>
        </p>
        <p style={{ marginTop: 10, fontSize: 13, color: C.mut, lineHeight: 1.5 }}>💡 {ex.tip}</p>
        <ExerciseDemo emoji={plan.discIcon} src={ex.gif} />
      </div>

      {/* Series completadas */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {Array.from({ length: ex.sets }).map((_, i) => {
          const log = doneSets[i];
          return (
            <div
              key={i}
              style={{
                minWidth: 54, padding: "8px 10px", borderRadius: 12, textAlign: "center",
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

      {phase === "work" ? (
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
                  color: weight === "" && sug ? C.dim : C.text,
                }}>
                  {weight !== "" ? weight : sug ? sug.weight : "0"}
                </div>
              </button>
            )}
            <button
              onClick={() => setField("reps")}
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
              <div style={{ fontSize: 38, fontWeight: 900, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                {reps || "0"}
              </div>
            </button>
          </div>
          {ex.type === "peso" && (
            <p style={{ fontSize: 12, color: C.mut, marginTop: 8, textAlign: "center" }}>
              {sug
                ? sug.up
                  ? `💪 Completaste todo la última vez: sugerido ${sug.weight} kg (+2.5)`
                  : `Sugerido: mantener ${sug.weight} kg y asegurar la técnica`
                : "Empieza con un peso cómodo"}
            </p>
          )}
          <NumPad onKey={pressKey} />
          <button
            className="btn-xl"
            onClick={() => logSet(true)}
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

/* ─── PROGRESO ─── */
function Progress({ sessions }) {
  const [detail, setDetail] = useState(false);

  const workouts = sessions.filter((s) => s.kind === "entreno");
  const globalIdx = levelFromCount(sessions.length, [0, 10, 25, 50, 90, 150]);
  const globalLvl = LEVELS[globalIdx];
  const nextThreshold = [0, 10, 25, 50, 90, 150][globalIdx + 1];

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

  if (!detail) {
    return (
      <div className="screen">
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Progreso</h2>
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
      <button onClick={() => setDetail(false)} style={{ color: C.mut, fontSize: 14, fontWeight: 600, padding: "4px 0" }}>
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
                <div style={{ fontSize: 14, fontWeight: 700 }}>{d.label}</div>
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>¿Cómo te sientes hoy?</h2>
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
        <p style={{ color: C.mut, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
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
        <button onClick={() => { setOpenId(null); setJustDone(false); }} style={{ color: C.mut, fontSize: 14, fontWeight: 600, padding: "4px 0" }}>
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
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{it.n}</div>
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
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Cuerpo</h2>
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
              <div style={{ fontSize: 15, fontWeight: 800 }}>{b.name}</div>
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
];

const TAB_ACCENTS = {
  inicio: C.cyan,
  entrenar: C.green,
  progreso: C.purple,
  cuerpo: "#60A5FA",
};

export default function App() {
  const [name, setName] = useState(() => store.get("name", ""));
  const [sessions, setSessions] = useState(() => store.get("sessions", []));
  const [heroes, setHeroes] = useState(() => store.get("heroes", []));
  const [tab, setTab] = useState("inicio");
  const [live, setLive] = useState(null);
  const [accent, setAccent] = useState(TAB_ACCENTS.inicio);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [freezes, setFreezes] = useState(() => store.get("freezes", []));

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
    setAccent(TAB_ACCENTS[t]);
  };

  const streak = useMemo(() => calcStreak(sessions, freezes), [sessions, freezes]);

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

  const saveName = (n) => {
    setName(n);
    store.set("name", n);
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

  if (!name) return <Welcome onDone={saveName} />;

  if (live) {
    return (
      <ActiveSession
        plan={live}
        streak={streak}
        sessions={sessions}
        onSave={saveSession}
        onClose={() => { setLive(null); setTab("inicio"); }}
      />
    );
  }

  const weekCount = sessions.filter((s) => s.ts >= startOfWeek()).length;

  return (
    <>
      {!online && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50, textAlign: "center", padding: "6px 10px",
          background: "rgba(255,122,47,0.15)", borderBottom: "1px solid rgba(255,122,47,0.4)",
          color: C.orange, fontSize: 12, fontWeight: 700,
        }}>
          📵 Sin conexión — tus datos se guardan localmente
        </div>
      )}
      <header className="header" style={{ borderBottomColor: `${accent}55`, transition: "border-color .3s ease" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: accent, transition: "color .3s ease" }}>
            F.A.S.E.
          </div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Hola, {name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WeekRing done={weekCount} accent={accent} />
          <div style={{
            display: "flex", alignItems: "center", gap: 6, background: "rgba(255,122,47,0.12)",
            border: "1px solid rgba(255,122,47,0.35)", borderRadius: 99, padding: "6px 12px",
          }}>
            <span className="flame" style={{ fontSize: 15 }}>🔥</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>{streak}</span>
          </div>
        </div>
      </header>

      {tab === "inicio" && (
        <Home
          name={name} sessions={sessions} streak={streak} unlockedHeroes={unlockedHeroes}
          onTrain={() => changeTab("entrenar")}
          broken={freezeInfo.broken} canFreeze={freezeInfo.canFreeze} onFreeze={useFreeze}
        />
      )}
      {tab === "entrenar" && (
        <Train onStart={setLive} onAccent={(c) => setAccent(c || TAB_ACCENTS.entrenar)} totalSessions={sessions.length} />
      )}
      {tab === "progreso" && <Progress sessions={sessions} />}
      {tab === "cuerpo" && <Body onComplete={completeBody} />}

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
