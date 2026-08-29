import { Router } from 'express';
import {
  listNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from '../controllers/noticesController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listNotices);
router.post('/', createNotice);
router.put('/:id', updateNotice);
router.delete('/:id', deleteNotice);

export default router;
