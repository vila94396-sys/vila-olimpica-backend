import { Router } from 'express';
import {
  listResidents,
  deactivateResident,
  reactivateResident,
  deleteResident,
  unlockResident,
  listMyFees,
  getMyUnidade,
  uploadMyFeeReceipt,
  submitMyFeeReceipt,
} from '../controllers/residentsController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/me/fees', requireAuth, listMyFees);
router.get('/me/unidade', requireAuth, getMyUnidade);
router.post('/me/fees/:feeId/receipt', requireAuth, upload.single('receipt'), uploadMyFeeReceipt);
router.post('/me/fees/:feeId/submit-receipt', requireAuth, submitMyFeeReceipt);

router.use(requireAuth, requireAdmin);

router.get('/', listResidents);
router.post('/:id/deactivate', deactivateResident);
router.post('/:id/reactivate', reactivateResident);
router.post('/:id/unlock', unlockResident);
router.delete('/:id', deleteResident);

export default router;
