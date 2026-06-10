import { Router } from 'express';
import { createTask, getMyTasks, getAllTasks, updateTaskStatus } from '../controllers/task.controller';
import { authenticate, requireEmployer } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// POST  /api/tasks             — employer creates and assigns a task
router.post('/', requireEmployer, createTask);

// GET   /api/tasks/my          — employee views their assigned tasks
router.get('/my', getMyTasks);

// GET   /api/tasks             — employer views all tasks in company
router.get('/', requireEmployer, getAllTasks);

// PATCH /api/tasks/:id/status  — employee updates task status
router.patch('/:id/status', updateTaskStatus);

export default router;
