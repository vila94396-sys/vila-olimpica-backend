import { Router } from 'express';
import { listPublicNotices } from '../controllers/noticesController';

const router = Router();

router.get('/', listPublicNotices);

export default router;
