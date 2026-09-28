import { Router } from 'express';
import {
  register,
  login,
  requestAccess,
  getAccessRequests,
  approveAccess,
  rejectAccess,
  deleteAccessRequest
} from '../controllers/authController';
import { authRateLimit, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/register', authRateLimit(5), register);
router.post('/login', authRateLimit(10), login);

// Access Requests routes (admin only)
router.post('/request-access', authRateLimit(5), requestAccess);
router.get('/access-requests', requireAuth, requireAdmin, getAccessRequests);
router.post('/access-requests/:id/approve', requireAuth, requireAdmin, approveAccess);
router.post('/access-requests/:id/reject', requireAuth, requireAdmin, rejectAccess);
router.delete('/access-requests/:id', requireAuth, requireAdmin, deleteAccessRequest);

export default router;
