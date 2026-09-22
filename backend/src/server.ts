import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateStaff, requireRole } from './middleware/auth';
import { Patient } from './models/Patient';

const app: Application = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/quarantinecare';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (
        FRONTEND_URL === '*' ||
        origin === FRONTEND_URL ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for prototype testing
    },
    allowedHeaders: ['Content-Type', 'x-staff-id', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Auth Routes
app.use('/api', authRoutes);

// Admin Routes (mounted at /api/admin as well as root /api/stats for convenience)
app.use('/api/admin', adminRoutes);

// Direct /api/stats endpoint for admin role as requested
app.get(
  '/api/stats',
  authenticateStaff,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const CAPACITY = 74;

      const [occupied, dischargedCount, deceasedCount, totalAdmitted] = await Promise.all([
        Patient.countDocuments({ status: 'active' }),
        Patient.countDocuments({ status: 'discharged' }),
        Patient.countDocuments({ status: 'deceased' }),
        Patient.countDocuments(),
      ]);

      const totalResolved = dischargedCount + deceasedCount;
      const mortalityRate =
        totalAdmitted > 0
          ? Number((deceasedCount / totalAdmitted).toFixed(4))
          : 0;

      const successRate =
        totalResolved > 0
          ? Number((dischargedCount / totalResolved).toFixed(4))
          : 0;

      const mortalityAlert = mortalityRate > 0.15;
      const occupancyRate = Number((occupied / CAPACITY).toFixed(4));

      res.json({
        occupied,
        capacity: CAPACITY,
        dischargedCount,
        deceasedCount,
        totalAdmitted,
        totalResolved,
        occupancyRate,
        mortalityRate,
        successRate,
        mortalityAlert,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Error fetching statistics',
        details: error.message,
      });
    }
  }
);

// Patient Routes
app.use('/api/patients', patientRoutes);

// 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection & Server initialization
async function startServer() {
  try {
    console.log('[Database] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] Connected successfully to MongoDB:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));

    app.listen(PORT, () => {
      console.log(`[Server] Quarantine Care Backend running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] Allowed Frontend: ${FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
