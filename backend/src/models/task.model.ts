import supabase, { supabaseDb } from '../config/supabase';

export const TaskModel = {
  create: async (payload: {
    title: string;
    description?: string;
    assignedToId: string;
    assignedById: string;
    companyId: string;
    pointsReward: number;
    dueDate: string;
    jiraIssueId?: string;
    jiraIssueKey?: string;
    jiraIssueUrl?: string;
  }) => {
    const { data, error } = await supabaseDb
      .from('tasks')
      .insert({
        title: payload.title,
        description: payload.description,
        assigned_to_id: payload.assignedToId,
        assigned_by_id: payload.assignedById,
        company_id: payload.companyId,
        points_reward: payload.pointsReward,
        due_date: payload.dueDate,
        status: 'TODO',
        jira_issue_id: payload.jiraIssueId || null,
        jira_issue_key: payload.jiraIssueKey || null,
        jira_issue_url: payload.jiraIssueUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findByAssignee: async (profileId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('assigned_to_id', profileId)
      .eq('company_id', companyId)
      .order('due_date');

    if (error) throw error;
    return data;
  },

  findAllByCompany: async (companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignedTo:profiles!tasks_assigned_to_id_fkey(id, name, email, avatar_url), assignedBy:profiles!tasks_assigned_by_id_fkey(id, name, email)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  findById: async (id: string, companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  findByJiraIssueKey: async (issueKey: string, companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('jira_issue_key', issueKey)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  updateStatus: async (id: string, status: string, completedAt?: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status, completed_at: completedAt })
      .eq('id', id);

    if (error) throw error;
  },

  upsertJiraIssues: async (
    companyId: string,
    issues: Array<{
      jira_issue_id: string;
      jira_issue_key: string;
      title: string;
      description: string;
      due_date: string | null;
      status: string;
      jira_updated_at: string;
      assigned_to_id: string;
    }>,
  ) => {
    if (issues.length === 0) return [];

    const { data, error } = await supabaseDb
      .from('tasks')
      .upsert(
        issues.map(issue => ({
          jira_issue_id: issue.jira_issue_id,
          jira_issue_key: issue.jira_issue_key,
          title: issue.title,
          description: issue.description,
          due_date: issue.due_date,
          status: issue.status,
          jira_updated_at: issue.jira_updated_at,
          assigned_to_id: issue.assigned_to_id,
          company_id: companyId,
          completed_at: issue.status === 'DONE' ? issue.jira_updated_at : null,
        })),
        { onConflict: 'jira_issue_key' },
      )
      .select();

    if (error) throw error;
    return data;
  },

  getSyncState: async (companyId: string) => {
    const { data, error } = await supabaseDb
      .from('task_sync_state')
      .select('last_jira_sync_at, last_jira_sync_error')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  setSyncState: async (companyId: string, errorMessage?: string) => {
    const now = new Date().toISOString();
    const { error } = await supabaseDb
      .from('task_sync_state')
      .upsert({
        company_id: companyId,
        last_jira_sync_at: errorMessage ? undefined : now,
        last_jira_sync_error: errorMessage || null,
        updated_at: now,
      });

    if (error) throw error;
  },
};
