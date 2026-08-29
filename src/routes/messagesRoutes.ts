import { Router } from 'express';
import {
  getPeerAdmin,
  getThread,
  sendMessage,
  uploadAttachment,
  listConversations,
} from '../controllers/messagesController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { uploadDocument } from '../middleware/upload';

const router = Router();

router.use(requireAuth);

router.get('/peer-admin', getPeerAdmin);
router.get('/thread/:peerId', getThread);
router.post('/', sendMessage);
router.post('/upload', uploadDocument.single('file'), uploadAttachment);
router.get('/admin/conversations', requireAdmin, listConversations);

export default router;
