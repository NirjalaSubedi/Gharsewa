import { Router, type RequestHandler } from 'express';
import {
  deleteAccount,
  getAccount,
  listUsers,
  login,
  register,
  updateAccount
} from '../controllers/authController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();
const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', authMiddleware, asyncHandler(getAccount));
router.patch('/me', authMiddleware, asyncHandler(updateAccount));
router.delete('/me', authMiddleware, asyncHandler(deleteAccount));
router.get('/users', authMiddleware, requireRole('admin'), asyncHandler(listUsers));
router.get('/users/:id', authMiddleware, asyncHandler(getAccount));
router.patch('/users/:id', authMiddleware, asyncHandler(updateAccount));
router.delete('/users/:id', authMiddleware, asyncHandler(deleteAccount));

export default router;
