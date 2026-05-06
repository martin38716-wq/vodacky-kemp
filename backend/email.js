const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.MAIL_FROM) {
  console.error("❌ MAIL_FROM není nastavený!");
}

// Pomocné adresy příjemců
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const TRANSPORT_EMAIL = process.env.TRANSPORT_EMAIL || 'doprava@example.com';
const BOATS_EMAIL = process.env.BOATS_EMAIL || 'pujcovna@example.com';
const BABYSITTING_EMAIL = process.env.BABYSITTING_EMAIL || 'hlidani@example.com';

function buildServicesSummary(services) {
  const list = [];
  if (services.accommodation !== false) list.push('Ubytování');
  if (services.breakfast || services.half) list.push('Snídaně');
  if (services.half) list.push('Večeře (polopenze)');
  if (services.boats) list.push('Půjčení lodí');
  if (services.transport) list.push('Přeprava osob a bagáže');
  if (services.babysitting) list.push('Hlídání dětí');
  if (services.tent) list.push('Postavení a složení stanu');
  if (services.wood) list.push('Kolečko dřeva na oheň');
  return list.join(', ');
}

function buildBoatsSummary(boatsState) {
  if (!boatsState || !Array.isArray(boatsState.proposal) || !boatsState.proposal.length) {
    return 'Bez lodí nebo lodě budou upřesněny telefonicky.';
  }
  const lines = boatsState.proposal.map((b, i) => {
    if (b.type === 'canoe') {
      const adults = b.assigned.adults || 0;
      const children = b.assigned.children || 0;
      return `Kanoe ${i + 1}: ${adults} dospělí${children ? ` + ${children} děti` : ''}`;
    }
    if (b.type === 'raft') {
      const total = (b.assigned.adults || 0) + (b.assigned.children || 0);
      return `Raft ${i + 1}: ${total} osob`;
    }
    return `Loď ${i + 1}`;
  });
  return lines.join('<br>');
}

function buildTransportSummary(transportPlan) {
  if (!transportPlan || !transportPlan.summary) {
    return 'Doprava není součástí rezervace nebo bude upřesněna telefonicky.';
  }
  const s = transportPlan.summary;
  let summary = [
    `Celková cena: ${s.totalPrice} Kč`,
    `Cena na osobu: ${s.pricePerPerson} Kč`,
    `Kontakt na dopravu: ${s.contactPhone}`
  ].join('<br>');

  if (transportPlan.notes && transportPlan.notes.length) {
    summary += '<br><br>' + transportPlan.notes.join('<br>');
  }

  return summary;
}

async function sendMail(options) { console.log('[EMAIL] sendMail called:', { to: options?.to, from: options?.from, subject: options?.subject });
if (!options || !options.to) { console.error('[EMAIL] Missing "to"'); return; }
try { console.log('[EMAIL] Sending via Resend...'); const result = await resend.emails.send(options); console.log('[EMAIL] Resend result:', result); return result; } catch (err) { console.error('[EMAIL] Resend error:', err); throw err; } }

