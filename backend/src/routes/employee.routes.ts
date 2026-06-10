import { Router } from 'express';
import { getDirectory, getEmployee, updateRole, removeEmployee } from '../controllers/employee.controller';
import { authenticate, requireEmployer } from '../middleware/auth.middleware';

const router = Router();

// All routes require auth
router.use(authenticate);

// GET  /api/employees         — list all employees in company
router.get('/', getDirectory);

// GET  /api/employees/:id     — get single employee profile
router.get('/:id', getEmployee);

// PUT  /api/employees/:id/role — employer updates employee role
router.put('/:id/role', requireEmployer, updateRole);

// DELETE /api/employees/:id  — employer removes an employee
router.delete('/:id', requireEmployer, removeEmployee);

export default router;
