import { Router } from 'express';
import { listImages } from '../controllers/aboutGalleryController';

const router = Router();

router.get('/', listImages);

export default router;
