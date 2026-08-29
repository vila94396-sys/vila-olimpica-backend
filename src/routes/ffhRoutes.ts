import { Router } from 'express';
import {
  listUnidades,
  createUnidade,
  updateUnidade,
  deleteUnidade,
  listFeesByYear,
  listAvailableYears,
  generateFees,
  payFee,
  updateFeeStatus,
  cascadePayment,
} from '../controllers/ffhController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/unidades', listUnidades);
router.post('/unidades', createUnidade);
router.put('/unidades/:id', updateUnidade);
router.delete('/unidades/:id', deleteUnidade);
router.post('/unidades/:id/cascade-payment', cascadePayment);

router.get('/fees', listFeesByYear);
router.get('/fees/years', listAvailableYears);
router.post('/fees/generate', generateFees);
router.post('/fees/:id/payment', payFee);
router.put('/fees/:id/status', updateFeeStatus);

export default router;
