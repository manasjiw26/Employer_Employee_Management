import { Request, Response } from 'express';
import { PayrollModel } from '../models/payroll.model';
import { ProfileModel } from '../models/profile.model';
import { NotificationModel } from '../models/badge.model';

export const createPayroll = async (req: Request, res: Response) => {
  try {
    const { profile_id, month, year, base_salary, bonuses = 0, deductions = 0 } = req.body;
    if (!profile_id || !month || !year || !base_salary) {
      return res.status(400).json({ error: 'profile_id, month, year and base_salary are required' });
    }

    const employee = await ProfileModel.findByIdInCompany(profile_id, req.user!.companyId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found in your company' });
    }

    const netSalary = Number(base_salary) + Number(bonuses) - Number(deductions);
    const payroll = await PayrollModel.create({
      profileId: profile_id,
      companyId: req.user!.companyId,
      month: Number(month),
      year: Number(year),
      baseSalary: Number(base_salary),
      bonuses: Number(bonuses),
      deductions: Number(deductions),
      netSalary,
    });

    return res.status(201).json(payroll);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const markPaid = async (req: Request, res: Response) => {
  try {
    const payroll = await PayrollModel.findById(req.params.id, req.user!.companyId);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    await PayrollModel.markPaid(req.params.id, req.user!.companyId);
    await NotificationModel.create({
      profileId: payroll.profile_id,
      companyId: req.user!.companyId,
      title: 'Salary Credited',
      message: `Your salary for ${payroll.month}/${payroll.year} of INR ${payroll.net_salary} has been processed.`,
    });

    return res.json({ message: 'Payroll marked as paid' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMyPayslips = async (req: Request, res: Response) => {
  try {
    const payslips = await PayrollModel.findByProfile(req.user!.id, req.user!.companyId);
    return res.json(payslips);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPayrollHistory = async (req: Request, res: Response) => {
  try {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const profileId = req.query.profileId as string | undefined;

    // If the requester is not an employer, force profileId to the requester
    const effectiveProfileId = req.user!.role === 'EMPLOYER' ? profileId : req.user!.id;

    const payrolls = await PayrollModel.findWithFilter({
      companyId: req.user!.companyId,
      profileId: effectiveProfileId,
      month,
      year,
    });

    return res.json(payrolls);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const exportPayslip = async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const payroll = await PayrollModel.findOneWithProfile(req.params.id, req.user!.companyId);
    if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

    const isOwner = payroll.profile?.id === req.user!.id;
    const isEmployer = req.user!.role === 'EMPLOYER';
    if (!isOwner && !isEmployer) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (format === 'csv') {
      const headers = ['Employee Name', 'Employee Email', 'Month', 'Year', 'Base Salary', 'Bonuses', 'Deductions', 'Net Salary', 'Status'];
      const row = [
        payroll.profile?.name || '',
        payroll.profile?.email || '',
        String(payroll.month),
        String(payroll.year),
        String(payroll.base_salary),
        String(payroll.bonuses),
        String(payroll.deductions),
        String(payroll.net_salary),
        payroll.status,
      ];

      const csv = `${headers.join(',')}\n${row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')}\n`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payslip_${payroll.id}.csv"`);
      return res.send(csv);
    }

    return res.status(400).json({ error: 'Unsupported export format' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllPayrolls = async (req: Request, res: Response) => {
  try {
    const payrolls = await PayrollModel.findAllByCompany(req.user!.companyId);
    return res.json(payrolls);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
