import { Router } from 'express';
import {
  createAnnouncement, getAnnouncements,
  getNotifications, markRead, markAllRead,
} from '../controllers/misc.controller';
import { authenticate, requireEmployer } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// --- Announcements ---
// POST /api/misc/announcements — employer posts an announcement
router.post('/announcements', requireEmployer, createAnnouncement);

// GET  /api/misc/announcements — everyone reads company announcements
router.get('/announcements', getAnnouncements);

// --- Notifications ---
// GET  /api/misc/notifications         — get my notifications
router.get('/notifications', getNotifications);

// PATCH /api/misc/notifications/:id    — mark one as read
router.patch('/notifications/:id/read', markRead);

// PATCH /api/misc/notifications/read-all — mark all as read
router.patch('/notifications/read-all', markAllRead);

export default router;
