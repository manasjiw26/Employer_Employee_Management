import { Router } from 'express';
import { authenticate, requireEmployer } from '../middleware/auth.middleware';
import { getMyBalances, setBalances } from '../controllers/balances.controller';

const router = Router();

router.use(authenticate);

// GET /api/balances/me
router.get('/me', getMyBalances);

// PUT /api/balances/:profileId  (employer only)
router.put('/:profileId', requireEmployer, setBalances);

export default router;
