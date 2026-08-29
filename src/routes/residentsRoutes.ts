import { Router } from 'express';
import {
  listResidents,
  deactivateResident,
  reactivateResident,
  deleteResident,
  unlockResident,
} from '../controllers/residentsController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listResidents);
router.post('/:id/deactivate', deactivateResident);
router.post('/:id/reactivate', reactivateResident);
router.post('/:id/unlock', unlockResident);
router.delete('/:id', deleteResident);

export default router;
