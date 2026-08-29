import { Router } from 'express';
import {
  listFees,
  createFee,
  updateFee,
  deleteFee,
  listPayments,
  payMulti,
  getDashboard,
} from '../controllers/institutionController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/:institution/fees', listFees);
router.post('/:institution/fees', createFee);
router.put('/fees/:id', updateFee);
router.delete('/fees/:id', deleteFee);
router.get('/fees/:id/payments', listPayments);
router.post('/fees/pay-multi', payMulti);

export default router;
