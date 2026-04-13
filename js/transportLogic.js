/* ======================================================
   TRANSPORT LOGIC – KOMPLETNÍ LOGIKA DOPRAVY
====================================================== */

/* ======================
   DATA – TRASY
====================== */
const TRANSPORT_ROUTES = {
  "slaník-sušice": { from: "Slaník", to: "Sušice", pricing: { van: 1400, car: 960 } },
  "slaník-velké-hydčice": { from: "Slaník", to: "Velké Hydčice", pricing: { van: 930, car: 650 } },
  "slaník-katovice": { from: "Slaník", to: "Katovice", pricing: { van: 440, car: 310 } },
  "slaník-čejetice": { from: "Slaník", to: "Čejetice", pricing: { van: 460, car: 320 } },

  "sušice-slaník": { from: "Sušice", to: "Slaník", pricing: { van: 1400, car: 960 } },
  "velké-hydčice-slaník": { from: "Velké Hydčice", to: "Slaník", pricing: { van: 930, car: 650 } },
  "katovice-slaník": { from: "Katovice", to: "Slaník", pricing: { van: 440, car: 310 } },
  "čejetice-slaník": { from: "Čejetice", to: "Slaník", pricing: { van: 460, car: 320 } },

  "strakonice-slaník": {
  from: "Strakonice – nádraží",
  to: "Slaník",
  pricing: { van: 250, car: 190 }
},
"slaník-strakonice": {
  from: "Slaník",
  to: "Strakonice – nádraží",
  pricing: { van: 250, car: 310 }
}

};

/* ======================
   VOZIDLA
====================== */
const VEHICLES = {
  van: { capacity: 8, count: 2 },
  car: { capacity: 4, count: 6 }
};

/* ======================
   ČASOVÁ PRAVIDLA
====================== */
const TRANSPORT_TIME_RULES = {
  morning: "09:15",
  minReturnMinutes: 15 * 60 + 30,
  bufferMinutes: 30
};

/* ======================
   OPTIMALIZACE VLNY
====================== */
function optimizeWave(persons, routeKey) {
  const route = TRANSPORT_ROUTES[routeKey];
  if (!route || route.pricing.van === null) {
    return { persons, vehicles: {}, priceTotal: 0 };
  }

  let best = null;

  for (let v = 0; v <= VEHICLES.van.count; v++) {
    for (let c = 0; c <= VEHICLES.car.count; c++) {
      const cap = v * VEHICLES.van.capacity + c * VEHICLES.car.capacity;
      if (cap < persons || (v === 0 && c === 0)) continue;

      const price = v * route.pricing.van + c * route.pricing.car;
      const ppp = price / persons;

      if (!best || ppp < best.ppp) {
        best = {
          persons,
          vehicles: { van: v, car: c },
          priceTotal: price,
          ppp
        };
      }
    }
  }

  return best;
}

/* ======================
   VLNY
====================== */
function splitIntoWaves(persons) {
  const max =
    VEHICLES.van.count * VEHICLES.van.capacity +
    VEHICLES.car.count * VEHICLES.car.capacity;

  const res = [];
  while (persons > 0) {
    const p = Math.min(persons, max);
    res.push(p);
    persons -= p;
  }
  return res;
}

/* ======================
   HLAVNÍ FUNKCE
====================== */
function calculateTransportPlan(state) {
  const persons = state.adults + state.children;

// === DENNÍ LIMIT DOPRAVY ===
if (persons > 80) {
  return {
    waves: [],
    summary: {
      totalPersons: persons,
      totalPrice: 0,
      pricePerPerson: 0,
      contactPhone: "776 798 616"
    },
    notes: [
      "Kapacita dopravy pro tento den byla vyčerpána.",
      "Kontaktujte dopravu na tel. čísle 776 798 616.",
      "Přesný čas odjezdu se řeší individuálně s dispečerem."
    ]
  };
}


  const waves = [];
  let totalPrice = 0;

 /* === STRAKONICE ↔ SLANÍK (POUZE PUBLIC) === */
if (state.arrivalMode === "public") {

  // příjezd
  splitIntoWaves(persons).forEach(p => {
    const o = optimizeWave(p, "strakonice-slaník");
    totalPrice += o.priceTotal;

    waves.push({
      type: "arrival",
      day: 0,
      routeKey: "strakonice-slaník",
      label: "Strakonice → Slaník",
      time: "dle dohody po telefonu",
      persons: p,
      vehicles: o.vehicles
    });
  });

  // odjezd
  splitIntoWaves(persons).forEach(p => {
    const o = optimizeWave(p, "slaník-strakonice");
    totalPrice += o.priceTotal;

    waves.push({
      type: "departure",
      day: state.riverPlan.length + 1,
      routeKey: "slaník-strakonice",
      label: "Slaník → Strakonice",
      time: "dle dohody po telefonu",
      persons: p,
      vehicles: o.vehicles
    });
  });

}


    /* === VODÁCKÉ DNY === */
  state.riverPlan.forEach((s, i) => {
    const day = i + 1;

    // RÁNO – pouze pokud se nezačíná přímo ve Slaníku
    if (s.from !== "Slaník") {
      const rMorning = `slaník-${s.from.toLowerCase().replace(" ", "-")}`;
      splitIntoWaves(persons).forEach(p => {
        const o = optimizeWave(p, rMorning);
        totalPrice += o.priceTotal;

        waves.push({
          type: "morning",
          day,
          routeKey: rMorning,
          label: `Slaník → ${s.from}`,
          time: TRANSPORT_TIME_RULES.morning,
          persons: p,
          vehicles: o.vehicles
        });
      });
    }

    // ODPOLEDNE (jen když cíl není Slaník)

    if (s.to !== "Slaník") {
      const mins =
        Math.max(
          TRANSPORT_TIME_RULES.minReturnMinutes,
          Math.ceil(s.timeHours * 60) + TRANSPORT_TIME_RULES.bufferMinutes
        );

      const hh = String(Math.floor(mins / 60)).padStart(2, "0");
      const mm = String(mins % 60).padStart(2, "0");

      const rAfternoon = `${s.to.toLowerCase().replace(" ", "-")}-slaník`;
      splitIntoWaves(persons).forEach(p => {
        const o = optimizeWave(p, rAfternoon);
        totalPrice += o.priceTotal;

        waves.push({
          type: "afternoon",
          day,
          routeKey: rAfternoon,
          label: `${s.to} → Slaník`,
          time: `${hh}:${mm}`,
          persons: p,
          vehicles: o.vehicles
        });
      });
    }
  });

  return {
    waves,
    summary: {
      totalPersons: persons,
      totalPrice,
      pricePerPerson: persons ? Math.ceil(totalPrice / persons) : 0,
      contactPhone: "776 798 616"
    },
    notes: [
      "Časy během pobytu jsou orientační.",
      "Strakonice ↔ Slaník řeší klient telefonicky.",
      "Do 24 hodin vás kontaktuje operátor."
    ]
  };
}

/* ======================
   POTŘEBA DOPRAVY
====================== */
window.needsTransport = function (riverPlan) {
  if (!riverPlan || !riverPlan.length) return false;
  return riverPlan.some(s => s.from !== "Slaník" || s.to !== "Slaník");
};
