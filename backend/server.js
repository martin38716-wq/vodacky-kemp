console.log("🚀 SERVER START - DEPLOY TEST");
require('dotenv').config();

const path = require('path');
const express = require('express');

const { sendReservationEmails } = require('./email');
const { generateChecklistHtml } = require('./checklistRenderer');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------

// JSON tělo pro API
app.use(express.json());

// Statické soubory – frontend (index.html, js, fotky)
app.use(express.static(path.join(__dirname, '..')));

// ---------- API ROUTES ----------

// POST /api/reservation – přijme bookingState, vygeneruje checklist a odešle e-maily
app.post('/api/reservation', async (req, res) => {
  try {
    const body = req.body || {};

    // Umožníme 2 formáty: { bookingState: {...} } nebo přímo {...}
    const bookingState = body.bookingState && typeof body.bookingState === 'object'
      ? body.bookingState
      : body;

    if (!bookingState || typeof bookingState !== 'object') {
      return res.status(400).json({ error: 'Missing bookingState in request body' });
    }

    const { name, email, dateFrom, dateTo } = bookingState;

    // Základní validace
    if (!name || !email || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required fields (name, email, dateFrom, dateTo)' });
    }

    // Jednoduchý objekt rezervace (bez DB)
    const reservation = {
      reservation_id: 'R-' + Date.now(),
      status: 'received'
    };

    // Vygenerujeme HTML checklist pomocí stávajícího front-endového kódu
    const checklistHtml = await generateChecklistHtml(bookingState);

    // Odešleme všechny potřebné e-maily
    await sendReservationEmails({ reservation, bookingState, checklistHtml });

    // Odpověď klientovi
    res.json({
      success: true,
      reservationId: reservation.reservation_id
    });
  } catch (err) {
    console.error('Error in POST /api/reservation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- START SERVER ----------

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
