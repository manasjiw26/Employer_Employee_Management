import { Request, Response } from 'express';
import { ProfileModel } from '../models/profile.model';
import { JiraApiError, JiraService } from '../services/jira.service';

export const getDirectory = async (req: Request, res: Response) => {
  try {
    const employees = await ProfileModel.findAllByCompany(req.user!.companyId);
    return res.json(employees);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await ProfileModel.findByIdInCompany(req.params.id, req.user!.companyId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    return res.json(employee);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!['EMPLOYEE', 'EMPLOYER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be EMPLOYEE or EMPLOYER' });
    }
    await ProfileModel.updateRole(req.params.id, req.user!.companyId, role);
    return res.json({ message: 'Role updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const removeEmployee = async (req: Request, res: Response) => {
  try {
    await ProfileModel.delete(req.params.id, req.user!.companyId);
    return res.json({ message: 'Employee removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const mapEmployeeToJira = async (req: Request, res: Response) => {
  try {
    const employee = await ProfileModel.findByIdInCompany(req.params.id, req.user!.companyId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const { accountId, displayName } = req.body;
    if (accountId) {
      if (typeof accountId !== 'string' || accountId.trim().length < 8) {
        return res.status(400).json({ error: 'A valid Jira accountId is required' });
      }

      const mappedEmployee = await ProfileModel.updateJiraMapping(employee.id, req.user!.companyId, {
        accountId: accountId.trim(),
        displayName: typeof displayName === 'string' && displayName.trim()
          ? displayName.trim()
          : employee.name,
      });

      return res.json(mappedEmployee);
    }

    const jiraUser = await JiraService.findUserByEmail(employee.email);
    const mappedEmployee = await ProfileModel.updateJiraMapping(employee.id, req.user!.companyId, {
      accountId: jiraUser.accountId,
      displayName: jiraUser.displayName,
    });

    return res.json(mappedEmployee);
  } catch (err: any) {
    return res.status(err instanceof JiraApiError ? err.status : 500).json({ error: err.message });
  }
};
