import { Request, Response } from 'express';
import { TaskModel } from '../models/task.model';
import { ProfileModel } from '../models/profile.model';
import { NotificationModel } from '../models/badge.model';

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, assigned_to_id, points_reward = 0, due_date } = req.body;
    if (!title || !assigned_to_id || !due_date) {
      return res.status(400).json({ error: 'title, assigned_to_id and due_date are required' });
    }

    const employee = await ProfileModel.findByIdInCompany(assigned_to_id, req.user!.companyId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found in your company' });
    }

    const task = await TaskModel.create({
      title,
      description,
      assignedToId: assigned_to_id,
      assignedById: req.user!.id,
      companyId: req.user!.companyId,
      pointsReward: Number(points_reward),
      dueDate: due_date,
    });

    await NotificationModel.create({
      profileId: assigned_to_id,
      companyId: req.user!.companyId,
      title: 'New Task Assigned',
      message: `You have been assigned: "${title}". Due: ${new Date(due_date).toDateString()}.`,
    });

    return res.status(201).json(task);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMyTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await TaskModel.findByAssignee(req.user!.id, req.user!.companyId);
    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await TaskModel.findAllByCompany(req.user!.companyId);
    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['IN_PROGRESS', 'DONE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be IN_PROGRESS or DONE' });
    }

    const task = await TaskModel.findById(req.params.id, req.user!.companyId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (task.status === 'DONE') {
      return res.status(400).json({ error: 'Task already completed' });
    }
    if (task.assigned_to_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const completedAt = status === 'DONE' ? new Date().toISOString() : undefined;
    await TaskModel.updateStatus(req.params.id, status, completedAt);

    return res.json({ message: `Task marked as ${status}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
