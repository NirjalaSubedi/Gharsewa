import type { Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import type { AuthenticatedRequest } from '../types/index.js';

const bookingId = z.string().uuid();

const createBookingSchema = z.object({
  providerId: bookingId,
  totalPrice: z.number().nonnegative(),
  taskDescription: z.string().trim().min(5).max(2000),
  scheduledAt: z.string().datetime()
});

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  const body = createBookingSchema.parse(req.body);
  const result = await pool.query(
    `INSERT INTO bookings (taker_id, provider_id, total_price, task_description, scheduled_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user!.id, body.providerId, body.totalPrice, body.taskDescription, body.scheduledAt]
  );
  res.status(201).json(result.rows[0]);
}

export async function listBookingMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const booking = bookingId.parse(req.params.id);
  const result = await pool.query(
    `SELECT m.*
     FROM messages m
     JOIN bookings b ON b.id = m.booking_id
     WHERE m.booking_id = $1 AND (b.taker_id = $2 OR b.provider_id = $2)
     ORDER BY m.created_at`,
    [booking, req.user!.id]
  );
  res.json(result.rows);
}

const createMessageSchema = z.object({
  receiverId: z.number().int().positive(),
  messageText: z.string().trim().min(1).max(2000),
  quoteAmount: z.number().nonnegative().optional()
});

export async function createBookingMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const booking = bookingId.parse(req.params.id);
  const body = createMessageSchema.parse(req.body);
  const bookingResult = await pool.query(
    `SELECT taker_id, provider_id
     FROM bookings
     WHERE id = $1 AND (taker_id = $2 OR provider_id = $2)`,
    [booking, req.user!.id]
  );
  if (!bookingResult.rowCount) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const participantIds = [bookingResult.rows[0].taker_id, bookingResult.rows[0].provider_id];
  if (!participantIds.includes(body.receiverId) || body.receiverId === req.user!.id) {
    res.status(400).json({ error: 'Receiver must be another booking participant' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, booking_id, message_text, quote_amount)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user!.id, body.receiverId, booking, body.messageText, body.quoteAmount ?? null]
  );
  res.status(201).json(result.rows[0]);
}
