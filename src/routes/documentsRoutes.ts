import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  listDownloads,
} from '../controllers/documentsController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { uploadDocument } from '../middleware/upload';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listDocuments);
router.post('/', createDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/upload', uploadDocument.single('file'), uploadDocumentFile);
router.get('/downloads', listDownloads);

export default router;
