import { Router } from 'express';
import { updateProviderVerification } from '../controllers/authController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.patch(
  '/providers/:id/verification',
  authMiddleware,
  requireRole('admin'),
  updateProviderVerification
);

export default router;
