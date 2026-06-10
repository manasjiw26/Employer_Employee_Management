import { Request, Response } from 'express';
import { AnnouncementModel, NotificationModel } from '../models/badge.model';

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const announcement = await AnnouncementModel.create({
      companyId: req.user!.companyId,
      title,
      content,
      createdById: req.user!.id,
    });

    return res.status(201).json(announcement);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const announcements = await AnnouncementModel.findByCompany(req.user!.companyId);
    return res.json(announcements);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await NotificationModel.findByProfile(req.user!.id, req.user!.companyId);
    return res.json(notifications);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    await NotificationModel.markRead(req.params.id, req.user!.id);
    return res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    await NotificationModel.markAllRead(req.user!.id, req.user!.companyId);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
