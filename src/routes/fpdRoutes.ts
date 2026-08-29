import { Router } from 'express';
import {
  listUnidades,
  updateUnidade,
  listFeesByYear,
  listAvailableYears,
  generateFees,
  payFee,
  updateFeeStatus,
  cascadePayment,
} from '../controllers/fpdController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/unidades', listUnidades);
router.put('/unidades/:id', updateUnidade);
router.post('/unidades/:id/cascade-payment', cascadePayment);

router.get('/fees', listFeesByYear);
router.get('/fees/years', listAvailableYears);
router.post('/fees/generate', generateFees);
router.post('/fees/:id/payment', payFee);
router.put('/fees/:id/status', updateFeeStatus);

export default router;
