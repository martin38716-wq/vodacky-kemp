document.addEventListener("DOMContentLoaded", () => {

  const state = window.bookingState;

  /* ======================
   KROKY
   0 – režim
   1 – služby
   2 – termín
   3 – lodě
   4 – trasy
   5 – doprava
   6 – kontakt
   7 – potvrzení
====================== */


  let currentStep = 0;
  const steps = document.querySelectorAll(".rez-step");

  function showStep(n) {
    steps.forEach(s => s.classList.remove("active"));
    const step = document.querySelector(`.rez-step[data-step="${n}"]`);
    if (!step) return;
    step.classList.add("active");
    currentStep = n;
  }

  /* ======================
     STATE ← UI
  ====================== */
  function updateStateFromUI() {
    state.services = state.services || {
    transport: state.services?.transport ?? false
  };
  state.boats = state.boats || {};
    state.services.breakfast = document.getElementById("svcBreakfast")?.checked || false;
    state.services.half      = document.getElementById("svcHalf")?.checked || false;
    
    state.services.boats     = document.getElementById("svcBoats")?.checked || false;

state.services.babysitting =
  document.getElementById("svcBabysitting")?.checked || false;

    state.services.tent      = document.getElementById("svcTent")?.checked || false;
    state.services.wood      = document.getElementById("svcWood")?.checked || false;

    state.dateFrom = document.getElementById("dateFrom")?.value || null;
    state.dateTo   = document.getElementById("dateTo")?.value || null;

    state.adults   = parseInt(document.getElementById("adults")?.value, 10) || 1;
    state.children = parseInt(document.getElementById("children")?.value, 10) || 0;

    const boatType = document.querySelector('input[name="boatType"]:checked');
    state.boats.type = boatType ? boatType.value : null;
const arrival = document.querySelector('input[name="arrival"]:checked');
state.arrivalMode = arrival ? arrival.value : "car";

  }

  /* ======================
     SEZÓNA
  ====================== */
  function setSeasonLimits() {
    const from = document.getElementById("dateFrom");
    const to   = document.getElementById("dateTo");
    if (!from || !to) return;

    const year = new Date().getFullYear();
    const seasonStart = `${year}-05-15`;
    const seasonEnd   = `${year}-09-15`;

    from.min = seasonStart;
    from.max = seasonEnd;
    to.min   = seasonStart;
    to.max   = seasonEnd;
  }

  /* ======================
     PŘEPOČET
  ====================== */
  function recompute() {
    if (state.services?.boats) {
      proposeBoats(state);
      renderBoats();
    } else {
      state.boats.proposal = [];
    }

  // ======================
  // DOPRAVA – AUTO VÝPOČET
  // ======================
  if (state.services?.transport) {
    state.transportPlan = calculateTransportPlan(state);
  } else {
    state.transportPlan = null;
  }

    updateChecklistPreview();
  }

  /* ======================
     LODĚ – UI
  ====================== */
  const svcBoats = document.getElementById("svcBoats");
  const boatsBox = document.getElementById("boatsBox");

  function updateBoatsBoxVisibility() {
    if (!svcBoats || !boatsBox) return;
    boatsBox.classList.toggle("hidden", !svcBoats.checked);
  }

  if (svcBoats) {
    svcBoats.addEventListener("change", updateBoatsBoxVisibility);
  }
  updateBoatsBoxVisibility();

  function renderBoats() {
  const box = document.getElementById("boatsResult");
  if (!box) return;

  box.innerHTML = "";

  const boats = state.boats.proposal || [];

  if (!boats.length) {
    box.innerHTML = "<p>Nepodařilo se navrhnout lodě.</p>";
    return;
  }

  const title = document.createElement("p");
  title.innerHTML = `<strong>Navrhli jsme pro vás ${boats.length} lodě:</strong>`;
  box.appendChild(title);

  const ul = document.createElement("ul");

  boats.forEach(b => {
    const li = document.createElement("li");

    if (b.type === "canoe") {
      li.textContent =
        b.assigned.children > 0
          ? `Rodinná kanoe pro ${b.assigned.adults} dospělé a ${b.assigned.children} děti`
          : `Kanoe pro ${b.assigned.adults} dospělé`;
    }

    if (b.type === "raft") {
      const total = b.assigned.adults + b.assigned.children;
      li.textContent = `Raft pro ${total} osob`;
    }

    ul.appendChild(li);
  });

  box.appendChild(ul);

  const note = document.createElement("p");
  note.style.fontSize = "14px";
  note.style.color = "#555";
  note.style.marginTop = "10px";
  note.textContent =
  "Rozdělení lodí je orientační. Operátor vás do 24 hodin kontaktuje, " +
  "upřesní možnosti a sdělí cenu dle způsobu platby.";

  box.appendChild(note);
}

// ======================
// NAVRŽENÁ DOPRAVA – VÝPIS
// ======================
window.renderTransportPreview = function () {

  const box = document.getElementById("transportPreview");
  if (!box) return;

  box.innerHTML = "";

  const state = window.bookingState;
  const plan = state.transportPlan;

  if (!state.services?.transport) {
    box.innerHTML = "<p>Doprava není součástí rezervace.</p>";
    return;
  }

  if (!plan || !plan.waves || !plan.waves.length) {

  // pokud máme poznámky (např. kapacita vyčerpána), zobrazíme je
  if (plan?.notes && plan.notes.length) {
    box.innerHTML = `<p>${plan.notes.join("<br>")}</p>`;
  } else {
    box.innerHTML = "<p>Doprava bude upřesněna operátorem.</p>";
  }

  return;
}


  // seskupení dopravy podle dne
  const days = {};

  plan.waves.forEach(w => {
    if (!days[w.day]) days[w.day] = [];
    days[w.day].push(w);
  });

  // výpis po dnech
  Object.keys(days)
    .sort((a, b) => a - b)
    .forEach(dayKey => {

      const h = document.createElement("h4");
      h.textContent = `Den ${dayKey}`;
      box.appendChild(h);

      const ul = document.createElement("ul");

      days[dayKey].forEach(w => {
        const li = document.createElement("li");

       let vehicleText = "vozidla dle domluvy";

if (w.vehicles) {
  const parts = [];

  if (w.vehicles.van > 0) {
    parts.push(
      `Dodávka (8 osob): ${w.vehicles.van}×`
    );
  }

  if (w.vehicles.car > 0) {
    parts.push(
      `Osobní auto (4 osoby): ${w.vehicles.car}×`
    );
  }

  if (parts.length) {
    vehicleText = parts.join("<br>");
  }
}


        li.innerHTML = `
          <strong>${w.label}</strong><br>
          ⏱️ ${w.time}<br>
          🚐 ${vehicleText} – ${w.persons} osob
        `;

        ul.appendChild(li);
      });

      box.appendChild(ul);
    });
 
 
};




// ======================
// NAVRŽENÉ TRASY – VÝPIS
// ======================
window.renderRiverPlan = function () {
  const box = document.getElementById("riverResult");
  if (!box) return;

  box.innerHTML = "";

 const plan = window.bookingState.riverPlan || [];


  if (!plan.length) {
    box.innerHTML = "<p>Nebyly nalezeny žádné navržené trasy.</p>";
    return;
  }

  const ul = document.createElement("ul");

  plan.forEach(p => {
    const li = document.createElement("li");
    li.textContent =
      `Den ${p.day}: ${p.name} – ${p.km} km (${p.timeLabel})`;
    ul.appendChild(li);
  });

  box.appendChild(ul);
};




  /* ======================
     CHECKLIST – LIVE
  ====================== */
  function updateChecklistPreview() {
    const checklist = document.getElementById("checklist");
    const content   = document.getElementById("checklistContent");
    if (!checklist || !content) return;
    content.innerHTML = buildChecklist();
  }

  /* ======================
     MODAL
  ====================== */
  document.querySelectorAll(".rezervace-btn").forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      setSeasonLimits();
      document.getElementById("rezModal").style.display = "flex";
      showStep(0);
// ===== VÝCHOZÍ NASTAVENÍ SLUŽEB =====
state.services = {
  breakfast: false,
  half: true,
  transport: true,
  boats: true,
  tent: false,
  wood: true
};

// === VZÁJEMNÉ VYLOUČENÍ: SNÍDANĚ × POLOPENZE ===
const chkBreakfast = document.getElementById("svcBreakfast");
const chkHalf = document.getElementById("svcHalf");

if (chkBreakfast && chkHalf) {

  chkBreakfast.addEventListener("change", () => {
    if (chkBreakfast.checked) {
      chkHalf.checked = false;
    }
  });

  chkHalf.addEventListener("change", () => {
    if (chkHalf.checked) {
      chkBreakfast.checked = false;
    }
  });

}


// vizuální nastavení checkboxů – výchozí ZAŠKRTNUTO
const defaults = [
  "svcHalf",
  "svcTransport",
  "svcBoats",
  "svcWood"
];

defaults.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.checked = true;
});


