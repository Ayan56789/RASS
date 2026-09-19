// The Scissors Family Saloon — frontend SPA (vanilla JS, no build step)

const API = '/api';
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

let SERVICES = [];
let CHAIRS = [];
let SLOTS = { morning: [], afternoon: [], evening: [] };

let state = {
  view: 'book', // book | mybookings | staff
  category: 'All',
  search: '',
  serviceId: null,
  date: null,
  slot: null,
  chairId: null,
  staffLoggedIn: false,
};

// ---------- Helpers ----------

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function fmtDateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextDays(n) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d);
  }
  return out;
}

function dateLabel(d, idx) {
  if (idx === 0) return { d1: 'TODAY', d2: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  if (idx === 1) return { d1: 'TOMORROW', d2: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  return { d1: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), d2: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---------- Nav ----------

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.nav === 'book' ? 'book' : btn.dataset.nav;
    render();
  });
});

function updateNavActive() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    const v = btn.dataset.nav;
    btn.classList.toggle('active', v === state.view || (v === 'book' && state.view === 'book'));
  });
}

// ---------- Boot ----------

async function boot() {
  const [services, chairs, slots] = await Promise.all([
    api('/services'), api('/chairs'), api('/slots'),
  ]);
  SERVICES = services;
  CHAIRS = chairs;
  SLOTS = slots;
  state.date = fmtDateKey(new Date());
  render();
}

// ---------- Render dispatcher ----------

function render() {
  updateNavActive();
  if (state.view === 'mybookings') return renderMyBookings();
  if (state.view === 'staff') return renderStaff();
  return renderBookingFlow();
}

// =====================================================================
// BOOKING FLOW (home page)
// =====================================================================

