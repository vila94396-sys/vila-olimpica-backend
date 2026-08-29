import { Router } from 'express';
import {
  listNews,
  createNews,
  updateNews,
  deleteNews,
  uploadNewsImage,
} from '../controllers/newsController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listNews);
router.post('/', createNews);
router.put('/:id', updateNews);
router.delete('/:id', deleteNews);
router.post('/upload', upload.single('file'), uploadNewsImage);

export default router;
