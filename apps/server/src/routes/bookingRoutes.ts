import { Router, type RequestHandler } from 'express';
import { createBooking, createBookingMessage, listBookingMessages } from '../controllers/bookingController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();
const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post('/', authMiddleware, requireRole('taker'), asyncHandler(createBooking));
router.get('/:id/messages', authMiddleware, asyncHandler(listBookingMessages));
router.post('/:id/messages', authMiddleware, asyncHandler(createBookingMessage));

export default router;