// ubytování je natvrdo – jen informativní, ne checkbox

      recompute();
    };
  });

  document.querySelector(".rez-close").onclick = () => {
    document.getElementById("rezModal").style.display = "none";
  };

  /* ======================
   NEXT
====================== */
document.querySelectorAll(".next").forEach(btn => {
  btn.onclick = () => {
   
  updateStateFromUI();
  recompute();

  /* ===== VALIDACE KROKU TERMÍN ===== */
  if (currentStep === 2) {
    if (!state.dateFrom || !state.dateTo || state.dateTo <= state.dateFrom) {
      alert("Vyberte platný termín pobytu.");
      return;
    }

    state.nights = Math.round(
      (new Date(state.dateTo) - new Date(state.dateFrom)) / 86400000
    );

    state.riverPlan = autoSelectRiverPlan(state.nights);
    state.transportRequired = needsTransport(state.riverPlan);
  }

  /* ===== URČENÍ DALŠÍHO KROKU ===== */
  let nextStep = currentStep + 1;

  // přeskočení lodí
  if (nextStep === 3 && !state.services.boats) {
    nextStep = 4;
  }

  // pokud není doprava, krok 5 přeskočíme
if (nextStep === 5 && !state.services.transport) {
  nextStep = 4;
}


  

// === KROK 6 → SHRNTÍ ===
if (currentStep === 6) {

  const name  = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!name || !phone || !email) {
    alert("Vyplňte prosím všechny kontaktní údaje.");
    return;
  }

  // Formátová validace e-mailu a telefonu přímo v kroku zadání kontaktu
  function isValidEmail(emailValue) {
    if (!emailValue) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailValue);
  }

  function isValidPhone(phoneValue) {
    if (!phoneValue) return false;
    const cleaned = phoneValue.replace(/\s+/g, "");
    // Povolený formát: 123456789 nebo +420123456789
    return /^(\+420)?\d{9}$/.test(cleaned);
  }

  if (!isValidEmail(email)) {
    alert("Zadejte prosím platný e-mail ve formátu napr. uzivatel@example.com.");
    return;
  }

  if (!isValidPhone(phone)) {
    alert("Zadejte prosím platné telefonní číslo ve formátu 123456789 nebo +420 123 456 789.");
    return;
  }

  state.name = name;
  state.phone = phone;
  state.email = email;
  state.nickname = document.getElementById("nickname")?.value || "";

  updateChecklistPreview();
}


/* ===== POSUN ===== */
  showStep(nextStep);
console.log("NEXT STEP:", nextStep, "transport:", state.services.transport);


  if (nextStep === 4) window.renderRiverPlan();
  if (nextStep === 5) window.renderTransportPreview();
};

 
});

 document.querySelectorAll(".prev").forEach(btn => {
  btn.onclick = () => {
    updateStateFromUI();
    recompute();

    let prevStep = currentStep - 1;

    // návrat z dopravy na trasy
    if (currentStep === 5) {
      prevStep = 4;
      showStep(prevStep);
      window.renderRiverPlan();
      return;
    }

    // návrat přeskočeného kroku lodí
    if (currentStep === 4 && !state.services.boats) {
      prevStep = 2;
    }

    if (prevStep < 0) prevStep = 0;

    showStep(prevStep);
  };
});

 
/* ======================
   LIVE ZMĚNY (inputy)
====================== */
document.querySelectorAll("input").forEach(el => {

  el.addEventListener("change", () => {
    updateStateFromUI();
    recompute();

    // pokud jsme v kroku dopravy, hned ji překreslíme
    if (currentStep === 5) {
      window.renderTransportPreview();
    }
  });

});


});
  