function renderBookingFlow() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-pill">✂️ The Scissors family Saloon • Instant Seat Booking</div>
      <h1>Pick Your Chair. Choose Your Slot.<span class="accent">Zero Waiting Line.</span></h1>
      <p>Book your favorite barber chair and styling slot in real-time — with a live seat grid. No advance payment required; confirm with just your name and mobile number!</p>
      <div class="hero-features">
        <span>✅ Real-Time Seat Matrix</span>
        <span>🛡️ Guaranteed On-Time Chair</span>
        <span>🏅 Expert Stylists &amp; Family Friendly</span>
      </div>
    </section>

    <section class="section" id="step1"></section>
    <section class="section" id="step2"></section>
    <section class="section hidden" id="step3"></section>
    <section class="section hidden" id="step4"></section>
  `;
  renderStep1();
  renderStep2();
  if (state.serviceId) renderStep3();
  if (state.chairId) renderStep4();
}

// ---- Step 1: Service selection ----

function renderStep1() {
  const categories = ['All', ...Array.from(new Set(SERVICES.map(s => s.category)))];
  const filtered = SERVICES.filter(s => {
    const matchCat = state.category === 'All' || s.category === state.category;
    const matchSearch = !state.search || s.name.toLowerCase().includes(state.search.toLowerCase()) || s.desc.toLowerCase().includes(state.search.toLowerCase());
    return matchCat && matchSearch;
  });

  document.getElementById('step1').innerHTML = `
    <div class="section-head-row">
      <div>
        <div class="section-kicker">✨ STEP 1: TREATMENT &amp; STYLE</div>
        <h2 class="section-title">Select Your Salon Service</h2>
        <p class="section-sub">Choose from precision haircuts, beard grooming, kids packages &amp; spa</p>
      </div>
      <div class="search-box"><input id="svcSearch" placeholder="Search service..." value="${escapeHtml(state.search)}" /></div>
    </div>
    <div class="chip-row">
      ${categories.map(c => `<div class="chip ${c === state.category ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</div>`).join('')}
    </div>
    <div class="grid-3">
      ${filtered.map(s => svcCardHtml(s)).join('') || '<div class="empty-state">No services match your search.</div>'}
    </div>
  `;

  document.getElementById('svcSearch').addEventListener('input', e => {
    state.search = e.target.value;
    renderStep1();
  });
  document.querySelectorAll('[data-cat]').forEach(el => el.addEventListener('click', () => {
    state.category = el.dataset.cat;
    renderStep1();
  }));
  document.querySelectorAll('[data-svc]').forEach(el => el.addEventListener('click', () => {
    state.serviceId = el.dataset.svc;
    state.chairId = null;
    renderBookingFlow();
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function svcCardHtml(s) {
  const selected = state.serviceId === s.id;
  return `
    <div class="svc-card ${selected ? 'selected' : ''}" data-svc="${s.id}">
      <div class="svc-top"><span>${escapeHtml(s.category)}</span><span class="svc-price">₹${s.price}</span></div>
      <div class="svc-name">${escapeHtml(s.name)}</div>
      <p class="svc-desc">${escapeHtml(s.desc)}</p>
      <div class="svc-bottom"><span>🕒 ${s.duration} mins</span><span class="svc-choose">${selected ? '✅ Selected' : 'Tap to Choose'}</span></div>
    </div>
  `;
}

// ---- Step 2: Date & Slot ----

let availabilityCache = {};

async function renderStep2() {
  const days = nextDays(7);
  const el = document.getElementById('step2');
  el.innerHTML = `
    <div class="section-kicker">📅 STEP 2: DATE &amp; PREFERRED TIME</div>
    <h2 class="section-title">Select Booking Date &amp; Slot</h2>
    <p class="section-sub">Pick your preferred day to view the live chair availability matrix</p>
    <div class="date-row">
      ${days.map((d, i) => {
        const key = fmtDateKey(d);
        const lbl = dateLabel(d, i);
        return `<div class="date-pill ${key === state.date ? 'active' : ''}" data-date="${key}"><div class="d1">${lbl.d1}</div><div class="d2">${lbl.d2}</div></div>`;
      }).join('')}
    </div>
    <div id="slotWrap">Loading slots…</div>
  `;

  document.querySelectorAll('[data-date]').forEach(el2 => el2.addEventListener('click', () => {
    state.date = el2.dataset.date;
    state.slot = null;
    state.chairId = null;
    renderStep2();
    if (state.serviceId) renderStep3();
    hideStepsFrom(3);
  }));

  await loadAvailability();
  renderSlotWrap();
}

async function loadAvailability() {
  availabilityCache = await api(`/availability?date=${state.date}`);
}

function renderSlotWrap() {
  const groups = [
    { label: '☀️ MORNING SLOTS', list: SLOTS.morning },
    { label: '🌤️ AFTERNOON SLOTS', list: SLOTS.afternoon },
    { label: '🌙 EVENING SLOTS', list: SLOTS.evening },
  ];
  document.getElementById('slotWrap').innerHTML = groups.map(g => `
    <div class="slot-group-label">${g.label}</div>
    <div class="slot-row">
      ${g.list.map(t => {
        const avail = availabilityCache[t] || { free: 6, total: 6 };
        const active = state.slot === t;
        const disabled = avail.free === 0;
        return `<div class="slot-pill ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}" data-slot="${disabled ? '' : t}">
          <div class="t">${t}</div>
          <div class="f ${avail.free === 0 ? 'zero' : ''}">${avail.free} free</div>
        </div>`;
      }).join('')}
    </div>
  `).join('');

  document.querySelectorAll('[data-slot]').forEach(el => {
    if (!el.dataset.slot) return;
    el.addEventListener('click', () => {
      state.slot = el.dataset.slot;
      state.chairId = null;
      renderSlotWrap();
      if (state.serviceId) {
        document.getElementById('step3').classList.remove('hidden');
        renderStep3();
        document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      hideStep4();
    });
  });
}

function hideStepsFrom(n) {
  if (n <= 3) document.getElementById('step3').classList.add('hidden');
  if (n <= 4) document.getElementById('step4').classList.add('hidden');
}
function hideStep4() { document.getElementById('step4').classList.add('hidden'); }

// ---- Step 3: Seat Matrix ----

async function renderStep3() {
  const stepEl = document.getElementById('step3');
  if (!state.slot) { stepEl.classList.add('hidden'); return; }
  stepEl.classList.remove('hidden');
  stepEl.innerHTML = `
    <div class="section-head-row">
      <div>
        <div class="section-kicker">✨ STEP 3: INTERACTIVE SEAT MATRIX</div>
        <h2 class="section-title">Choose Your Styling Chair</h2>
        <p class="section-sub">Live floor matrix for slot: <b style="color:var(--amber)">${state.slot}</b></p>
      </div>
      <div class="legend">
        <span><i class="sw free"></i>Free / Available</span>
        <span><i class="sw sel"></i>Selected (Ochre)</span>
        <span><i class="sw booked"></i>Booked / Occupied</span>
      </div>
    </div>
    <div class="floor-strip">FRONT OF SALON • STYLING MIRRORS &amp; COUNTER</div>
    <div class="grid-3" id="matrixGrid">Loading chairs…</div>
  `;

  const matrix = await api(`/matrix?date=${state.date}&slot=${encodeURIComponent(state.slot)}`);
  document.getElementById('matrixGrid').innerHTML = matrix.map(c => chairCardHtml(c)).join('');

  document.querySelectorAll('[data-chair]').forEach(el => {
    if (el.classList.contains('booked')) return;
    el.addEventListener('click', () => {
      state.chairId = el.dataset.chair;
      renderStep3();
      document.getElementById('step4').classList.remove('hidden');
      renderStep4();
      document.getElementById('step4').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function chairCardHtml(c) {
  let status = c.status; // free | booked
  if (state.chairId === c.id) status = 'selected';
  const pillLabel = status === 'free' ? 'Free Seat' : status === 'selected' ? 'Selected' : 'Booked';
  const ctaLabel = status === 'booked' ? `Booked by ${c.bookedBy ? c.bookedBy.split(' ')[0] : 'guest'}` : 'Tap to select this chair →';
  return `
    <div class="chair-card ${status}" data-chair="${c.id}">
      <div class="chair-top">
        <div>
          <div class="chair-station">STATION #${c.number}</div>
          <div class="chair-name">${escapeHtml(c.name)}</div>
        </div>
        <span class="chair-status-pill ${status}">${pillLabel}</span>
      </div>
      <div class="chair-stylist"><b>👤 ${escapeHtml(c.stylist)}</b><span>${escapeHtml(c.specialty)}</span></div>
      <div class="chair-bottom"><span class="cta">${ctaLabel}</span><span>CHAIR ${c.number}</span></div>
    </div>
  `;
}

// ---- Step 4: Customer details & confirm ----

function renderStep4() {
  const stepEl = document.getElementById('step4');
  if (!state.chairId) { stepEl.classList.add('hidden'); return; }
  stepEl.classList.remove('hidden');
  const service = SERVICES.find(s => s.id === state.serviceId);
  const chair = CHAIRS.find(c => c.id === state.chairId);

  stepEl.innerHTML = `
    <div class="section-kicker">🛡️ STEP 4: CUSTOMER DETAILS &amp; PASS</div>
    <h2 class="section-title">Confirm Your Reservation</h2>
    <p class="section-sub">Book via mobile number &amp; name — zero advance payment needed, pay at the counter.</p>
    <div class="form-grid" style="margin-top:20px">
      <div>
        <div class="field">
          <label>Full Name *</label>
          <input id="custName" placeholder="e.g. Rahul Sharma" />
        </div>
        <div class="field">
          <label>10-Digit Mobile Number *</label>
          <div class="phone-input"><span>📞 +91</span><input id="custPhone" placeholder="9876543210" maxlength="10" inputmode="numeric" /></div>
          <div class="hint">Used for your instant booking pass and counter lookup.</div>
        </div>
        <div class="field">
          <label>Special Styling Instructions (optional)</label>
          <textarea id="custNotes" rows="3" placeholder="e.g. Low skin fade, sensitive scalp, child's first haircut..."></textarea>
        </div>
        <div id="formError" class="error-text hidden"></div>
        <button class="btn btn-primary btn-block" id="confirmBtn">Confirm Seat &amp; Book Slot →</button>
      </div>
      <div class="summary-card">
        <div class="summary-head"><b>Booking Summary</b><span class="pill-mini">Instant Confirmation</span></div>
        <div class="summary-row"><span>Salon</span><span>The Scissors family Saloon</span></div>
        <div class="summary-row"><span>Service</span><span>${escapeHtml(service.name)}</span></div>
        <div class="summary-row"><span>Date &amp; Time</span><span style="color:var(--amber)">${state.date} at ${state.slot}</span></div>
        <div class="summary-row"><span>Styling Station</span><span>${escapeHtml(chair.name)}</span></div>
        <div class="summary-total"><span>Total Amount to Pay</span><span class="amt">₹${service.price}</span></div>
        <div class="summary-note">Pay via Cash / UPI at salon counter after service</div>
        <div class="summary-guarantee">✅ Guaranteed chair ready upon arrival with no waiting line.</div>
      </div>
    </div>
  `;

  document.getElementById('confirmBtn').addEventListener('click', submitBooking);
}

async function submitBooking() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const notes = document.getElementById('custNotes').value.trim();
  const errEl = document.getElementById('formError');
  errEl.classList.add('hidden');

  if (!name) return showFormError('Please enter your full name.');
  if (!/^\d{10}$/.test(phone)) return showFormError('Please enter a valid 10-digit mobile number.');

  try {
    const booking = await api('/bookings', {
      method: 'POST',
      body: JSON.stringify({ serviceId: state.serviceId, date: state.date, slot: state.slot, chairId: state.chairId, name, phone, notes }),
    });
    toast(`🎉 Booked! Your pass ID is ${booking.id}`);
    // reset flow
    state.serviceId = null; state.slot = null; state.chairId = null; state.search = ''; state.category = 'All';
    renderBookingFlow();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    showFormError(e.message);
  }
}

function showFormError(msg) {
  const errEl = document.getElementById('formError');
  errEl.textContent = '⚠️ ' + msg;
  errEl.classList.remove('hidden');
}

// =====================================================================
// MY BOOKINGS
// =====================================================================

function renderMyBookings() {
  app.innerHTML = `
    <div class="section center-card">
      <h2>Find Your Appointments &amp; Passes</h2>
      <p>Enter your 10-digit mobile number to view upcoming appointments, chair numbers, and digital passes.</p>
      <div class="lookup-row">
        <div class="phone-input"><span>📞 +91</span><input id="lookupPhone" placeholder="Enter your 10-digit number" maxlength="10" inputmode="numeric" /></div>
        <button class="btn btn-primary" id="lookupBtn">🔍 SEARCH BOOKINGS</button>
      </div>
      <div id="lookupError" class="error-text hidden"></div>
    </div>
    <div id="lookupResults"></div>
  `;
  document.getElementById('lookupBtn').addEventListener('click', doLookup);
  document.getElementById('lookupPhone').addEventListener('keydown', e => { if (e.key === 'Enter') doLookup(); });
}

async function doLookup() {
  const phone = document.getElementById('lookupPhone').value.trim();
  const errEl = document.getElementById('lookupError');
  errEl.classList.add('hidden');
  if (!/^\d{10}$/.test(phone)) {
    errEl.textContent = '⚠️ Please enter a valid 10-digit mobile number.';
    errEl.classList.remove('hidden');
    return;
  }
  const results = await api(`/bookings?phone=${phone}`);
  const wrap = document.getElementById('lookupResults');
  if (!results.length) {
    wrap.innerHTML = `<div class="section"><div class="empty-state">No bookings found for this number.</div></div>`;
    return;
  }
  wrap.innerHTML = `<div class="section"><h3 style="font-family:var(--font-serif);margin-top:0">Your Bookings (${results.length})</h3>${results.map(bookingItemHtml).join('')}</div>`;
}

function bookingItemHtml(b) {
  return `
    <div class="booking-item">
      <div class="bi-left">
        <b>${escapeHtml(b.serviceName)}</b>
        <div class="meta">${escapeHtml(b.chairName)} • ${escapeHtml(b.stylist)}</div>
        <div class="meta">${b.date} at ${b.slot} • ${escapeHtml(b.name)}</div>
        <div class="booking-id">Pass ID: ${b.id}</div>
      </div>
      <div class="bi-right">
        <span class="status-tag ${b.status}">${b.status.replace('-', ' ')}</span>
        <div class="meta" style="margin-top:8px">₹${b.price}</div>
      </div>
    </div>
  `;
}

// =====================================================================
// STAFF ADMIN
// =====================================================================

function renderStaff() {
  if (!state.staffLoggedIn) return renderStaffLogin();
  return renderStaffDashboard();
}

function renderStaffLogin() {
  app.innerHTML = `
    <div class="section center-card">
      <div class="shield-icon">🛡️</div>
      <h2>Staff &amp; Admin Portal</h2>
      <p>Log in to manage appointments, floor chairs, and walk-in bookings from your phone.</p>
      <div class="field" style="text-align:left">
        <label>Staff Security PIN</label>
        <input id="pinInput" class="pin-input" placeholder="Enter 4-digit PIN (Default: 1234)" maxlength="4" inputmode="numeric" />
      </div>
      <button class="btn btn-primary btn-block" id="pinBtn">Access Staff Dashboard</button>
      <div id="pinError" class="error-text hidden"></div>
      <button class="link-btn" id="autofillBtn">Auto-fill Default Demo PIN (1234)</button>
    </div>
  `;
  document.getElementById('autofillBtn').addEventListener('click', () => { document.getElementById('pinInput').value = '1234'; });
  document.getElementById('pinBtn').addEventListener('click', doStaffLogin);
  document.getElementById('pinInput').addEventListener('keydown', e => { if (e.key === 'Enter') doStaffLogin(); });
}

async function doStaffLogin() {
  const pin = document.getElementById('pinInput').value.trim();
  const errEl = document.getElementById('pinError');
  try {
    await api('/staff/login', { method: 'POST', body: JSON.stringify({ pin }) });
    state.staffLoggedIn = true;
    renderStaff();
  } catch (e) {
    errEl.textContent = '⚠️ ' + e.message;
    errEl.classList.remove('hidden');
  }
}

let staffFilter = 'All';
let staffDate = fmtDateKey(new Date());

async function renderStaffDashboard() {
  // add sign-out button next to staff admin nav
  const staffBtn = document.querySelector('[data-nav="staff"]');
  if (!document.getElementById('signOutBtn')) {
    const b = document.createElement('button');
    b.className = 'btn btn-outline';
    b.id = 'signOutBtn';
    b.style.color = '#ff8f9c'; b.style.borderColor = '#5a1f27';
    b.textContent = 'Sign Out';
    b.addEventListener('click', () => { state.staffLoggedIn = false; state.view = 'book'; document.getElementById('signOutBtn')?.remove(); render(); });
    staffBtn.after(b);
  }

  const results = await api(`/bookings?date=${staffDate}${staffFilter !== 'All' ? `&status=${staffFilter.toLowerCase().replace(' ', '-')}` : ''}`);
  const allToday = await api(`/bookings?date=${staffDate}`);

  const inChair = allToday.filter(b => b.status === 'in-service').length;
  const completed = allToday.filter(b => b.status === 'completed').length;
  const revenue = allToday.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0);

  app.innerHTML = `
    <div class="section">
      <div class="section-head-row">
        <div>
          <div class="online-dot">STAFF PORTAL ONLINE</div>
          <h2 class="section-title" style="margin-top:8px">The Scissors Family Saloon • Counter Console</h2>
          <p class="section-sub">Manage appointments, chair seating status, and fast walk-in bookings</p>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-primary" id="walkinBtn">➕ Walk-in Quick Book</button>
          <button class="btn btn-outline" id="refreshBtn">🔄</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card"><div class="stat-top"><span>Today's Total</span>👥</div><div class="stat-val">${allToday.length}</div><div class="stat-sub">Bookings for ${staffDate}</div></div>
        <div class="stat-card"><div class="stat-top"><span>In Chair Right Now</span>💺</div><div class="stat-val" style="color:var(--amber)">${inChair}</div><div class="stat-sub">Active services in progress</div></div>
        <div class="stat-card"><div class="stat-top"><span>Completed</span>✅</div><div class="stat-val" style="color:var(--green)">${completed}</div><div class="stat-sub">Served &amp; checked out</div></div>
        <div class="stat-card"><div class="stat-top"><span>Estimated Business</span>💰</div><div class="stat-val" style="color:var(--amber)">₹${revenue}</div><div class="stat-sub">Revenue for selected date</div></div>
      </div>

      <div class="staff-toolbar">
        <div class="left">
          <label style="font-size:13px;color:var(--text-dim)">📅 Date:</label>
          <input type="date" id="staffDate" value="${staffDate}" />
          <button class="btn btn-outline" id="todayBtn">Today</button>
        </div>
        <div class="filter-row">
          ${['All', 'Confirmed', 'In Service', 'Completed', 'Cancelled'].map(f => `<div class="chip ${staffFilter === f ? 'active' : ''}" data-filter="${f}">${f}</div>`).join('')}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head-row">
        <h3 style="font-family:var(--font-serif);margin:0">Floor Schedule &amp; Bookings (${results.length})</h3>
        <span style="color:var(--text-faint);font-size:13px">Sorted chronologically by slot</span>
      </div>
      <div id="staffList" style="margin-top:20px">
        ${results.length ? results.map(staffBookingRow).join('') : '<div class="empty-state">No appointments found for the selected date and filter.</div>'}
      </div>
    </div>

    <div id="walkinModal"></div>
  `;

  document.getElementById('walkinBtn').addEventListener('click', openWalkinModal);
  document.getElementById('refreshBtn').addEventListener('click', renderStaffDashboard);
  document.getElementById('staffDate').addEventListener('change', e => { staffDate = e.target.value; renderStaffDashboard(); });
  document.getElementById('todayBtn').addEventListener('click', () => { staffDate = fmtDateKey(new Date()); renderStaffDashboard(); });
  document.querySelectorAll('[data-filter]').forEach(el => el.addEventListener('click', () => { staffFilter = el.dataset.filter; renderStaffDashboard(); }));
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', async () => {
    await api(`/bookings/${el.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: el.dataset.action }) });
    toast('Status updated.');
    renderStaffDashboard();
  }));
}

