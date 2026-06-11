import { Request, Response } from 'express';
import { TaskModel } from '../models/task.model';
import { ProfileModel } from '../models/profile.model';
import { NotificationModel } from '../models/badge.model';
import { JiraApiError, JiraService } from '../services/jira.service';

const JIRA_SYNC_TTL_MS = Number(process.env.JIRA_SYNC_TTL_MS) || 60_000;
const companySyncs = new Map<string, Promise<{ synced: boolean; reason?: string; imported?: number; skipped?: number }>>();

const synchronizeCompanyJiraInternal = async (companyId: string, force = false) => {
  const syncState = await TaskModel.getSyncState(companyId);
  const lastSyncAt = syncState?.last_jira_sync_at
    ? new Date(syncState.last_jira_sync_at).getTime()
    : 0;

  if (!force && Date.now() - lastSyncAt < JIRA_SYNC_TTL_MS) {
    return { synced: false, reason: 'fresh' };
  }

  try {
    const jiraIssues = await JiraService.findProjectIssues();
    const accountIds = Array.from(new Set(
      jiraIssues
        .map(issue => issue.jira_assignee_account_id)
        .filter((accountId): accountId is string => Boolean(accountId)),
    ));
    const profiles = await ProfileModel.findByJiraAccountIds(accountIds, companyId);
    const profileByJiraId = new Map(profiles.map(profile => [profile.jira_account_id, profile.id]));

    const mappedIssues = jiraIssues.flatMap(issue => {
      const assignedToId = issue.jira_assignee_account_id
        ? profileByJiraId.get(issue.jira_assignee_account_id)
        : undefined;
      return assignedToId ? [{ ...issue, assigned_to_id: assignedToId }] : [];
    });

    await TaskModel.upsertJiraIssues(companyId, mappedIssues);
    await TaskModel.setSyncState(companyId);
    return { synced: true, imported: mappedIssues.length, skipped: jiraIssues.length - mappedIssues.length };
  } catch (err: any) {
    await TaskModel.setSyncState(companyId, err.message);
    throw err;
  }
};

const synchronizeCompanyJira = async (companyId: string, force = false) => {
  const activeSync = companySyncs.get(companyId);
  if (activeSync) return activeSync;

  const sync = synchronizeCompanyJiraInternal(companyId, force).finally(() => {
    companySyncs.delete(companyId);
  });
  companySyncs.set(companyId, sync);
  return sync;
};

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
    if (employee.role !== 'EMPLOYEE') {
      return res.status(400).json({ error: 'Tasks can only be assigned to employees' });
    }
    if (Number.isNaN(new Date(due_date).getTime())) {
      return res.status(400).json({ error: 'due_date must be a valid date' });
    }

    let jiraIssue: { id: string; key: string; browseUrl: string } | null = null;
    let syncWarning: string | undefined;

    const jiraAccountId = employee.jira_account_id as string | undefined;
    if (jiraAccountId) {
      try {
        jiraIssue = await JiraService.createIssue({
          summary: title,
          description,
          assigneeAccountId: jiraAccountId,
          dueDate: due_date,
        });
      } catch (err: any) {
        syncWarning = `Saved in Supabase only. Jira assignment failed: ${err.message}`;
        console.warn(syncWarning);
      }
    } else {
      syncWarning = 'Saved in Supabase only because this employee has no Jira account ID.';
    }

    const task = await TaskModel.create({
      title,
      description,
      assignedToId: assigned_to_id,
      assignedById: req.user!.id,
      companyId: req.user!.companyId,
      pointsReward: Number(points_reward),
      dueDate: due_date,
      jiraIssueId: jiraIssue?.id,
      jiraIssueKey: jiraIssue?.key,
      jiraIssueUrl: jiraIssue?.browseUrl,
    });

    await NotificationModel.create({
      profileId: assigned_to_id,
      companyId: req.user!.companyId,
      title: 'New Task Assigned',
      message: `You have been assigned: "${title}". Due: ${new Date(due_date).toDateString()}.`,
    });

    return res.status(201).json({
      ...task,
      assignedTo: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        avatar_url: employee.avatar_url,
      },
      sync_warning: syncWarning,
    });
  } catch (err: any) {
    return res.status(err instanceof JiraApiError ? err.status : 500).json({ error: err.message });
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

export const syncTasks = async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const result = await synchronizeCompanyJira(req.user!.companyId, force);
    const tasks = req.user!.role === 'EMPLOYER'
      ? await TaskModel.findAllByCompany(req.user!.companyId)
      : await TaskModel.findByAssignee(req.user!.id, req.user!.companyId);

    return res.json({ ...result, tasks });
  } catch (err: any) {
    const tasks = req.user!.role === 'EMPLOYER'
      ? await TaskModel.findAllByCompany(req.user!.companyId)
      : await TaskModel.findByAssignee(req.user!.id, req.user!.companyId);
    return res.json({ synced: false, warning: err.message, tasks });
  }
};

export const getAvailableTransitions = async (req: Request, res: Response) => {
  try {
    const employee = await ProfileModel.findByIdInCompany(req.user!.id, req.user!.companyId);
    if (!employee?.jira_account_id) {
      return res.status(409).json({ error: 'Your account is not mapped to Jira.' });
    }

    const jiraAssigneeAccountId = await JiraService.getIssueAssigneeAccountId(req.params.id);
    if (jiraAssigneeAccountId !== employee.jira_account_id) {
      return res.status(403).json({ error: 'This Jira issue is not assigned to you' });
    }

    const transitions = await JiraService.getTransitions(req.params.id);
    return res.json(transitions);
  } catch (err: any) {
    return res.status(err instanceof JiraApiError ? err.status : 500).json({ error: err.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['IN_PROGRESS', 'DONE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be IN_PROGRESS or DONE' });
    }

    const task = await TaskModel.findByJiraIssueKey(req.params.id, req.user!.companyId)
      || await TaskModel.findById(req.params.id, req.user!.companyId);
    if (task?.status === 'DONE') {
      return res.status(400).json({ error: 'Task already completed' });
    }
    if (task && task.assigned_to_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const issueKey = task?.jira_issue_key || req.params.id;
    let syncWarning: string | undefined;

    if (task?.jira_issue_key) {
      const employee = await ProfileModel.findByIdInCompany(req.user!.id, req.user!.companyId);
      if (!employee?.jira_account_id) {
        return res.status(409).json({ error: 'Your account is not mapped to Jira.' });
      }

      const jiraAssigneeAccountId = await JiraService.getIssueAssigneeAccountId(issueKey);
      if (jiraAssigneeAccountId !== employee.jira_account_id) {
        return res.status(403).json({ error: 'This Jira issue is not assigned to you' });
      }

      await JiraService.transitionIssue(issueKey, status);
    } else {
      syncWarning = 'Updated in Supabase only because this task is not linked to a Jira issue.';
    }

    const completedAt = status === 'DONE' ? new Date().toISOString() : undefined;
    if (task) {
      await TaskModel.updateStatus(task.id, status, completedAt);
    }

    return res.json({
      message: `Task marked as ${status}`,
      task: task ? { ...task, status, completed_at: completedAt || null } : null,
      sync_warning: syncWarning,
    });
  } catch (err: any) {
    return res.status(err instanceof JiraApiError ? err.status : 500).json({ error: err.message });
  }
};
