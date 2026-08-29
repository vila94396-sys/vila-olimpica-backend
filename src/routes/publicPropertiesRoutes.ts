import { Router } from 'express';
import {
  listPublicProperties,
  getPublicProperty,
  listMyProperties,
  updateMyProperty,
  deleteMyProperty,
} from '../controllers/propertiesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/my', authenticateToken, listMyProperties);
router.put('/:id', authenticateToken, updateMyProperty);
router.delete('/:id', authenticateToken, deleteMyProperty);

router.get('/', listPublicProperties);
router.get('/:id', getPublicProperty);

export default router;

