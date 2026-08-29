import { Router } from 'express';
import {
  listAllServices,
  updateServiceStatus,
  deleteService,
} from '../controllers/marketplaceController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/', listAllServices);
router.put('/:id/status', updateServiceStatus);
router.patch('/:id/status', updateServiceStatus);
router.delete('/:id', deleteService);

export default router;
