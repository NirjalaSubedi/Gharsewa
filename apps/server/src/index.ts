import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { connectDatabase, pool } from './db/client.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
const asyncRoute = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const id = z.string().uuid();
const coordinates = z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'gharsewa-api' }));
app.get('/api/services', asyncRoute(async (_req, res) => res.json((await pool.query('SELECT * FROM services ORDER BY name_en')).rows)));

app.get('/api/providers', asyncRoute(async (req, res) => {
  const query = coordinates.extend({ radiusKm: z.coerce.number().positive().max(100).default(5), category: z.string().optional() }).parse(req.query);
  const values = [query.latitude, query.longitude, query.radiusKm, query.category ?? null];
  const result = await pool.query(`SELECT p.id, u.name, u.phone, u.latitude, u.longitude, p.category, p.hourly_rate,
    p.bio, p.is_verified, p.rating, (6371 * acos(least(1, cos(radians($1)) * cos(radians(u.latitude))
    * cos(radians(u.longitude) - radians($2)) + sin(radians($1)) * sin(radians(u.latitude))))) AS distance_km
    FROM providers p JOIN users u ON u.id = p.user_id
    WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL AND ($4::text IS NULL OR p.category = $4)
    AND (6371 * acos(least(1, cos(radians($1)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians($2))
    + sin(radians($1)) * sin(radians(u.latitude))))) <= $3 ORDER BY distance_km, p.rating DESC`, values);
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

app.post('/api/bookings', asyncRoute(async (req, res) => {
  const body = z.object({ takerId: id, providerId: id, totalPrice: z.number().nonnegative(), taskDescription: z.string().min(5), scheduledAt: z.string().datetime() }).parse(req.body);
  const result = await pool.query(`INSERT INTO bookings (taker_id, provider_id, total_price, task_description, scheduled_at)
    VALUES ($1,$2,$3,$4,$5) RETURNING *`, [body.takerId, body.providerId, body.totalPrice, body.taskDescription, body.scheduledAt]);
  res.status(201).json(result.rows[0]);
}));
app.get('/api/bookings/:id/messages', asyncRoute(async (req, res) => {
  const bookingId = id.parse(req.params.id);
  res.json((await pool.query('SELECT * FROM messages WHERE booking_id=$1 ORDER BY created_at', [bookingId])).rows);
}));
app.post('/api/bookings/:id/messages', asyncRoute(async (req, res) => {
  const bookingId = id.parse(req.params.id);
  const body = z.object({ senderId: id, receiverId: id, messageText: z.string().trim().min(1).max(2000), quoteAmount: z.number().nonnegative().optional() }).parse(req.body);
  const result = await pool.query(`INSERT INTO messages (sender_id, receiver_id, booking_id, message_text, quote_amount)
    VALUES ($1,$2,$3,$4,$5) RETURNING *`, [body.senderId, body.receiverId, bookingId, body.messageText, body.quoteAmount ?? null]);
  res.status(201).json(result.rows[0]);
}));
app.get('/api/admin/metrics', asyncRoute(async (_req, res) => {
  const result = await pool.query(`SELECT (SELECT count(*) FROM users WHERE role='taker') AS takers,
    (SELECT count(*) FROM providers) AS providers, (SELECT count(*) FROM providers WHERE is_verified) AS verified_providers,
    (SELECT count(*) FROM bookings) AS bookings, (SELECT coalesce(sum(total_price),0) FROM bookings WHERE status='completed') AS revenue`);
  res.json(result.rows[0]);
}));
app.patch('/api/admin/providers/:id/verify', asyncRoute(async (req, res) => {
  const providerId = id.parse(req.params.id);
  const verified = z.object({ verified: z.boolean() }).parse(req.body).verified;
  const result = await pool.query('UPDATE providers SET is_verified=$1 WHERE id=$2 RETURNING *', [verified, providerId]);
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
