type JiraUser = {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
};

type JiraTransition = {
  id: string;
  name: string;
  to: {
    name: string;
    statusCategory: {
      key: string;
    };
  };
};

type JiraIssue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: {
      content?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };
    duedate?: string;
    updated: string;
    assignee?: {
      accountId: string;
      displayName: string;
    };
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
  };
};

type JiraBoard = {
  id: number;
  name: string;
};

type JiraSprint = {
  id: number;
  name: string;
  state: string;
};

export class JiraApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

const getConfig = () => {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  const email = process.env.JIRA_USER_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  const projectRoleId = process.env.JIRA_PROJECT_ROLE_ID;
  const issueType = process.env.JIRA_ISSUE_TYPE || 'Task';
  const boardId = process.env.JIRA_BOARD_ID;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    throw new JiraApiError(
      'Jira is not configured. Set JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY.',
      503,
    );
  }

  return { baseUrl, email, apiToken, projectKey, projectRoleId, issueType, boardId };
};

const jiraFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const { baseUrl, email, apiToken } = getConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
      ...options.headers,
    },
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const details = body?.errorMessages?.join(', ') || body?.message || text || response.statusText;
    throw new JiraApiError(`Jira request failed: ${details}`, response.status);
  }

  return body as T;
};

const adfText = (text?: string) => ({
  type: 'doc',
  version: 1,
  content: text
    ? [{ type: 'paragraph', content: [{ type: 'text', text }] }]
    : [{ type: 'paragraph', content: [] }],
});

const descriptionToText = (description?: JiraIssue['fields']['description']) =>
  description?.content
    ?.flatMap(block => block.content || [])
    .map(node => node.text || '')
    .join('\n') || '';

const escapeJqlValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const normalizeStatus = (issue: JiraIssue): 'TODO' | 'IN_PROGRESS' | 'DONE' => {
  const category = issue.fields.status.statusCategory.key;
  if (category === 'done') return 'DONE';
  if (category === 'indeterminate') return 'IN_PROGRESS';
  return 'TODO';
};

const normalizeIssue = (issue: JiraIssue) => ({
  jira_issue_id: issue.id,
  jira_issue_key: issue.key,
  title: issue.fields.summary,
  description: descriptionToText(issue.fields.description),
  due_date: issue.fields.duedate || null,
  status: normalizeStatus(issue),
  jira_status: issue.fields.status.name,
  jira_updated_at: issue.fields.updated,
  jira_assignee_account_id: issue.fields.assignee?.accountId,
  jira_assignee_display_name: issue.fields.assignee?.displayName,
});

