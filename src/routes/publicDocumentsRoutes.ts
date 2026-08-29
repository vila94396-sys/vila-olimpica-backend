import { Router } from 'express';
import { listPublicDocuments, trackDownload } from '../controllers/documentsController';

const router = Router();

router.get('/', listPublicDocuments);
router.post('/:id/download', trackDownload);

export default router;
