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
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Access Requests routes (admin only)
router.post('/request-access', requestAccess);
router.get('/access-requests', requireAuth, requireAdmin, getAccessRequests);
router.post('/access-requests/:id/approve', requireAuth, requireAdmin, approveAccess);
router.post('/access-requests/:id/reject', requireAuth, requireAdmin, rejectAccess);
router.delete('/access-requests/:id', requireAuth, requireAdmin, deleteAccessRequest);

export default router;
