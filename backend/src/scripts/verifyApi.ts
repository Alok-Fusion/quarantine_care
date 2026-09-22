import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../server';
import http from 'http';
import { Patient } from '../models/Patient';
import { TemperatureLog } from '../models/TemperatureLog';

dotenv.config();

const PORT = 4001; // use separate port for test verification

async function runTests() {
  console.log('\n======================================================');
  console.log('       RUNNING AUTOMATED ENDPOINT VERIFICATION        ');
  console.log('======================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  let passed = 0;
  let failed = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  try {
    // 1. Test Login
    await assertTest('POST /api/login with valid staffId N001 returns staff info', async () => {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: 'N001' }),
      });
      const data: any = await res.json();
      if (res.status !== 200 || data.role !== 'nurse' || data.staffId !== 'N001') {
        throw new Error(`Expected 200 nurse, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    // 2. Test Login with invalid staffId
    await assertTest('POST /api/login with invalid staffId returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: 'UNKNOWN999' }),
      });
      if (res.status !== 404) {
        throw new Error(`Expected 404, got ${res.status}`);
      }
    });

    // 3. Test Unauthorized request without x-staff-id
    await assertTest('GET /api/patients without x-staff-id returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/patients`);
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    });

    // 4. Test Role Check: Nurse forbidden on Doctor visit endpoint
    await assertTest('POST /api/patients/:id/visit with Nurse header returns 403', async () => {
      const patient = await Patient.findOne({ status: 'active' });
      const res = await fetch(`${baseUrl}/api/patients/${patient!._id}/visit`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'N001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Nurse trying to visit' }),
      });
      const data: any = await res.json();
      if (res.status !== 403 || !data.error.includes('Action not permitted for role: nurse')) {
        throw new Error(`Expected 403 forbidden message, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    // 5. Test Shared Endpoint: GET /api/patients
    await assertTest('GET /api/patients returns active patients with computed fields', async () => {
      const res = await fetch(`${baseUrl}/api/patients`, {
        headers: { 'x-staff-id': 'N001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || !Array.isArray(data) || data.length === 0) {
        throw new Error(`Expected array of patients, got status ${res.status}`);
      }
      const first = data[0];
      if (typeof first.tempLoggedToday !== 'boolean' || typeof first.visitedToday !== 'boolean') {
        throw new Error('Missing computed fields tempLoggedToday / visitedToday');
      }
    });

    // 6. Test Doctor Visit blocked when temperature is missing
    await assertTest('POST /api/patients/:id/visit rejected 400 if no temp logged today', async () => {
      // Find patient without temp today (e.g. Zoe Kravitz)
      const patient = await Patient.findOne({ name: 'Zoe Kravitz' });
      const res = await fetch(`${baseUrl}/api/patients/${patient!._id}/visit`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'D001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Doctor consultation' }),
      });
      const data: any = await res.json();
      if (res.status !== 400 || !data.error.includes('temperature not yet recorded today')) {
        throw new Error(`Expected 400 with temperature warning, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    // 7. Test Nurse Log Temperature & 409 Duplicate prevention
    await assertTest('POST /api/patients/:id/temperature logs temp, rejects second call with 409 unless ?force=true', async () => {
      const patient = await Patient.findOne({ name: 'Zoe Kravitz' });
      // First log: should succeed (201)
      const res1 = await fetch(`${baseUrl}/api/patients/${patient!._id}/temperature`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'N001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: 98.6 }),
      });
      if (res1.status !== 201) {
        const d1: any = await res1.json();
        throw new Error(`Expected 201 on first log, got ${res1.status}: ${JSON.stringify(d1)}`);
      }

      // Second log without ?force=true: should 409
      const res2 = await fetch(`${baseUrl}/api/patients/${patient!._id}/temperature`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'N001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: 98.7 }),
      });
      if (res2.status !== 409) {
        throw new Error(`Expected 409 conflict, got ${res2.status}`);
      }

      // Third log with ?force=true: should succeed (201)
      const res3 = await fetch(`${baseUrl}/api/patients/${patient!._id}/temperature?force=true`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'N001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: 98.8 }),
      });
      if (res3.status !== 201) {
        throw new Error(`Expected 201 with force=true, got ${res3.status}`);
      }
    });

    // 8. Test Doctor Visit success now that temperature is logged
    await assertTest('POST /api/patients/:id/visit succeeds once temperature is logged today', async () => {
      const patient = await Patient.findOne({ name: 'Zoe Kravitz' });
      const res = await fetch(`${baseUrl}/api/patients/${patient!._id}/visit`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'D001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Vitals stable. Continuing observation.' }),
      });
      if (res.status !== 201) {
        const d: any = await res.json();
        throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(d)}`);
      }
    });

    // 9. Test Discharge Eligibility Check
    await assertTest('GET /api/patients/:id/discharge-eligible returns calculation breakdown', async () => {
      const patient = await Patient.findOne({ name: 'Eleanor Vance' });
      const res = await fetch(`${baseUrl}/api/patients/${patient!._id}/discharge-eligible`, {
        headers: { 'x-staff-id': 'D001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || data.isEligible !== true || data.consecutiveFeverFreeDays < 3) {
        throw new Error(`Expected eligible patient, got ${JSON.stringify(data)}`);
      }
    });

    // 10. Test Doctor Discharge Ineligible Patient (400) vs Eligible Patient (200)
    await assertTest('POST /api/patients/:id/discharge rejects ineligible (400) and approves eligible (200)', async () => {
      const ineligible = await Patient.findOne({ name: "Liam O'Connor" });
      const resIneligible = await fetch(`${baseUrl}/api/patients/${ineligible!._id}/discharge`, {
        method: 'POST',
        headers: { 'x-staff-id': 'D001', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (resIneligible.status !== 400) {
        throw new Error(`Expected 400 for ineligible patient, got ${resIneligible.status}`);
      }

      const eligible = await Patient.findOne({ name: 'Carlos Rodriguez' });
      const resEligible = await fetch(`${baseUrl}/api/patients/${eligible!._id}/discharge`, {
        method: 'POST',
        headers: { 'x-staff-id': 'D001', 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Cleared discharge protocol' }),
      });
      if (resEligible.status !== 200) {
        const d: any = await resEligible.json();
        throw new Error(`Expected 200 for eligible discharge, got ${resEligible.status}: ${JSON.stringify(d)}`);
      }
    });

    // 11. Test Admin Stats
    await assertTest('GET /api/stats with Admin header returns capacity, occupancy, and alert', async () => {
      const res = await fetch(`${baseUrl}/api/stats`, {
        headers: { 'x-staff-id': 'A001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || data.capacity !== 74 || typeof data.mortalityAlert !== 'boolean') {
        throw new Error(`Invalid stats response: ${JSON.stringify(data)}`);
      }
    });

    // 12. Test Filter Not-Visited-Today
    await assertTest('GET /api/patients?filter=not-visited-today returns only unvisited patients', async () => {
      const res = await fetch(`${baseUrl}/api/patients?filter=not-visited-today`, {
        headers: { 'x-staff-id': 'D001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || !Array.isArray(data)) {
        throw new Error(`Expected array, got ${res.status}`);
      }
      const hasVisited = data.some((p: any) => p.visitedToday === true);
      if (hasVisited) {
        throw new Error('Returned patient who was visited today despite filter');
      }
    });

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
