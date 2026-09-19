// The Scissors Family Saloon — backend server
// Pure Node.js (no npm dependencies required) — just run `node server.js`.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'data', 'bookings.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const STAFF_PIN = '1234';

// ---------- Static reference data (from the original design) ----------

const SERVICES = [
  { id: 'svc-haircut', category: 'Haircuts & Styling', name: "Classic Gentleman's Haircut", price: 250, duration: 30, desc: 'Precision scissor & clipper cut, refreshing shampoo wash, and clean neck finish.' },
  { id: 'svc-beard', category: 'Beard & Shave', name: 'Royal Beard Sculpt & Hot Towel Shave', price: 180, duration: 30, desc: 'Hot steam towel wrap, organic foam shave, sharp line detailing, and soothing aftershave balm.' },
  { id: 'svc-duo', category: 'Family Combos', name: 'The Scissors Signature Hair & Beard Duo', price: 390, duration: 50, desc: 'Complete signature transformation: custom haircut, beard grooming, head massage, and styling.' },
  { id: 'svc-kids', category: 'Kids Grooming', name: 'Junior Prince & Princess Cut (Under 12)', price: 180, duration: 25, desc: 'Patience-filled haircut for little ones with fun styling and candy treat.' },
  { id: 'svc-fatherson', category: 'Family Combos', name: 'Father & Son Bond Grooming Package', price: 440, duration: 60, desc: 'Side-by-side chairs, customized styling for dad and kid, plus refreshing washes.' },
  { id: 'svc-scalp', category: 'Facial & Spa', name: 'Deep Cleansing Scalp Revival Spa', price: 499, duration: 45, desc: 'Anti-dandruff detox, invigorating acupressure head massage, and steam infusion.' },
  { id: 'svc-facial', category: 'Facial & Spa', name: 'De-Tan Gold Glow Facial', price: 550, duration: 45, desc: 'Herbal scrub, deep pore cleansing, gold radiant pack, and cooling rose water mist.' },
  { id: 'svc-color', category: 'Color & Chemical', name: 'Ammonia-Free Organic Hair Color', price: 650, duration: 60, desc: 'Natural black or rich chestnut root touch-up with intense shine-lock conditioner.' }
];

const CHAIRS = [
  { id: 'chair-1', number: 1, name: 'Station 1 – Royal Master Chair', stylist: 'Vikram (Master Barber)', specialty: 'Classic Fades, Beard Sculpting & Razor Finishes' },
  { id: 'chair-2', number: 2, name: 'Station 2 – Trend & Texture Studio', stylist: 'Arjun (Senior Stylist)', specialty: 'Modern Styles, Textured Crops & Quiffs' },
  { id: 'chair-3', number: 3, name: 'Station 3 – Family & Kids Corner', stylist: 'Priya (Family Stylist)', specialty: 'Gentle Kids Cuts, Teens & Gentle Styling' },
  { id: 'chair-4', number: 4, name: 'Station 4 – Color & Spa Lounge', stylist: 'Rohit (Color & Scalp Specialist)', specialty: 'Hair Spa, Deep Conditioning & Organic Color' },
  { id: 'chair-5', number: 5, name: 'Station 5 – Executive Grooming Suite', stylist: 'Sameer (Grooming Expert)', specialty: 'Signature Combos, De-Tan Facials & Head Massages' },
  { id: 'chair-6', number: 6, name: 'Station 6 – Express Barber Bar', stylist: 'Karan (Barber)', specialty: 'Quick Trims, Clean Shaves & Everyday Maintenance' }
];

const SLOTS = {
  morning: ['09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM', '12:00 PM', '12:45 PM'],
  afternoon: ['01:30 PM', '02:15 PM', '03:00 PM', '03:45 PM', '04:30 PM'],
  evening: ['05:15 PM', '06:00 PM', '06:45 PM', '07:30 PM', '08:15 PM']
};
const ALL_SLOTS = [...SLOTS.morning, ...SLOTS.afternoon, ...SLOTS.evening];

// ---------- Persistence helpers ----------

function loadBookings() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read bookings.json, starting fresh.', e);
    return [];
  }
}

function saveBookings(list) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

let bookings = loadBookings();

function nextBookingId() {
  return 'SCS' + String(1000 + bookings.length + 1);
}

