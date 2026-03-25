window.bookingState = {
  /* === REŽIM === */
  mode: "auto", // auto | manual

  /* === TERMÍN === */
  dateFrom: null,
  dateTo: null,
  nights: 0,

  /* === OSOBY === */
  adults: 1,
  children: 0,

  /* === KONTAKT === */
  name: "",
  nickname: "",
  phone: "",
  email: "",

    /* === SLUŽBY === */
  services: {
    accommodation: true,   // vždy povinné
    half: true,            // polopenze (AUTO předzaškrtnuto)
    breakfast: false,      // snídaně – vylučuje se s half
    transport: true,       // autodoprava (AUTO předzaškrtnuto)
    tent: false,           // postavení + složení stanu
    wood: false,           // kolečko dřeva
    boats: true,           // půjčení lodí
    babysitting: false
  },

  /* === STANY === */
  tents: {
    count: 0
  },

  /* === LODĚ === */

  boats: {
    enabled: true,
    type: "canoe", // canoe | raft
    proposal: [],
    paddles: {
      adult: 0,
      child: 0
    },
    vests: {
      adult: 0,
      child: 0
    },
    note: "Navržené lodě budou do 24 h telefonicky potvrzeny operátorem."
  },

  /* === VODÁCKÝ PROGRAM === */
  riverPlan: [],

  /* === AUTODOPRAVA === */
  transportRequired: false,
  transportPlan: [],

  /* === TIMELINE (CHECKLIST) === */
  timeline: [],

  /* === CENY (PŘIPRAVENO DO BUDOUCNA) === */
  pricing: {
    boatsEstimated: null,
    transportEstimated: null,
    accommodationEstimated: null
  }
};
