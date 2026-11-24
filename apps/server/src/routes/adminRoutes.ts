import { Router } from 'express';
import { listUsersForAdmin, updateProviderVerification } from '../controllers/authController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/users', authMiddleware, requireRole('admin'), listUsersForAdmin);

router.patch(
  '/providers/:id/verification',
  authMiddleware,
  requireRole('admin'),
  updateProviderVerification
);

export default router;