export const JiraService = {
  addUserToConfiguredProjectRole: async (accountId: string) => {
    const { projectKey, projectRoleId } = getConfig();
    if (!projectRoleId) {
      return { added: false, reason: 'JIRA_PROJECT_ROLE_ID is not configured' };
    }

    await jiraFetch(`/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${encodeURIComponent(projectRoleId)}`, {
      method: 'POST',
      body: JSON.stringify({ user: [accountId] }),
    });

    return { added: true };
  },

  findUserByEmail: async (email: string) => {
    const users = await jiraFetch<JiraUser[]>(
      `/rest/api/3/user/search?query=${encodeURIComponent(email)}&maxResults=50`,
    );
    const match = users.find(
      user => user.active && user.emailAddress?.toLowerCase() === email.toLowerCase(),
    );

    if (!match) {
      throw new JiraApiError(
        `No active Jira user with visible email "${email}" was found. Check Jira profile privacy and product access.`,
        404,
      );
    }

    return match;
  },

  createIssue: async (payload: {
    summary: string;
    description?: string;
    assigneeAccountId: string;
    dueDate: string;
  }) => {
    const { baseUrl, projectKey, issueType } = getConfig();
    const issue = await jiraFetch<{ id: string; key: string; self: string }>('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: payload.summary,
          description: adfText(payload.description),
          issuetype: { name: issueType },
          assignee: { accountId: payload.assigneeAccountId },
          duedate: payload.dueDate.slice(0, 10),
        },
      }),
    });

    return { ...issue, browseUrl: `${baseUrl}/browse/${issue.key}` };
  },

  addIssueToActiveSprint: async (issueKey: string) => {
    const { projectKey, boardId: configuredBoardId } = getConfig();
    let boardId = configuredBoardId ? Number(configuredBoardId) : undefined;

    if (configuredBoardId && Number.isNaN(boardId)) {
      throw new JiraApiError('JIRA_BOARD_ID must be a numeric Jira board ID.', 500);
    }

    if (!boardId) {
      const boards = await jiraFetch<{ values: JiraBoard[] }>(
        `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&type=scrum&maxResults=50`,
      );
      boardId = boards.values[0]?.id;
    }

    if (!boardId) {
      throw new JiraApiError(`No Scrum board found for Jira project ${projectKey}. Set JIRA_BOARD_ID to use current sprint assignment.`, 404);
    }

    const sprints = await jiraFetch<{ values: JiraSprint[] }>(
      `/rest/agile/1.0/board/${encodeURIComponent(String(boardId))}/sprint?state=active&maxResults=50`,
    );
    const activeSprint = sprints.values[0];
    if (!activeSprint) {
      throw new JiraApiError(`No active sprint found for Jira board ${boardId}. Start a sprint or set JIRA_BOARD_ID to the active board.`, 404);
    }

    await jiraFetch<void>(`/rest/agile/1.0/sprint/${encodeURIComponent(String(activeSprint.id))}/issue`, {
      method: 'POST',
      body: JSON.stringify({ issues: [issueKey] }),
    });

    return activeSprint;
  },

  findActiveIssuesForUser: async (accountId: string) => {
    const jql = `assignee = "${escapeJqlValue(accountId)}" AND statusCategory != Done ORDER BY duedate ASC, created DESC`;
    const result = await jiraFetch<{ issues: JiraIssue[] }>('/rest/api/3/search/jql', {
      method: 'POST',
      body: JSON.stringify({
        jql,
        maxResults: 100,
        fields: ['summary', 'description', 'duedate', 'status', 'updated', 'assignee'],
      }),
    });

    return result.issues.map(normalizeIssue);
  },

  findProjectIssues: async () => {
    const { projectKey } = getConfig();
    const jql = `project = "${escapeJqlValue(projectKey)}" ORDER BY updated DESC`;
    const issues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const result = await jiraFetch<{
        issues: JiraIssue[];
        nextPageToken?: string;
        isLast?: boolean;
      }>('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          maxResults: 100,
          nextPageToken,
          fields: ['summary', 'description', 'duedate', 'status', 'updated', 'assignee'],
        }),
      });
      issues.push(...result.issues);
      nextPageToken = result.isLast ? undefined : result.nextPageToken;
    } while (nextPageToken);

    return issues.map(normalizeIssue);
  },

  getTransitions: async (issueIdOrKey: string) => {
    const result = await jiraFetch<{ transitions: JiraTransition[] }>(
      `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/transitions`,
    );
    return result.transitions;
  },

  getIssueAssigneeAccountId: async (issueIdOrKey: string) => {
    const issue = await jiraFetch<{ fields: { assignee?: { accountId: string } } }>(
      `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}?fields=assignee`,
    );
    return issue.fields.assignee?.accountId;
  },

  transitionIssue: async (issueIdOrKey: string, target: 'IN_PROGRESS' | 'DONE') => {
    const transitions = await JiraService.getTransitions(issueIdOrKey);
    const transition = transitions.find(item => {
      if (target === 'DONE') return item.to.statusCategory.key === 'done';
      return item.to.statusCategory.key === 'indeterminate' || /in progress|start/i.test(item.name);
    });

    if (!transition) {
      throw new JiraApiError(
        `No available Jira transition can move ${issueIdOrKey} to ${target}. Check the project's workflow.`,
        409,
      );
    }

    await jiraFetch<void>(`/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    return transition;
  },
};
