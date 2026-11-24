import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { connectDatabase, pool } from './config/db.js';
import { authMiddleware, requireRole } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import type { AuthenticatedRequest } from './types/index.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
const asyncRoute = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const id = z.string().uuid();
const coordinates = z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'gharsewa-api' }));
app.get('/api/services', asyncRoute(async (_req, res) => res.json((await pool.query('SELECT * FROM services ORDER BY name_en')).rows)));
app.post('/api/services', authMiddleware, requireRole('admin'), asyncRoute(async (req, res) => {
  const service = z.object({
    name_en: z.string().trim().min(1).max(100),
    name_np: z.string().trim().min(1).max(100)
  }).parse(req.body);
  const result = await pool.query(
    'INSERT INTO services (name_en, name_np) VALUES ($1, $2) RETURNING *',
    [service.name_en, service.name_np]
  );
  res.status(201).json(result.rows[0]);
}));

app.get('/api/providers', asyncRoute(async (req, res) => {
  const query = coordinates.extend({ radiusKm: z.coerce.number().positive().max(100).default(5), category: z.string().optional() }).parse(req.query);
  const values = [query.latitude, query.longitude, query.radiusKm, query.category ?? null];
  const result = await pool.query(`SELECT id,name,latitude,longitude,
    (6371 * acos(least(1, cos(radians($1)) * cos(radians(latitude))
    * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude))))) AS distance_km
    FROM users
    WHERE role='provider' AND is_email_verified=TRUE AND verification_status='verified'
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND (6371 * acos(least(1, cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
    + sin(radians($1)) * sin(radians(latitude))))) <= $3
    ORDER BY distance_km`, values);
  res.json(result.rows);
}));

app.post('/api/estimate', asyncRoute(async (req, res) => {
  const { prompt } = z.object({ prompt: z.string().trim().min(5).max(500) }).parse(req.body);
  const text = prompt.toLowerCase();
  const category = text.includes('pipe') || text.includes('tap') || text.includes('water') ? 'plumbing' : text.includes('clean') ? 'cleaning' : 'general';
  const presets: Record<string, { min: number; max: number; hours: number; steps: string[] }> = {
    plumbing: { min: 800, max: 2500, hours: 2, steps: ['Inspect leak source', 'Isolate water supply', 'Replace seal or damaged part', 'Test pressure and clean up'] },
    cleaning: { min: 600, max: 1800, hours: 3, steps: ['Confirm rooms and surfaces', 'Bring appropriate supplies', 'Deep clean requested areas', 'Final walkthrough'] },
    general: { min: 700, max: 2500, hours: 2, steps: ['Clarify task scope', 'Prepare tools and materials', 'Complete the work safely', 'Review result with you'] }
  };
  res.json({ category, currency: 'NPR', ...presets[category] });
}));

app.get('/api/admin/metrics', authMiddleware, requireRole('admin'), asyncRoute(async (_req, res) => {
  const result = await pool.query(`SELECT (SELECT count(*) FROM users WHERE role='taker') AS takers,
    (SELECT count(*) FROM users WHERE role='provider') AS providers,
    (SELECT count(*) FROM users WHERE role='provider' AND verification_status='verified') AS verified_providers,
    (SELECT count(*) FROM bookings) AS bookings, (SELECT coalesce(sum(total_price),0) FROM bookings WHERE status='completed') AS revenue`);
  res.json(result.rows[0]);
}));
app.get('/api/admin/providers/pending', authMiddleware, requireRole('admin'), asyncRoute(async (_req, res) => {
  const result = await pool.query(`
    SELECT id,name,email,location,latitude,longitude,citizenship_phot,
           verification_status,created_at
    FROM users
    WHERE role='provider' AND verification_status='pending'
    ORDER BY created_at DESC
  `);
  res.json(result.rows);
}));
app.patch('/api/admin/providers/:id/verify', authMiddleware, requireRole('admin'), asyncRoute(async (req, res) => {
  const providerId = z.coerce.number().int().positive().parse(req.params.id);
  const body = z.object({
    verified: z.boolean(),
    rejectionReason: z.string().trim().max(1000).optional()
  }).parse(req.body);
  const result = await pool.query(`
    UPDATE users
    SET verification_status=$1,
        verified_by=$2,
        verified_at=CASE WHEN $1='verified' THEN NOW() ELSE NULL END,
        rejection_reason=$3
    WHERE id=$4 AND role='provider'
    RETURNING *
  `, [body.verified ? 'verified' : 'rejected', (req as AuthenticatedRequest).user!.id, body.rejectionReason ?? null, providerId]);
  if (!result.rowCount) return res.status(404).json({ error: 'Provider not found' });
  res.json(result.rows[0]);
}));

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.flatten() });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);
const port = Number(process.env.PORT ?? 4000);

try {
  await connectDatabase();
  app.listen(port, () => console.log(`GharSewa API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Unable to connect to PostgreSQL:', error);
  await pool.end();
  process.exitCode = 1;
}
