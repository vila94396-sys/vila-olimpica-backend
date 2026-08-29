import { Router } from 'express';
import { listPublicNews } from '../controllers/newsController';

const router = Router();

router.get('/', listPublicNews);

export default router;
