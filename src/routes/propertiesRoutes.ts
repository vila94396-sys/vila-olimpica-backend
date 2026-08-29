import { Router } from 'express';
import {
  listProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyImage,
} from '../controllers/propertiesController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listProperties);
router.post('/', createProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);
router.post('/upload', upload.single('image'), uploadPropertyImage);

export default router;