async function sendReservationEmails({ reservation, bookingState, checklistHtml }) {
  console.log('[EMAIL DEBUG] bookingState:', JSON.stringify(bookingState, null, 2));
  console.log('[EMAIL DEBUG] services:', bookingState.services);
  console.log('[EMAIL DEBUG] transport:', bookingState.services?.transport);
  console.log('[EMAIL DEBUG] boats:', bookingState.services?.boats);
  console.log('[EMAIL DEBUG] babysitting:', bookingState.services?.babysitting);
  const {
    dateFrom,
    dateTo,
    adults = 0,
    children = 0,
    services = {},
    boats = {},
    transportPlan = null
  } = bookingState;

  const peopleTotal = (adults || 0) + (children || 0);

  const subjectBase = `Rezervace ${reservation.reservation_id || ''} – vodácký kemp Slaník`;

  const servicesSummary = buildServicesSummary(services);
  const boatsSummary = buildBoatsSummary(boats);
  const transportSummary = buildTransportSummary(bookingState.transportPlan || transportPlan);

  // =========================
  // 1) E-MAIL PRO KLIENTA
  // =========================
  const clientHtml = `
    <p>Dobrý den,</p>
    <p>vaše rezervace byla <strong>úspěšně přijata</strong>.</p>

    <p><strong>Termín:</strong><br>
      ${dateFrom} – ${dateTo}
    </p>

    <p><strong>Počet osob:</strong><br>
      Dospělí: ${adults}<br>
      Děti: ${children}<br>
      Celkem: ${peopleTotal}
    </p>

    <p><strong>Vybrané služby:</strong><br>
      ${servicesSummary || 'Bez doplňkových služeb'}
    </p>

    <p><strong>Lodě:</strong><br>
      ${boatsSummary}
    </p>

    <p><strong>Doprava:</strong><br>
      ${transportSummary}
    </p>

        <hr>
    <h3>Checklist a program pobytu</h3>
    ${checklistHtml}

    <hr>
    <h3>Mapa vodáckých úseků na Otavě</h3>
    <p>Pro lepší představu přikládáme mapu doporučených vodáckých úseků na řece Otavě:</p>
    <p>
      <img src="https://www.vodacky-kemp.cz/assets/maps/otava-useky.png"
           alt="Vodácké úseky řeky Otavy"
           style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:4px;">
    </p>

    <hr>
    <h3>Jak se k nám dostanete</h3>

    <p>
      Kemp leží u jezu na řece Otavě, přibližně 1,5 km před Strakonicemi ve směru od Prahy.
      Nejjednodušší je použít navigaci přes Mapy.cz:&nbsp;
      <a href="https://mapy.cz/zakladni?q=Vod%C3%A1ck%C3%BD%20kemp%20Slan%C3%ADk" target="_blank" rel="noopener">
        otevřít Vodácký kemp Slaník v Mapy.cz
      </a>.
    </p>

    <hr>
    <p><strong>Další postup:</strong><br>
      V nejbližší době vás budeme kontaktovat a doladíme detaily pobytu
      (lodě, doprava, služby).
    </p>

    <p>Děkujeme a těšíme se na vás.</p>
  `;

  await sendMail({
    to: bookingState.email,
    from: process.env.MAIL_FROM || "Kemp <info@vodacky-kemp.cz>",
    subject: subjectBase,
    html: clientHtml
  });

  // =========================
  // 2) ADMIN – KOMPLETNÍ KOPIE
  // =========================
  const adminHtml = `
    <p>Nová přijatá rezervace.</p>
    <p><strong>Jméno:</strong> ${bookingState.name || ''}<br>
       <strong>E-mail:</strong> ${bookingState.email || ''}<br>
       <strong>Telefon:</strong> ${bookingState.phone || ''}</p>

    ${clientHtml}

    <hr>
    <h3>bookingState (JSON)</h3>
    <pre style="font-size:12px; white-space:pre-wrap;">${JSON.stringify(bookingState, null, 2)}</pre>
  `;

  await sendMail({
    to: ADMIN_EMAIL,
    from: process.env.MAIL_FROM || "Kemp <info@vodacky-kemp.cz>",
    subject: `[ADMIN] ${subjectBase}`,
    html: adminHtml
  });

  // =========================
  // 3) DOPRAVCE
  // =========================
  if (services.transport) {
    const plan = bookingState.transportPlan || transportPlan;
    let transportPlanHtml = '';

    if (plan && Array.isArray(plan.waves) && plan.waves.length) {
      const days = {};

      plan.waves.forEach(w => {
        if (!days[w.day]) days[w.day] = [];
        days[w.day].push(w);
      });

      const baseDateStr = bookingState.dateFrom;
      const baseDate = baseDateStr ? new Date(baseDateStr) : null;
      const formatDayDate = (day) => {
        if (!baseDate || isNaN(baseDate)) return "";
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + day);
        return d.toISOString().slice(0, 10);
      };

      transportPlanHtml = Object.keys(days)
        .sort((a, b) => a - b)
        .map(dayKey => {
          const wavesHtml = days[dayKey]
            .map(w => {
              let vehicleText = 'vozidla dle domluvy';

              if (w.vehicles) {
                const parts = [];

                if (w.vehicles.van > 0) {
                  parts.push(`Dodávka (8 osob): ${w.vehicles.van}×`);
                }

                if (w.vehicles.car > 0) {
                  parts.push(`Osobní auto (4 osoby): ${w.vehicles.car}×`);
                }

                if (parts.length) {
                  vehicleText = parts.join('<br>');
                }
              }

              return `
                <li>
                  <strong>${w.label}</strong><br>
                  Čas: ${w.time}<br>
                  Vozidla: ${vehicleText}<br>
                  Osob: ${w.persons}
                </li>
              `;
            })
            .join('');

          const dayNum = Number(dayKey);
          const dateLabel = formatDayDate(dayNum);
          return `
            <h4>Den ${dayKey}${dateLabel ? ` (${dateLabel})` : ''}</h4>
            <ul>${wavesHtml}</ul>
          `;
        })
        .join('');
    } else {
      transportPlanHtml = '<p>Doprava bude upřesněna při kontaktu s klientem.</p>';
    }

    const transportHtml = `
      <p>Nová rezervace s požadavkem na dopravu.</p>

      <p><strong>Klient:</strong><br>
        Jméno: ${bookingState.name || ''}${
          bookingState.nickname
            ? ` (${bookingState.nickname})`
            : ''
        }<br>
        E-mail: ${bookingState.email || ''}<br>
        Telefon: ${bookingState.phone || ''}
      </p>

      <p><strong>Termín:</strong><br>
        ${dateFrom} – ${dateTo}
      </p>

      <p><strong>Počet osob:</strong><br>
        Dospělí: ${adults}<br>
        Děti: ${children}<br>
        Celkem: ${peopleTotal}
      </p>

      <p><strong>Doprava – shrnutí:</strong><br>
        ${transportSummary}
      </p>

      <hr>
      <h3>Detailní plán dopravy</h3>
      ${transportPlanHtml}

      <hr>
      <p><strong>Další postup:</strong><br>
        Prosíme o kontaktování klienta do 24 hodin kvůli upřesnění dopravy
        a potvrzení časů odjezdů/příjezdů.
      </p>

      <p>
        <a href="tel:${bookingState.phone}" style="font-size:16px; font-weight:bold;">
          Zavolat klientovi
        </a>
      </p>
    `;

    await sendMail({
      to: TRANSPORT_EMAIL,
      from: process.env.MAIL_FROM || "Kemp <info@vodacky-kemp.cz>",
      subject: `[DOPRAVA] ${subjectBase}`,
      html: transportHtml
    });
  }

  // =========================
  // 4) PŮJČOVNA LODÍ
  // =========================
  if (services.boats) {
    let riverPlanHtml = '';
    if (Array.isArray(bookingState.riverPlan) && bookingState.riverPlan.length) {
      const baseDateStr = bookingState.dateFrom;
      const baseDate = baseDateStr ? new Date(baseDateStr) : null;
      const formatDayDate = (day) => {
        if (!baseDate || isNaN(baseDate)) return "";
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + day);
        return d.toISOString().slice(0, 10);
      };

      riverPlanHtml = '<ul>' + bookingState.riverPlan.map(p => {
        const dateLabel = formatDayDate(p.day);
        return `<li>Den ${p.day}${dateLabel ? ` (${dateLabel})` : ''}: ${p.name} – ${p.km} km (${p.timeLabel})</li>`;
      }).join('') + '</ul>';
    } else {
      riverPlanHtml = '<p>Plán plavby bude upřesněn při kontaktu s klientem.</p>';
    }

    const boatsHtml = `
      <p>Nová rezervace s požadavkem na lodě.</p>

      <p><strong>Klient:</strong><br>
        Jméno: ${bookingState.name || ''}${
          bookingState.nickname
            ? ` (${bookingState.nickname})`
            : ''
        }<br>
        E-mail: ${bookingState.email || ''}<br>
        Telefon: ${bookingState.phone || ''}
      </p>

      <p><strong>Termín:</strong><br>
        ${dateFrom} – ${dateTo}
      </p>

      <p><strong>Počet osob:</strong><br>
        Dospělí: ${adults}<br>
        Děti: ${children}<br>
        Celkem: ${peopleTotal}
      </p>

      <p><strong>Lodě – návrh:</strong><br>
        ${boatsSummary}
      </p>

      <hr>
      <h3>Plán plavby (časová osa)</h3>
      ${riverPlanHtml}

      <hr>
      <p><strong>Další postup:</strong><br>
        Prosíme o kontaktování klienta do 24 hodin kvůli upřesnění výběru lodí
        a detailů plavby.
      </p>

      <p>
        <a href="tel:${bookingState.phone}" style="font-size:16px; font-weight:bold;">
          Zavolat klientovi
        </a>
      </p>
    `;

    await sendMail({
      to: BOATS_EMAIL,
      from: process.env.MAIL_FROM || "Kemp <info@vodacky-kemp.cz>",
      subject: `[LODĚ] ${subjectBase}`,
      html: boatsHtml
    });
  }

  // =========================
  // 5) HLÍDÁNÍ DĚTÍ
  // =========================
  if (services.babysitting) {
    const babysittingHtml = `
      <p>Nová rezervace s požadavkem na hlídání dětí.</p>
      <p><strong>Termín:</strong> ${dateFrom} – ${dateTo}<br>
         <strong>Děti:</strong> ${children}</p>

      <p>Požadavek na hlídání byl klientovi avizován v rezervačním formuláři.
      Prosíme o kontaktování klienta do 24 hodin.</p>

      <p><strong>Kontakt na klienta:</strong><br>
        Jméno: ${bookingState.name || ''}<br>
        Telefon: ${bookingState.phone || ''}<br>
        E-mail: ${bookingState.email || ''}
      </p>

      <hr>
      <h3>Checklist a program pobytu</h3>
      ${checklistHtml}
    `;

    await sendMail({
      to: BABYSITTING_EMAIL,
      from: process.env.MAIL_FROM || "Kemp <info@vodacky-kemp.cz>",
      subject: `[HLÍDÁNÍ DĚTÍ] ${subjectBase}`,
      html: babysittingHtml
    });
  }
}

module.exports = {
  sendReservationEmails
};
