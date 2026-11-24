import { Router, type RequestHandler } from 'express';
import { login, me, register, verifyEmail, verifyOtp } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post('/register', asyncHandler(register));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/verify-otp', asyncHandler(verifyOtp));
router.post('/login', asyncHandler(login));
router.get('/me', authMiddleware, asyncHandler(me));

export default router;
