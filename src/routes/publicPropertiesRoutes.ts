import { Router } from 'express';
import { listPublicProperties, getPublicProperty } from '../controllers/propertiesController';

const router = Router();

router.get('/', listPublicProperties);
router.get('/:id', getPublicProperty);

export default router;
