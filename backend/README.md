# 🏥 Quarantine Care — Backend API

A high-performance Node.js, Express, and TypeScript backend with MongoDB (Mongoose) built for quarantine facility management, clinical workflow enforcement, role-based access control, vital sign tracking, and epidemic metrics.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file (or copy from `.env.example`):

```env
MONGODB_URI=mongodb://localhost:27017/quarantinecare
PORT=4000
FRONTEND_URL=http://localhost:5173
```

### 3. Seed the Database
```bash
npm run seed
```

#### 🔑 Staff Login Credentials (Generated from Seed)
| Role | Staff ID | Name | HTTP Header |
| :--- | :--- | :--- | :--- |
| **NURSE** | `N001` | Nurse Sarah Jenkins | `x-staff-id: N001` |
| **DOCTOR** | `D001` | Dr. Alexander Ross, MD | `x-staff-id: D001` |
| **ADMIN** | `A001` | Director Marcus Vance | `x-staff-id: A001` |

### 4. Run the Server
```bash
# Development mode with hot-reloading
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

---

## 📡 Full API Reference & cURL Examples

### 1. Authentication
```bash
# Login (looks up Staff, returns credentials)
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"staffId": "N001"}'
```

### 2. Shared Endpoints (Any Staff Member)
```bash
# Get all active patients (with computed tempLoggedToday, visitedToday, dischargeEligible)
curl http://localhost:4000/api/patients -H "x-staff-id: N001"

# Filter active patients not visited today
curl "http://localhost:4000/api/patients?filter=not-visited-today" -H "x-staff-id: D001"

# Get patient full detail & history
curl http://localhost:4000/api/patients/<PATIENT_ID> -H "x-staff-id: D001"

# Check patient 3-day fever-free discharge eligibility
curl http://localhost:4000/api/patients/<PATIENT_ID>/discharge-eligible -H "x-staff-id: D001"
```

### 3. Nurse Endpoints (Role: `nurse`)
```bash
# Record patient temperature (returns 409 if already logged today)
curl -X POST http://localhost:4000/api/patients/<PATIENT_ID>/temperature \
  -H "x-staff-id: N001" \
  -H "Content-Type: application/json" \
  -d '{"value": 98.6}'

# Force record duplicate temperature for today
curl -X POST "http://localhost:4000/api/patients/<PATIENT_ID>/temperature?force=true" \
  -H "x-staff-id: N001" \
  -H "Content-Type: application/json" \
  -d '{"value": 101.4}'
```

### 4. Doctor Endpoints (Role: `doctor`)
```bash
# Record doctor clinical visit (requires today's temperature to be recorded first)
curl -X POST http://localhost:4000/api/patients/<PATIENT_ID>/visit \
  -H "x-staff-id: D001" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Patient condition improving, continue current treatment."}'

# Discharge patient (requires 3 consecutive fever-free days)
curl -X POST http://localhost:4000/api/patients/<PATIENT_ID>/discharge \
  -H "x-staff-id: D001" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Clear of contagion, released home."}'

# Mark patient as deceased
curl -X POST http://localhost:4000/api/patients/<PATIENT_ID>/mark-deceased \
  -H "x-staff-id: D001" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Patient expired due to acute complications."}'
```

### 5. Admin Endpoints (Role: `admin`)
```bash
# Get facility capacity, occupancy, and mortality alert metrics
curl http://localhost:4000/api/stats -H "x-staff-id: A001"

# Get active patients ready for discharge
curl http://localhost:4000/api/patients/discharge-queue -H "x-staff-id: A001"
```
