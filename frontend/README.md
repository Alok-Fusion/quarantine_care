# 🏥 Quarantine Care — Frontend Web App

A modern Next.js 15 (App Router, TypeScript, Tailwind CSS) bedside clinical application designed for hospital quarantine facilities.

---

## 🚀 Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env.local` (or copy from `.env.local.example`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Staff Login Credentials (Seeded)

| Role | Staff ID | Name | Target Dashboard |
| :--- | :--- | :--- | :--- |
| **NURSE** | `N001` | Nurse Sarah Jenkins | `/nurse` |
| **DOCTOR** | `D001` | Dr. Alexander Ross, MD | `/doctor` |
| **ADMIN** | `A001` | Director Marcus Vance | `/admin` |

---

## 📱 Features

1. **Role-Based Routing & Route Guards**:
   - `/login`: Single Staff ID input with instant quick-login demo buttons.
   - Automatically redirects unauthorized role attempts (e.g. Nurse visiting `/admin` is redirected back to `/nurse` with toast notification).
2. **API Interceptor (`lib/api.ts`)**:
   - Auto-injects `x-staff-id` header from `localStorage`.
   - Intercepts `401 Unauthorized` and redirects cleanly to `/login`.
3. **Nurse Dashboard (`/nurse`)**:
   - Patient bedside vitals tracking.
   - 409 Duplicate Temperature prompt modal with force-retry (`?force=true`).
4. **Doctor Dashboard (`/doctor`)**:
   - Prioritized "Not Visited Today" rounds list.
   - Clinical visit logger with gatekeeping (blocks visit if temperature is not recorded today).
   - Patient discharge clearance for 3-day fever-free patients.
   - High-friction "Mark Deceased" modal.
5. **Admin Dashboard (`/admin`)**:
   - 74-bed capacity utilization and occupancy rate.
   - Critical Red Alert Banner when mortality rate exceeds 15%.
   - Active discharge queue table.
