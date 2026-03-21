const nodemailer = require('nodemailer');

// SMTP konfigurace z prostředí
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    : undefined
});

// Pomocné adresy příjemců
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const TRANSPORT_EMAIL = process.env.TRANSPORT_EMAIL || 'doprava@example.com';
const BOATS_EMAIL = process.env.BOATS_EMAIL || 'pujcovna@example.com';
const BABYSITTING_EMAIL = process.env.BABYSITTING_EMAIL || 'hlidani@example.com';

function buildServicesSummary(services) {
  const list = [];
  if (services.accommodation) list.push('Ubytování');
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
  return [
    `Celková cena: ${s.totalPrice} Kč`,
    `Cena na osobu: ${s.pricePerPerson} Kč`,
    `Kontakt na dopravu: ${s.contactPhone}`
  ].join('<br>');
}

async function sendMail(options) {
  if (!options.to) return;
  await transport.sendMail(options);
}

async function sendReservationEmails({ reservation, bookingState, checklistHtml }) {
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
    <p><strong>Další postup:</strong><br>
      V nejbližší době vás budeme kontaktovat a doladíme detaily pobytu
      (lodě, doprava, služby).
    </p>

    <p>Děkujeme a těšíme se na vás.</p>
  `;

  await sendMail({
    to: bookingState.email,
    from: process.env.MAIL_FROM || ADMIN_EMAIL,
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
    from: process.env.MAIL_FROM || ADMIN_EMAIL,
    subject: `[ADMIN] ${subjectBase}`,
    html: adminHtml
  });

  // =========================
  // 3) DOPRAVCE
  // =========================
  if (services.transport) {
    const transportHtml = `
      <p>Nová rezervace s požadavkem na dopravu.</p>
      <p><strong>Termín:</strong> ${dateFrom} – ${dateTo}<br>
         <strong>Osoby:</strong> Dospělí ${adults}, děti ${children} (celkem ${peopleTotal})</p>

      <p><strong>Doprava – shrnutí:</strong><br>
        ${transportSummary}
      </p>

      <hr>
      <h3>Checklist a program pobytu</h3>
      ${checklistHtml}
    `;

    await sendMail({
      to: TRANSPORT_EMAIL,
      from: process.env.MAIL_FROM || ADMIN_EMAIL,
      subject: `[DOPRAVA] ${subjectBase}`,
      html: transportHtml
    });
  }

  // =========================
  // 4) PŮJČOVNA LODÍ
  // =========================
  if (services.boats) {
    const boatsHtml = `
      <p>Nová rezervace s požadavkem na lodě.</p>
      <p><strong>Termín:</strong> ${dateFrom} – ${dateTo}<br>
         <strong>Osoby:</strong> Dospělí ${adults}, děti ${children} (celkem ${peopleTotal})</p>

      <p><strong>Lodě – návrh:</strong><br>
        ${boatsSummary}
      </p>

      <hr>
      <h3>Checklist a program pobytu</h3>
      ${checklistHtml}
    `;

    await sendMail({
      to: BOATS_EMAIL,
      from: process.env.MAIL_FROM || ADMIN_EMAIL,
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
      from: process.env.MAIL_FROM || ADMIN_EMAIL,
      subject: `[HLÍDÁNÍ DĚTÍ] ${subjectBase}`,
      html: babysittingHtml
    });
  }
}

module.exports = {
  sendReservationEmails
};