// ---------- Small helpers for the hand-rolled router ----------

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 1e6) { reject(new Error('Payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  // prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) filePath = path.join(PUBLIC_DIR, 'index.html');

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // SPA fallback -> index.html
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, indexContent) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(indexContent);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- Route handlers ----------

function handleAvailability(query, res) {
  const date = query.get('date');
  if (!date) return sendJson(res, 400, { error: 'date is required (YYYY-MM-DD)' });

  const activeForDate = bookings.filter(b => b.date === date && b.status !== 'cancelled');
  const result = {};
  ALL_SLOTS.forEach(slot => {
    const taken = new Set(activeForDate.filter(b => b.slot === slot).map(b => b.chairId));
    result[slot] = { free: CHAIRS.length - taken.size, total: CHAIRS.length };
  });
  sendJson(res, 200, result);
}

function handleMatrix(query, res) {
  const date = query.get('date');
  const slot = query.get('slot');
  if (!date || !slot) return sendJson(res, 400, { error: 'date and slot are required' });

  const activeForSlot = bookings.filter(b => b.date === date && b.slot === slot && b.status !== 'cancelled');
  const byChair = {};
  activeForSlot.forEach(b => { byChair[b.chairId] = b; });

  const matrix = CHAIRS.map(chair => {
    const booking = byChair[chair.id];
    return { ...chair, status: booking ? 'booked' : 'free', bookedBy: booking ? booking.name : null };
  });
  sendJson(res, 200, matrix);
}

function validateBookingFields(body) {
  const { serviceId, date, slot, chairId, name, phone } = body;
  if (!serviceId || !date || !slot || !chairId || !name || !phone) return 'Missing required fields.';
  if (!/^\d{10}$/.test(phone)) return 'Mobile number must be exactly 10 digits.';
  if (!SERVICES.find(s => s.id === serviceId)) return 'Invalid service.';
  if (!CHAIRS.find(c => c.id === chairId)) return 'Invalid chair.';
  return null;
}

function createBooking(body, source) {
  const service = SERVICES.find(s => s.id === body.serviceId);
  const chair = CHAIRS.find(c => c.id === body.chairId);
  const booking = {
    id: nextBookingId(),
    serviceId: body.serviceId,
    serviceName: service.name,
    price: service.price,
    duration: service.duration,
    date: body.date,
    slot: body.slot,
    chairId: body.chairId,
    chairName: chair.name,
    chairNumber: chair.number,
    stylist: chair.stylist,
    name: String(body.name).trim(),
    phone: body.phone,
    notes: body.notes ? String(body.notes).trim() : '',
    status: 'confirmed',
    source,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  saveBookings(bookings);
  return booking;
}

async function handleCreateBooking(req, res, source) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }

  const errMsg = validateBookingFields(body);
  if (errMsg) return sendJson(res, 400, { error: errMsg });

  const conflict = bookings.find(b => b.date === body.date && b.slot === body.slot && b.chairId === body.chairId && b.status !== 'cancelled');
  if (conflict) return sendJson(res, 409, { error: 'This chair was just booked for that slot. Please pick another.' });

  const booking = createBooking(body, source);
  sendJson(res, 201, booking);
}

function handleListBookings(query, res) {
  const phone = query.get('phone');
  const date = query.get('date');
  const status = query.get('status');

  let result = bookings;
  if (phone) result = result.filter(b => b.phone === phone);
  if (date) result = result.filter(b => b.date === date);
  if (status && status !== 'all') result = result.filter(b => b.status === status);

  result = [...result].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return ALL_SLOTS.indexOf(a.slot) - ALL_SLOTS.indexOf(b.slot);
  });

  sendJson(res, 200, result);
}

async function handlePatchBooking(req, res, id) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }

  const valid = ['confirmed', 'in-service', 'completed', 'cancelled'];
  if (!valid.includes(body.status)) return sendJson(res, 400, { error: 'Invalid status.' });

  const booking = bookings.find(b => b.id === id);
  if (!booking) return sendJson(res, 404, { error: 'Booking not found.' });

  booking.status = body.status;
  booking.updatedAt = new Date().toISOString();
  saveBookings(bookings);
  sendJson(res, 200, booking);
}

async function handleStaffLogin(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  if (body.pin === STAFF_PIN) return sendJson(res, 200, { ok: true, token: 'staff-session-' + Date.now() });
  sendJson(res, 401, { ok: false, error: 'Incorrect PIN.' });
}

// ---------- Router ----------

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const { pathname, searchParams } = u;

    if (pathname === '/api/services' && req.method === 'GET') return sendJson(res, 200, SERVICES);
    if (pathname === '/api/chairs' && req.method === 'GET') return sendJson(res, 200, CHAIRS);
    if (pathname === '/api/slots' && req.method === 'GET') return sendJson(res, 200, SLOTS);
    if (pathname === '/api/availability' && req.method === 'GET') return handleAvailability(searchParams, res);
    if (pathname === '/api/matrix' && req.method === 'GET') return handleMatrix(searchParams, res);
    if (pathname === '/api/bookings' && req.method === 'GET') return handleListBookings(searchParams, res);
    if (pathname === '/api/bookings' && req.method === 'POST') return await handleCreateBooking(req, res, 'online');
    if (pathname === '/api/bookings/walkin' && req.method === 'POST') return await handleCreateBooking(req, res, 'walk-in');
    if (pathname === '/api/staff/login' && req.method === 'POST') return await handleStaffLogin(req, res);

    const patchMatch = pathname.match(/^\/api\/bookings\/([^/]+)$/);
    if (patchMatch && req.method === 'PATCH') return await handlePatchBooking(req, res, decodeURIComponent(patchMatch[1]));

    if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });

    // Everything else -> static files / SPA
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ✂️  The Scissors Family Saloon is running!`);
  console.log(`  → Open http://localhost:${PORT} in your browser\n`);
});