function staffBookingRow(b) {
  const nextActions = {
    confirmed: [['in-service', 'Start Service'], ['cancelled', 'Cancel']],
    'in-service': [['completed', 'Mark Completed']],
    completed: [],
    cancelled: [],
  };
  const actions = (nextActions[b.status] || []).map(([status, label]) =>
    `<button class="btn ${status === 'cancelled' ? 'btn-danger' : 'btn-outline'}" data-action="${status}" data-id="${b.id}" style="padding:7px 12px;font-size:12.5px">${label}</button>`
  ).join('');

  return `
    <div class="booking-item">
      <div class="bi-left">
        <b>${escapeHtml(b.name)} <span style="color:var(--text-faint);font-weight:400">• ${b.phone}</span></b>
        <div class="meta">${escapeHtml(b.serviceName)} — ${escapeHtml(b.chairName)}</div>
        <div class="meta">${b.slot} • ${b.source === 'walk-in' ? '🚶 Walk-in' : '💻 Online'} ${b.notes ? '• 📝 ' + escapeHtml(b.notes) : ''}</div>
        <div class="booking-id">Pass ID: ${b.id}</div>
      </div>
      <div class="bi-right">
        <span class="status-tag ${b.status}">${b.status.replace('-', ' ')}</span>
        <div class="meta" style="margin-top:8px">₹${b.price}</div>
        <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">${actions}</div>
      </div>
    </div>
  `;
}

