import { Router } from 'express';
import { listUsers, updateProviderVerification } from '../controllers/authController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/users', authMiddleware, listUsers);

router.patch(
  '/providers/:id/verification',
  authMiddleware,
  requireRole('admin'),
  updateProviderVerification
);

export default router;
