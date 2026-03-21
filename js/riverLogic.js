/* ======================================================
   RIVER LOGIC – AUTOMATICKÝ NÁVRH VODÁCKÝCH TRAS
   ------------------------------------------------------
   - rychlost plavby: 3 km / h
   - čas = "čas strávený v lodi"
   - zaokrouhlení vždy nahoru na 30 minut
   - počet vodáckých dnů = počet nocí
   - 0 nocí → nic se nenavrhuje
   - první den vždy nejlepší úsek
   - doprava se ZDE NEŘEŠÍ
====================================================== */

const RIVER_SPEED_KMH = 3;

/* ======================================================
   DEFINICE ÚSEKŮ – KANONICKÁ DATA
====================================================== */
const riverSections = [
  {
    id: "susice-hydcice",
    from: "Sušice",
    to: "Velké Hydčice",
    km: 13,
    priority: 1,
    note: "Nejhezčí úsek, nejvíc to teče"
  },
  {
    id: "hydcice-katovice",
    from: "Velké Hydčice",
    to: "Katovice",
    km: 15,
    priority: 2,
    note: "Pomalejší tok, víc pádlování"
  },
  {
    id: "katovice-slanik",
    from: "Katovice",
    to: "Slaník",
    km: 10,
    priority: 3,
    note: "Pohodový návrat do kempu"
  },
  {
    id: "slanik-cejetice",
    from: "Slaník",
    to: "Čejetice",
    km: 9,
    priority: 4,
    note: "Krátká, klidná dojezdová etapa"
  }
];

/* ======================================================
   POMOCNÉ FUNKCE – ČAS
====================================================== */
function roundUpToHalfHour(hours) {
  return Math.ceil(hours * 2) / 2;
}

function computeBoatTime(km) {
  const rawHours = km / RIVER_SPEED_KMH;
  return roundUpToHalfHour(rawHours);
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = (hours - h) * 60;

  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/* ======================================================
   HLAVNÍ LOGIKA – AUTO NÁVRH TRAS
====================================================== */
function autoSelectRiverPlan(nights) {
  if (!nights || nights < 1) return [];

  const days = nights;
  const plan = [];

  // 1️⃣ PRVNÍ DEN – VŽDY NEJLEPŠÍ ÚSEK
  plan.push(riverSections[0]);

  // 2️⃣ DVĚ NOCI – PŘESKOK STŘEDU (TOP + NÁVRAT)
  if (days === 2) {
    plan.push(riverSections[2]);
    return enrichPlan(plan);
  }

  // 3️⃣ TŘI NOCI – KLASICKÁ POSLOUPNOST
  if (days >= 3) {
    plan.push(riverSections[1]);
    plan.push(riverSections[2]);
  }

  // 4️⃣ ČTYŘI A VÍCE NOCÍ – PŘIDÁME ČEJETICE
  if (days >= 4) {
    plan.push(riverSections[3]);
  }

  return enrichPlan(plan);
}

/* ======================================================
   OBOHACENÍ PLÁNU PRO UI / CHECKLIST / TIMELINE
====================================================== */
function enrichPlan(sections) {
  return sections.map((section, index) => {
    const hours = computeBoatTime(section.km);

    return {
      day: index + 1,
      id: section.id,
      name: `${section.from} → ${section.to}`,
      from: section.from,
      to: section.to,
      km: section.km,
      timeHours: hours,
      timeLabel: formatTime(hours),
      note: section.note
    };
  });
}

/* ======================================================
   EXPORT (pokud používáš moduly)
====================================================== */
// export { autoSelectRiverPlan };
