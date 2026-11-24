import { Router } from 'express';
import {
  login,
  me,
  register,
  verifyEmail,
  verifyOtp
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export default router;