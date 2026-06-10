import { Router } from 'express';
import { applyLeave, getCompanyLeaves, getMyLeaves, getPendingLeaves, updateLeaveStatus } from '../controllers/leave.controller';
import { authenticate, requireEmployer } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// POST /api/leaves            — employee applies for leave
router.post('/', applyLeave);

// GET  /api/leaves/my         — employee views their own leave history
router.get('/my', getMyLeaves);

// GET  /api/leaves/pending    — employer views all pending leaves
router.get('/pending', requireEmployer, getPendingLeaves);
router.get('/company', requireEmployer, getCompanyLeaves);

// PATCH /api/leaves/:id       — employer approves or rejects a leave
router.patch('/:id', requireEmployer, updateLeaveStatus);

export default router;
