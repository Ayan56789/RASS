# ✂️ The Scissors — Family Saloon Booking App

A full working prototype recreated from your screenshots: a 4-step real-time
seat-booking flow (service → date/slot → live chair matrix → confirm),
a "My Bookings" lookup page, and a Staff Admin portal with a live dashboard.

Bookings made by a customer immediately show up in the Staff Admin
dashboard — it's a real backend, not a static mock.

## What's inside

```
scissors-salon/
├── server.js           Express API (services, chairs, slots, bookings, staff login)
├── package.json
├── data/
│   └── bookings.json   Bookings are saved here (auto-created/updated, plain JSON)
└── public/
    ├── index.html
    ├── style.css
    └── app.js           Vanilla JS single-page app — no build step, no framework
```

## Requirements

- [Node.js](https://nodejs.org) version 16 or later (includes `npm`).
  Check you have it with: `node -v`

## How to run it

1. Unzip / copy the `scissors-salon` folder anywhere on your laptop.
2. Open a terminal in that folder.
3. Install the one dependency (Express):
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. You'll see:
   ```
   ✂️  The Scissors Family Saloon is running!
   → Open http://localhost:4000 in your browser
   ```
6. Open **http://localhost:4000** in your browser. That's it.

To stop the server, go back to the terminal and press `Ctrl + C`.

## Using the app

- **Book Seat** — pick a service, a date & time slot, then a chair on the
  live seat matrix (green = free, red = booked, amber = your selection),
  then enter your name & 10-digit mobile number to confirm. No payment is
  collected online — it's pay-at-counter, matching the original design.
- **My Bookings** — enter the same 10-digit number to see your booking(s)
  and their status.
- **Staff Admin** — click "Staff Admin", PIN is **1234** (there's also an
  "auto-fill" link). From the dashboard staff can:
  - See today's totals, who's in the chair, completed count, and revenue
  - Filter by status and pick any date
  - Move a booking through **Confirmed → In Service → Completed**, or cancel it
  - Add a **Walk-in Quick Book** for a customer who arrives in person

## Notes on how it works

- **Storage**: bookings are stored in `data/bookings.json` on disk, so they
  persist between restarts. There's no database to install.
- **Seat conflicts**: the server rejects a booking if that chair is already
  taken for the same date + slot, so two people can't double-book the same
  chair.
- **6 chairs / 6 stations**, 16 time slots a day (6 morning, 5 afternoon,
  5 evening), and 8 sample services — all matching your screenshots. You can
  edit these lists directly at the top of `server.js` (`SERVICES`, `CHAIRS`,
  `SLOTS`) to add your real services, stylists, or hours.
- **Resetting demo data**: to wipe all bookings, stop the server and replace
  the contents of `data/bookings.json` with `[]`.

## Customizing

- Colors, fonts, and layout: `public/style.css` (amber `#f5a623` / near-black
  theme, same as the screenshots).
- Salon name, phone number, hours shown in the header: `public/index.html`.
- Staff PIN: change `STAFF_PIN` near the top of `server.js`.
- Port: the app runs on port 4000 by default. To use a different port, run
  `PORT=5000 npm start` (Mac/Linux) or `set PORT=5000 && npm start` (Windows).
