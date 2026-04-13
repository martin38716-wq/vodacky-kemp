function buildChecklist() {

  const state = window.bookingState;

  const from = state.dateFrom;
  const to = state.dateTo;
  const nights = state.nights;

  const baseDate = state.dateFrom ? new Date(state.dateFrom) : null;
  function formatDayDate(offset) {
    if (!baseDate || isNaN(baseDate)) return "";
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }


  const adults = state.adults || 0;
  const children = state.children || 0;

  const riverPlan = state.riverPlan || [];
  const transportPlan = state.transportPlan;
  const boats = state.boats?.proposal || [];

  /* === JÍDLO – JEDINÝ ZDROJ PRAVDY === */
  const hasBreakfast = state.services.breakfast || state.services.half;
  const hasDinner = state.services.half;

  /* === SPOLEČNÁ HLAŠKA === */
  const confirmationNote = `
    <small style="color:#555">
      ℹ️ Uvedené informace jsou orientační.<br>
      Operátor vše potvrdí do 24 hodin.
    </small><br>
  `;

  /* === LODĚ – SPECIFICKÁ HLAŠKA === */
  const boatsConfirmationNote = `
    <small style="color:#555">
      ℹ️ Návrh lodí je orientační.<br>
      Do 24 hodin bude potvrzen operátorem –<br>
      množství i druh lodí lze ještě upravit.<br>
      Cena bude navržena dle zvoleného způsobu platby.
    </small><br>
  `;

  let html = "";

  /* ===============================
     ZÁKLADNÍ INFORMACE
  =============================== */

  html += `
    <strong>📅 Termín pobytu</strong><br>
    ${from} – ${to}<br><br>

    <strong>🌙 Počet nocí</strong><br>
    ${nights}<br><br>

    <strong>👨‍👩‍👧 Osoby</strong><br>
    &nbsp;&nbsp;• Dospělí: ${adults}<br>
    &nbsp;&nbsp;• Děti: ${children}<br><br>
  `;

  /* ===============================
     ZVOLENÉ SLUŽBY
  =============================== */

  html += `<hr><strong>🧾 Zvolené služby</strong><br>`;
  html += `&nbsp;&nbsp;• Ubytování<br>`;
  if (hasBreakfast) html += `&nbsp;&nbsp;• Snídaně<br>`;
  if (hasDinner) html += `&nbsp;&nbsp;• Večeře (polopenze)<br>`;
  if (state.services.boats) html += `&nbsp;&nbsp;• Půjčení lodí<br>`;
  if (state.services.transport) html += `&nbsp;&nbsp;• Přeprava osob a bagáže<br>`;

  if (state.services.babysitting) {
    html += `&nbsp;&nbsp;• Hlídání dětí<br>`;
    html += confirmationNote;
  }

    if (state.services.tent) {
    html += `&nbsp;&nbsp;• Postavení a složení stanu (600 Kč / stan)<br>`;
    if (state.tents?.count) {
      html += `&nbsp;&nbsp;• Počet stanů: ${state.tents.count}<br>`;
    }
  }

  if (state.services.wood) html += `&nbsp;&nbsp;• Kolečko dřeva na oheň<br>`;


    /* ===============================
     UBYTOVÁNÍ – KONTAKT
  =============================== */

  html += `
    <hr>
    <small>
      <strong>🏕️ Provozní kempu</strong><br>
      Bc. Martin Krejčí<br>
      📞 731 537 471
    </small><br>
  `;

  // === NOVÁ SEKCE: Ceník ubytování ===
  html += `
    <hr>
    <strong>Ceník ubytování</strong><br>
    Dospělý: 160 Kč / noc Dítě (3–14 let): 90 Kč / noc Děti do 2 let: zdarma<br>
    Stan: 40 Kč / noc Se snídaní nebo polopenzí stan neúčtujeme.<br>
    Auto u stanu: 140 Kč / noc Auto na parkovišti: 70 Kč / noc<br>
    Elektřina: 180 Kč / noc<br>
    Party stan: 300 Kč / noc<br>
    Sprcha (žeton): 25 Kč<br>
    Poplatek obci: 15 Kč / osoba / noc
  `;


  /* ===============================
     LODĚ
  =============================== */

  if (state.services.boats && boats.length) {
    html += `<hr><strong>🚣 Lodě</strong><br>`;
    boats.forEach((b, i) => {
      if (b.type === "canoe") {
        html += `&nbsp;&nbsp;• Kanoe ${i + 1}: ${b.assigned.adults} dospělí`;
        if (b.assigned.children) html += ` + ${b.assigned.children} děti`;
        html += `<br>`;
      }
      if (b.type === "raft") {
        html += `&nbsp;&nbsp;• Raft ${i + 1}: ${b.assigned.adults + b.assigned.children} osob<br>`;
      }
    });
    html += boatsConfirmationNote;
  }

  /* ===============================
     DOPRAVA – CENA + VOZIDLA
  =============================== */

  if (state.services.transport && transportPlan?.summary) {
    html += `
      <hr><strong>🚌 Doprava osob</strong><br>
      &nbsp;&nbsp;• Zahrnuje všechny převozy během pobytu<br>
            &nbsp;&nbsp;• <strong>Celková cena:</strong> ${transportPlan.summary.totalPrice} Kč<br>
      &nbsp;&nbsp;• <strong>Cena na osobu:</strong> ${transportPlan.summary.pricePerPerson} Kč<br>
    `;


    let vanCount = 0;
    let carCount = 0;

    transportPlan.waves?.forEach(w => {
      if (w.vehicles?.van) vanCount = Math.max(vanCount, w.vehicles.van);
      if (w.vehicles?.car) carCount = Math.max(carCount, w.vehicles.car);
    });

    if (vanCount || carCount) {
      html += `
        <small>
          <strong>🚐 Pro vaši skupinu přijede:</strong><br>
      `;
      if (vanCount) html += `&nbsp;&nbsp;• ${vanCount}× dodávka (8 osob)<br>`;
      if (carCount) html += `&nbsp;&nbsp;• ${carCount}× osobní auto (4 osoby)<br>`;
      html += `</small><br>`;
    }

    html += confirmationNote;
  }

  /* ===============================
     PROGRAM POBYTU – TIMELINE
  =============================== */

  html += `<hr><strong>🕒 Program pobytu (časová osa)</strong><br><br>`;

  const transportByDay = {};
  if (state.services.transport && transportPlan?.waves) {
    transportPlan.waves.forEach(w => {
      if (!transportByDay[w.day]) transportByDay[w.day] = [];
      transportByDay[w.day].push(w);
    });
  }

    const day0Date = formatDayDate(0);
  html += `<strong>Den 0${day0Date ? ` – ${day0Date}` : ''} – příjezd</strong><br>`;

  if (transportByDay[0]) {
    transportByDay[0].forEach(w =>
      html += `&nbsp;&nbsp;• Ranní doprava: ${w.label} (čas dle domluvy)<br>`
    );
  }
  html += `&nbsp;&nbsp;• Ubytování<br>`;
  if (hasDinner) html += `&nbsp;&nbsp;• Večeře 17:00–22:00<br>`;
  html += `<br>`;

        riverPlan.forEach((section, i) => {
    const day = i + 1;
    const dayDate = formatDayDate(day);

    html += `<strong>Den ${day}${dayDate ? ` – ${dayDate}` : ''}</strong><br>`;

    if (hasBreakfast) html += `&nbsp;&nbsp;• Snídaně od 8:00<br>`;


    if (transportByDay[day]) {
      transportByDay[day]
        .filter(w => w.type === "morning")
        .forEach(w =>
          html += `&nbsp;&nbsp;• Ranní doprava: ${w.label} (${w.time})<br>`
        );
    }

    html += `&nbsp;&nbsp;• Vodácká trasa: ${section.name}<br>`;

    if (transportByDay[day]) {
      transportByDay[day]
        .filter(w => w.type === "afternoon")
        .forEach(w =>
          html += `&nbsp;&nbsp;• Večerní doprava: ${w.label} (${w.time})<br>`
        );
    }

    if (hasDinner) html += `&nbsp;&nbsp;• Večeře 17:00–22:00<br>`;
    html += `<br>`;
  });

        const depDay = riverPlan.length + 1;
  const depDate = formatDayDate(depDay);
  html += `<strong>Den ${depDay}${depDate ? ` – ${depDate}` : ''} – odjezd</strong><br>`;

  if (hasBreakfast) html += `&nbsp;&nbsp;• Snídaně od 8:00<br>`;

  if (transportByDay[depDay]) {
    transportByDay[depDay].forEach(w =>
      html += `&nbsp;&nbsp;• Doprava: ${w.label} (čas dle domluvy)<br>`
    );
  }

    /* ===============================
     DOPLŇUJÍCÍ INFORMACE
  =============================== */

  html += `
    <hr>
    <small style="color:#444">
      Všechny uvedené služby a orientační časy budou před pobytem
      potvrzeny nebo upřesněny telefonicky z kempu a od poskytovatelů
      služeb (lodě, doprava, hlídání dětí).
    </small>
  `;

  return html;
}