// ---- Walk-in quick book modal ----

function openWalkinModal() {
  const modal = document.getElementById('walkinModal');
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px" id="modalBackdrop">
      <div class="section" style="max-width:520px;width:100%;margin:0;max-height:90vh;overflow:auto">
        <h3 style="font-family:var(--font-serif);margin-top:0">➕ Walk-in Quick Book</h3>
        <div class="field"><label>Full Name *</label><input id="wName" placeholder="Walk-in customer name" /></div>
        <div class="field"><label>10-Digit Mobile Number *</label><div class="phone-input"><span>+91</span><input id="wPhone" maxlength="10" inputmode="numeric" placeholder="9876543210" /></div></div>
        <div class="field"><label>Service *</label>
          <select id="wService" style="width:100%;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:12px;color:var(--text)">
            ${SERVICES.map(s => `<option value="${s.id}">${escapeHtml(s.name)} — ₹${s.price}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Slot *</label>
          <select id="wSlot" style="width:100%;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:12px;color:var(--text)">
            ${[...SLOTS.morning, ...SLOTS.afternoon, ...SLOTS.evening].map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Chair *</label>
          <select id="wChair" style="width:100%;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:12px;color:var(--text)">
            ${CHAIRS.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.stylist)})</option>`).join('')}
          </select>
        </div>
        <div id="wError" class="error-text hidden"></div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-outline" id="wCancel" style="flex:1">Cancel</button>
          <button class="btn btn-primary" id="wSubmit" style="flex:2">Confirm Walk-in Booking</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('wCancel').addEventListener('click', () => { modal.innerHTML = ''; });
  document.getElementById('modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') modal.innerHTML = ''; });
  document.getElementById('wSubmit').addEventListener('click', async () => {
    const name = document.getElementById('wName').value.trim();
    const phone = document.getElementById('wPhone').value.trim();
    const serviceId = document.getElementById('wService').value;
    const slot = document.getElementById('wSlot').value;
    const chairId = document.getElementById('wChair').value;
    const errEl = document.getElementById('wError');
    errEl.classList.add('hidden');
    if (!name) { errEl.textContent = '⚠️ Please enter a name.'; errEl.classList.remove('hidden'); return; }
    if (!/^\d{10}$/.test(phone)) { errEl.textContent = '⚠️ Please enter a valid 10-digit number.'; errEl.classList.remove('hidden'); return; }
    try {
      await api('/bookings/walkin', { method: 'POST', body: JSON.stringify({ name, phone, serviceId, date: staffDate, slot, chairId }) });
      toast('Walk-in booked!');
      modal.innerHTML = '';
      renderStaffDashboard();
    } catch (e) {
      errEl.textContent = '⚠️ ' + e.message;
      errEl.classList.remove('hidden');
    }
  });
}

// ---------- Utils ----------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

boot();
