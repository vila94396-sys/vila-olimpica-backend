import { Router } from 'express';
import {
  listAreas,
  listReservations,
  listMyReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation,
} from '../controllers/reservationsController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public / Authenticated areas
router.get('/areas', listAreas);

// Authenticated user routes
router.get('/my', authenticateToken, listMyReservations);
router.post('/', authenticateToken, createReservation);
router.delete('/:id', authenticateToken, deleteReservation);

// Admin routes
router.get('/', authenticateToken, requireAdmin, listReservations);
// Status update (admin or resident cancelling own reservation)
router.put('/:id/status', authenticateToken, updateReservationStatus);
router.patch('/:id/status', authenticateToken, updateReservationStatus);

export default router;