document.querySelector(".confirm")?.addEventListener("click", async () => {
  const gdpr = document.getElementById("gdpr");

  if (!gdpr || !gdpr.checked) {
    alert("Pro odeslání rezervace je nutný souhlas se zpracováním údajů.");
    return;
  }

  // Dodatečná validace formátu e-mailu a telefonu
  function isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function isValidPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\s+/g, "");
    // Povolený formát: 123456789 nebo +420123456789
    return /^(\+420)?\d{9}$/.test(cleaned);
  }

  const currentState = window.bookingState || {};
  const email = currentState.email || document.getElementById("email")?.value || "";
  const phone = currentState.phone || document.getElementById("phone")?.value || "";

  if (!isValidEmail(email)) {
    alert("Zadejte prosím platný e-mail ve formátu napr. uzivatel@example.com.");
    return;
  }

  if (!isValidPhone(phone)) {
    alert("Zadejte prosím platné telefonní číslo ve formátu 123456789 nebo +420 123 456 789.");
    return;
  }

  // Jednoduché ověření, že kliká člověk – kontrolní otázka
  const challenge = prompt("Pro ověření, že nejste robot, napište součet 3 + 4:");
  if (challenge === null) {
    // Uživatel zrušil dialog
    return;
  }
  if (challenge.trim() !== "7") {
    alert("Odpověď nesouhlasí. Zkuste to prosím znovu.");
    return;
  }

  const confirmBtn = document.querySelector(".confirm");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const response = await fetch("/api/reservation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bookingState: window.bookingState })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // ignore JSON parse error, handled below
    }

    if (!response.ok || !data || data.success !== true) {
      const message = (data && data.error) || "Došlo k chybě při odesílání rezervace. Zkuste to prosím znovu.";
      alert(message);
      return;
    }

    alert(
      "Rezervace byla úspěšně odeslána.\n" +
      "Brzy vám přijde potvrzovací e-mail." +
      (data.reservationId ? "\nID rezervace: " + data.reservationId : "")
    );

    document.getElementById("rezModal").style.display = "none";
  } catch (err) {
    console.error("Chyba při odesílání rezervace:", err);
    alert("Došlo k chybě při odesílání rezervace. Zkuste to prosím znovu.");
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
});




const galleryImages = document.querySelectorAll('.gallery-img');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const closeBtn = document.getElementById('lightboxClose');
const prevBtn = document.getElementById('lightboxPrev');
const nextBtn = document.getElementById('lightboxNext');
let currentIndex = 0;

function showImage(index) {
  currentIndex = index;
  lightboxImg.src = galleryImages[index].src;
  lightbox.style.display = 'flex';
}

galleryImages.forEach((img, index) => {
  img.addEventListener('click', () => showImage(index));
});

closeBtn.addEventListener('click', () => {
  lightbox.style.display = 'none';
});

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none';
  }
});

prevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  showImage(currentIndex);
});

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex + 1) % galleryImages.length;
  showImage(currentIndex);
});

document.addEventListener('keydown', (e) => {
  if (lightbox.style.display !== 'flex') return;
  if (e.key === 'Escape') lightbox.style.display = 'none';
  if (e.key === 'ArrowLeft') prevBtn.click();
  if (e.key === 'ArrowRight') nextBtn.click();
});



