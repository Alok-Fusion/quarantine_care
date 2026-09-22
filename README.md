# 🏥 Quarantine Care — Fullstack Healthcare Operations Platform

A modern, production-grade clinical operations and quarantine management platform built with **Next.js 15 (App Router, TypeScript, Tailwind CSS)** on the frontend and **Node.js + Express + TypeScript + MongoDB (Mongoose)** on the backend.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: Next.js 15 (App Router, React 19, Tailwind CSS, Lucide React) — Running on `http://localhost:3000`
- **Backend API**: Node.js, Express, TypeScript, Mongoose ODM — Running on `http://localhost:4000`
- **Database**: MongoDB Atlas Cluster (with local fallback)
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/ci.yml`) for automated building and type-checking.

---

## 🚀 Quick Start Guide

### 1. Start the Backend API

```bash
cd backend
npm install
npm run seed     # Seeds 3 staff members and ~20 realistic quarantine patients
npm run dev      # Runs Express backend at http://localhost:4000
```

### 2. Start the Next.js Frontend

```bash
cd frontend
npm install
npm run dev      # Runs Next.js frontend at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Demo Login Credentials (Seeded)

The database includes 3 pre-seeded accounts corresponding to the primary clinical roles. The login screen also contains instant quick-access demo buttons for all three:

| Role | Staff ID | Name | Target Dashboard | Description |
| :--- | :--- | :--- | :--- | :--- |
| **NURSE** | `N001` | Nurse Sarah Jenkins | `/nurse` | Bedside vitals logging, duplicate temperature alerts |
| **DOCTOR** | `D001` | Dr. Alexander Ross, MD | `/doctor` | Daily rounds, consultation notes, discharge & mortality |
| **ADMIN** | `A001` | Director Marcus Vance | `/admin` | 74-bed capacity utilization, epidemic mortality alerts |

---

## 🌟 Key Platform Features

### 1. Lightweight Token-Free Authentication & Role Guards
- Single input for **Staff ID** on `/login`.
- Automatically attaches the `x-staff-id` header to all API requests via [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts).
- Global **Role Guard**: Prevents cross-role access (e.g., if a Nurse navigates to `/admin`, they are redirected back to `/nurse` with a toast: `"Not authorized for this view."`).

### 2. Nurse Station (`/nurse`)
- Bedside active patient list with search and filtering.
- Visual badges for daily vitals status (`Recorded Today` vs `Vitals Needed`).
- Interactive bedside logging modal.
- **409 Duplicate Temperature Protection**: Detects if vitals were already logged today, prompting a confirmation modal with the previous reading time and optional `?force=true` overwrite.

### 3. Doctor Rounds Portal (`/doctor`)
- Prioritized "Not Visited Today" rounds list.
- **Clinical Prerequisite Enforcement**: Rejects visit submission (`400 Bad Request`) if nursing staff has not recorded today's temperature first.
- **3-Consecutive Fever-Free Days Discharge Engine**: Evaluates patient temperature history; enables the **"Discharge Patient"** action once 3 consecutive days without fever are achieved.
- **High-Friction Mortality Marking**: Confirmation modal requiring clinical notes to officially close an isolation record.

### 4. Executive Admin Center (`/admin`)
- **Facility Capacity Metrics**: Real-time occupancy out of 74 bed capacity.
- **Epidemic Mortality Alerting**: Prominent Red Banner triggered when mortality rate exceeds 15%.
- **Discharge Pipeline Queue**: Live table of all patients meeting discharge eligibility criteria awaiting doctor sign-off.

---

## 📡 API Endpoint Catalog

| Method | Endpoint | Allowed Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Authenticate via `staffId` |
| `GET` | `/api/health` | Public | Service health & MongoDB status |
| `GET` | `/api/staff` | Admin | List all staff members with active status |
| `POST` | `/api/staff` | Admin | Add staff with auto-generated ID (N00X/D00X/A00X) |
| `PATCH` | `/api/staff/:id` | Admin | Update staff name/role/active status |
| `GET` | `/api/beds` | Staff | 74-bed status map (occupied vs free) |
| `GET` | `/api/notifications` | Staff | Scoped unread notifications (polled every 20s) |
| `PATCH` | `/api/notifications/:id/read` | Staff | Mark individual notification as read |
| `PATCH` | `/api/notifications/read-all` | Staff | Mark all notifications as read |
| `GET` | `/api/patients` | Staff | List active patients (`?filter=not-visited-today`) |
| `POST` | `/api/patients` | Nurse / Admin | Admit patient (capacity <= 74, bed conflict 409) |
| `GET` | `/api/patients/:id` | Staff | Full patient detail with vitals & visit history |
| `GET` | `/api/patients/:id/discharge-eligible` | Staff | 3-consecutive fever-free evaluation breakdown |
| `POST` | `/api/patients/:id/temperature` | Nurse | Record vitals (`?force=true` for duplicate overwrite) |
| `POST` | `/api/patients/:id/visit` | Doctor | Log clinical consultation (requires vitals today) |
| `POST` | `/api/patients/:id/discharge` | Doctor | Approve discharge (requires 3 fever-free days) |
| `POST` | `/api/patients/:id/mark-deceased` | Doctor | Mark patient deceased |
| `GET` | `/api/stats` | Admin | Capacity, occupancy, and mortality alert metrics |
| `GET` | `/api/patients/discharge-queue` | Admin / Doctor | Active patients ready for discharge |

---

## 🧪 Testing & Verification

Run automated backend API verification tests:
```bash
cd backend
npx tsx src/scripts/verifyApi.ts
```

Build the frontend for production:
```bash
cd frontend
npm run build
```
