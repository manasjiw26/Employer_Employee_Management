import { Router } from 'express';
import { createAvatarUploadUrl, getMe, register, signin, signup, updateAvatarUrl, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/register', register);
router.get('/me', authenticate, getMe);
router.post('/me/avatar-upload-url', authenticate, createAvatarUploadUrl);
router.patch('/me/avatar', authenticate, updateAvatarUrl);
router.patch('/me', authenticate, updateProfile);

export default router;
