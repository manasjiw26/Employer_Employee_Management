import { Request, Response } from 'express';
import { LeaveModel } from '../models/leave.model';
import { NotificationModel } from '../models/badge.model';

export const applyLeave = async (req: Request, res: Response) => {
  try {
    const { type, start_date, end_date, reason } = req.body;
    if (!type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'type, start_date, end_date and reason are required' });
    }

    const leave = await LeaveModel.create({
      profileId: req.user!.id,
      companyId: req.user!.companyId,
      type,
      startDate: start_date,
      endDate: end_date,
      reason,
    });

    return res.status(201).json(leave);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await LeaveModel.findByProfile(req.user!.id, req.user!.companyId);
    return res.json(leaves);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await LeaveModel.findPendingByCompany(req.user!.companyId);
    return res.json(leaves);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { status, manager_comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const leave = await LeaveModel.findById(req.params.id, req.user!.companyId);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    await LeaveModel.updateStatus(req.params.id, req.user!.companyId, status, manager_comment);
    await NotificationModel.create({
      profileId: leave.profile_id,
      companyId: req.user!.companyId,
      title: `Leave ${status}`,
      message: `Your ${leave.type} leave request has been ${status.toLowerCase()}.${manager_comment ? ` Note: ${manager_comment}` : ''}`,
    });

    return res.json({ message: `Leave ${status.toLowerCase()} successfully` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
