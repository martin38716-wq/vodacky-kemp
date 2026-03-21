const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH);

// Inicializace tabulky reservations
const initSql = `
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  booking_state_json TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  date_from TEXT,
  date_to TEXT,
  stripe_session_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

db.serialize(() => {
  db.run(initSql, err => {
    if (err) {
      console.error('Error creating reservations table:', err);
    } else {
      console.log('SQLite: reservations table ready');
    }
  });
});

function generateReservationId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `R-${now}-${rand}`;
}

function insertReservation({ reservationId, status, bookingState, customerName, customerEmail, dateFrom, dateTo }) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO reservations
      (reservation_id, status, booking_state_json, customer_email, customer_name, date_from, date_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      reservationId,
      status,
      JSON.stringify(bookingState),
      customerEmail,
      customerName,
      dateFrom,
      dateTo
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({
        id: this.lastID,
        reservation_id: reservationId,
        status,
        booking_state_json: JSON.stringify(bookingState),
        customer_email: customerEmail,
        customer_name: customerName,
        date_from: dateFrom,
        date_to: dateTo
      });
    });
  });
}

function updateReservationStripeSession(id, sessionId) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE reservations
      SET stripe_session_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `;

    db.run(sql, [sessionId, id], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
}

function updateReservationStatus(id, status) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE reservations
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `;

    db.run(sql, [status, id], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getReservationByStripeSessionId(sessionId, reservationIdFromMetadata) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM reservations WHERE stripe_session_id = ?';
    let params = [sessionId];

    if (reservationIdFromMetadata) {
      sql += ' OR reservation_id = ?';
      params.push(reservationIdFromMetadata);
    }

    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function listReservations() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, reservation_id, status, customer_name, customer_email,
             date_from, date_to, created_at, updated_at
      FROM reservations
      ORDER BY created_at DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

module.exports = {
  db,
  generateReservationId,
  insertReservation,
  updateReservationStripeSession,
  updateReservationStatus,
  getReservationByStripeSessionId,
  listReservations
};
