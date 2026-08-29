import { Router } from 'express';
import {
  listApprovedServices,
  listMyServices,
  createService,
  updateService,
  deleteService,
  uploadMarketplaceImage,
} from '../controllers/marketplaceController';
import { authenticateToken } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';

const router = Router();

// Public listing
router.get('/', listApprovedServices);

// Create service (can be guest or logged in user)
router.post('/', (req, res, next) => {
  // Optional auth: if token is present, decode it
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authenticateToken(req, res, () => createService(req, res));
  }
  return createService(req, res);
});

// Upload image
router.post('/upload', uploadImage.single('image'), uploadMarketplaceImage);

// Authenticated user routes
router.get('/my', authenticateToken, listMyServices);
router.put('/:id', authenticateToken, updateService);
router.delete('/:id', authenticateToken, deleteService);

export default router;
