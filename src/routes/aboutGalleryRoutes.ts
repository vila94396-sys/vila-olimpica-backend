import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { listImages, createImage, updateImage, deleteImage, uploadImage } from '../controllers/aboutGalleryController';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listImages);
router.post('/', createImage);
router.post('/upload', upload.single('file'), uploadImage);
router.put('/:id', updateImage);
router.delete('/:id', deleteImage);

export default router;
