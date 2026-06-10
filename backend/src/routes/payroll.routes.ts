import { Router } from 'express';
import { createPayroll, markPaid, getMyPayslips, getAllPayrolls, getPayrollHistory, exportPayslip } from '../controllers/payroll.controller';
import { authenticate, requireEmployer } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// POST  /api/payroll           — employer creates payroll record
router.post('/', requireEmployer, createPayroll);

// PATCH /api/payroll/:id/pay   — employer marks payroll as PAID
router.patch('/:id/pay', requireEmployer, markPaid);

// GET   /api/payroll/my        — employee views their own payslips
router.get('/my', getMyPayslips);

// GET   /api/payroll/history   — filtered payroll history (month/year/profileId)
router.get('/history', getPayrollHistory);

// GET   /api/payroll/:id/export — export payslip (csv)
router.get('/:id/export', exportPayslip);

// GET   /api/payroll           — employer views all payrolls in company
router.get('/', requireEmployer, getAllPayrolls);

export default router;
