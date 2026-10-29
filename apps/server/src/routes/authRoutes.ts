import { Router, type RequestHandler } from 'express';
import { login, register } from '../controllers/authController.js';

const router = Router();
const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

export default router;
