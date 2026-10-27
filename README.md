# Centralized Scientific Instrument Booking & Utilization Tracking System

> **A MERN Stack Web Application with Dual-Role Access Control (USER & ADMIN), Instant Booking Confirmation, and Live Actual Usage Runtime Tracking**

---

## 1. Project Overview

In multi-department research facilities and universities, advanced scientific equipment (such as UV-Vis Spectrophotometers, Centrifuges, PCR Machines, Digital Microscopes, and HPLC systems) are shared among numerous researchers, students, and faculty.

This system provides **instant automated booking confirmation**, **strict conflict prevention**, and **actual instrument runtime tracking**:

1. **Instant Automated Confirmation:** When a user selects a date and time slot with no conflicting bookings, the reservation is **automatically confirmed** (`status = "Confirmed"`). Users do not have to wait for manual administrator approval.
2. **Conflict Detection:** Evaluates overlapping bookings in the Express backend using `newStartTime < existingEndTime && newEndTime > existingStartTime`. If an overlap exists, the booking is rejected with:
   > *"This instrument is already booked during the selected time."*
3. **Scheduled vs. Actual Usage Tracking:**
   - **Scheduled Duration:** Calculated from booking window (`endTime − startTime`).
   - **Actual Usage Duration:** Recorded live by the administrator when the user begins (`Start Usage` → `In Progress`) and finishes (`End Usage` → `Completed`) their laboratory experiment.
   - Calculates the exact runtime in minutes (`actualUsageDuration`) and formats it into hours and minutes (e.g. `1 hr 34 min`).
4. **Admin Operational Control:** Admin can cancel any booking at any time, immediately freeing the slot for other researchers.

---

## 2. Default Login Credentials (For Project Viva / Review)

The database automatically seeds with default accounts:

| Role | Portal Tab | Email | Password | Permissions & Access |
|---|---|---|---|---|
| **USER** | User Login | `user@lab.edu` | `user123` | • View user dashboard<br>• Check slot availability before reserving<br>• Book equipment (Instant confirmation: `status = Confirmed`)<br>• View own reservations on **My Bookings**<br>• Cancel own confirmed bookings |
| **ADMIN** | Admin Login | `admin@lab.edu` | `admin123` | • View 8-metric facility dashboard<br>• Manage equipment inventory (Add, Edit, Delete, Maintenance mode)<br>• Manage all reservations<br>• Click `[ Start Usage ]` and `[ End Usage ]`<br>• Cancel any booking to free slots<br>• Analyze Scheduled vs. Actual Usage runtime on Utilization page |

*Note: Passwords in MongoDB are securely hashed using `bcrypt` (10 salt rounds). Plaintext passwords are never stored.*

---

## 3. Booking Status Lifecycle

Bookings transition through four distinct statuses:

```
[User Selects Open Slot]
          ↓
[Instant Automatic Confirmation] ─── Status: "Confirmed"
          ↓
[User Arrives at Laboratory]
[Admin Clicks "Start Usage"]     ─── Status: "In Progress" (Records actualStartTime)
          ↓
[User Finishes Experiment]
[Admin Clicks "End Usage"]       ─── Status: "Completed" (Records actualEndTime & calculates actualUsageDuration in minutes)
          │
          └── [If Cancelled at any point] ─── Status: "Cancelled" (Slot immediately freed)
```

---

## 4. Conflict Checking Algorithm (Viva Question)

When a booking is submitted, the Express backend verifies:
1. `instrumentId` exists and is not in `Maintenance` status.
2. `endTime > startTime`.
3. Query all existing bookings for the **same instrument** on the **same date** where `status !== 'Cancelled'`.
4. Overlap condition:
   ```javascript
   const hasConflict = existingBookings.some((existing) => {
     return newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes;
   });
   ```
5. **Conflict Examples:**
   - Existing: `10:00 AM → 12:00 PM` | New: `11:00 AM → 1:00 PM` ➔ **REJECT (409 Conflict)**
   - Existing: `10:00 AM → 12:00 PM` | New: `12:00 PM → 2:00 PM` ➔ **ALLOW (Confirmed)**
   - Existing: `10:00 AM → 12:00 PM` | New: `8:00 AM → 10:00 AM` ➔ **ALLOW (Confirmed)**

---

## 5. Scheduled vs. Actual Usage Duration

The system strictly differentiates between scheduled and actual usage:

- **Scheduled Duration:**
  Derived from: `endTime − startTime` (e.g. `10:00 AM → 1:00 PM` = `3 hours`).
- **Actual Usage Duration:**
  Calculated upon clicking `End Usage`:
  `actualUsageDuration = Math.round((actualEndTime − actualStartTime) / 60000)` (minutes).
  Stored in MongoDB and displayed as `X hr Y min` (e.g. `10:15 AM → 12:30 PM` = `2 hr 15 min`).

---

## 6. MongoDB Database Schemas

### Booking Model (`server/models/Booking.js`)
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  instrumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instrument', required: true },
  date: { type: String, required: true },          // Format: YYYY-MM-DD
  startTime: { type: String, required: true },     // Format: HH:mm
  endTime: { type: String, required: true },       // Format: HH:mm
  purpose: { type: String, required: true },
  status: {
    type: String,
    enum: ['Confirmed', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Confirmed'
  },
  actualStartTime: { type: Date, default: null },
  actualEndTime: { type: Date, default: null },
  actualUsageDuration: { type: Number, default: null }, // Stored in minutes
  createdAt: { type: Date, default: Date.now }
}
```

---

## 7. REST API Endpoints

### User APIs (`requireAuth`)
- `GET /api/user/dashboard` — Available equipment counts, active bookings, completed sessions.
- `GET /api/user/bookings` — User's personal bookings.
- `POST /api/user/check-availability` — Pre-check slot before reserving.
- `POST /api/user/bookings` — Automatic booking confirmation (`status: 'Confirmed'`).
- `PATCH /api/user/bookings/:id/cancel` — Cancels user's own confirmed reservation and frees slot.

### Admin APIs (`requireAuth` + `requireAdmin`)
- `GET /api/admin/dashboard` — Facility metrics (Confirmed, In Progress, Completed, Cancelled).
- `GET /api/admin/bookings` — All facility reservations with scheduled and actual runtimes.
- `POST /api/admin/bookings/:id/start-usage` — Sets status to `In Progress` and records `actualStartTime`.
- `POST /api/admin/bookings/:id/end-usage` — Sets status to `Completed`, records `actualEndTime`, and calculates `actualUsageDuration`.
- `POST /api/admin/bookings/:id/cancel` — Cancels any reservation and frees the slot.
- `GET /api/admin/utilization` — Equipment utilization: Total Scheduled Hours vs. Total Actual Usage Hours.

---

## 8. Local Setup & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run the fullstack application (Port 3000)
npm run dev
```

Open **`http://localhost:3000`** in your browser. Use the one-click demo credentials on the Login page to demonstrate both user self-booking and admin actual usage tracking!
