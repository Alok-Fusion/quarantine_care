import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../server';
import http from 'http';
import { Patient } from '../models/Patient';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/quarantinecare';

async function runTests() {
  console.log('\n======================================================');
  console.log('    RUNNING EXTENDED ENDPOINT VERIFICATION SUITE      ');
  console.log('======================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for tests.');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4005;
  const baseUrl = `http://localhost:${port}`;

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
    await assertTest('POST /api/login with valid staffId N001', async () => {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: 'N001' }),
      });
      const data: any = await res.json();
      if (res.status !== 200 || data.role !== 'nurse') {
        throw new Error(`Expected 200 nurse, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    // 2. Admin Staff Listing
    await assertTest('GET /api/staff returns staff directory for Admin', async () => {
      const res = await fetch(`${baseUrl}/api/staff`, {
        headers: { 'x-staff-id': 'A001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || !Array.isArray(data) || data.length === 0) {
        throw new Error(`Expected staff array, got ${res.status}`);
      }
    });

    // 3. Admin Staff Creation with Auto Staff ID
    let createdStaffId = '';
    let createdStaffMongoId = '';
    await assertTest('POST /api/staff creates new nurse with auto-generated staffId (N002+)', async () => {
      const res = await fetch(`${baseUrl}/api/staff`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'A001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Nurse Emily Clarke', role: 'nurse' }),
      });
      const data: any = await res.json();
      if (res.status !== 201 || !data.staffId || !data.staffId.startsWith('N')) {
        throw new Error(`Expected 201 with generated N-prefix staffId, got ${res.status}: ${JSON.stringify(data)}`);
      }
      createdStaffId = data.staffId;
      createdStaffMongoId = data.staff._id;
    });

    // 4. Deactivate Staff & Verify Login Block
    await assertTest('PATCH /api/staff/:id deactivates staff, and login with deactivated ID is blocked 401', async () => {
      const patchRes = await fetch(`${baseUrl}/api/staff/${createdStaffMongoId}`, {
        method: 'PATCH',
        headers: {
          'x-staff-id': 'A001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: false }),
      });
      if (patchRes.status !== 200) {
        throw new Error(`Expected 200 patch, got ${patchRes.status}`);
      }

      // Try login with deactivated ID
      const loginRes = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: createdStaffId }),
      });
      if (loginRes.status !== 401) {
        throw new Error(`Expected 401 blocked login for deactivated staff, got ${loginRes.status}`);
      }
    });

    // 5. Beds Map (74 beds total)
    await assertTest('GET /api/beds returns all 74 beds with status map', async () => {
      const res = await fetch(`${baseUrl}/api/beds`, {
        headers: { 'x-staff-id': 'N001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || data.capacity !== 74 || !Array.isArray(data.beds) || data.beds.length !== 74) {
        throw new Error(`Expected 74 beds, got ${data?.beds?.length}`);
      }
    });

    // 6. Bed Conflict Validation on Patient Admission
    await assertTest('POST /api/patients rejects admission if bed is already occupied (409 Conflict)', async () => {
      const existingPatient = await Patient.findOne({ status: 'active' });
      const res = await fetch(`${baseUrl}/api/patients`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'N001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Conflict Patient',
          bedNumber: existingPatient!.bedNumber,
        }),
      });
      const data: any = await res.json();
      if (res.status !== 409 || !data.error.includes('already occupied')) {
        throw new Error(`Expected 409 conflict, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    // 7. Successful Patient Admission on Free Bed & Notification Generation
    await assertTest('POST /api/patients admits to free bed and creates notifications for nurses/doctors', async () => {
      const res = await fetch(`${baseUrl}/api/patients`, {
        method: 'POST',
        headers: {
          'x-staff-id': 'N001',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Marcus Brody',
          bedNumber: 'Bed D-412',
          notes: 'Admitted for quarantine monitoring',
        }),
      });
      const data: any = await res.json();
      if (res.status !== 201 || data.bedNumber !== 'Bed D-412') {
        throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    // 8. Notifications Retrieval & Mark as Read
    await assertTest('GET /api/notifications returns unread notifications and PATCH /read-all clears them', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { 'x-staff-id': 'D001' },
      });
      const data: any = await res.json();
      if (res.status !== 200 || !Array.isArray(data.notifications)) {
        throw new Error(`Expected notifications array, got ${res.status}`);
      }

      // Mark all read
      const readAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'x-staff-id': 'D001' },
      });
      if (readAllRes.status !== 200) {
        throw new Error(`Expected 200 on read-all, got ${readAllRes.status}`);
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
