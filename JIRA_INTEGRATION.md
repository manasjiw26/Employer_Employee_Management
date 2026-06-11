# Jira Cloud Task Integration

## Architecture

```text
Expo app -> Express API (Supabase JWT) -> Jira Cloud REST API v3
                     |
                     +-> Supabase profiles/tasks mapping tables
```

The mobile app never receives Jira credentials. Express authenticates the app user, enforces company and
assignee authorization, and calls Jira with a service account API token. Jira is the workflow engine.
Supabase stores the app-user-to-Jira-user mapping and a local issue mirror for audit, notifications, and
company authorization.

## Setup

1. Run `backend/supabase/migrations/003_add_jira_integration.sql` and
   `backend/supabase/migrations/004_add_task_sync_and_realtime.sql` in Supabase.
2. Add these values to `backend/.env`:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USER_EMAIL=jira-service-account@your-company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=HR
JIRA_BOARD_ID=1
JIRA_PROJECT_ROLE_ID=10002
JIRA_ISSUE_TYPE=Task
JIRA_SYNC_TTL_MS=60000
```

The Jira service account needs access to the configured project and permissions to browse users, create
issues, assign issues, browse issues, transition issues, and add users to the configured project role.

`JIRA_PROJECT_ROLE_ID` is optional, but enables automatic project enrollment when an app user registers
or is manually mapped to Jira. Use a project role that is included in your Jira permission scheme for
`Browse Projects` and `Assignable User`. The Jira service account also needs `Administer Projects` for
that project or global `Administer Jira` permission to add users to the role.

`JIRA_BOARD_ID` is optional when the project has one Scrum board, but recommended. After creating a Jira
issue, the backend adds it to this board's active sprint. Without an active sprint, Jira keeps the issue
in the backlog and the API response includes a warning while still saving the task in Supabase.

## Database Mapping

```sql
profiles.jira_account_id   text unique
profiles.jira_display_name text
profiles.jira_mapped_at    timestamptz

tasks.jira_issue_id        text unique
tasks.jira_issue_key       text unique
tasks.jira_issue_url       text
```

An employer can explicitly map an employee:

```http
POST /api/employees/{profileId}/jira/map
Authorization: Bearer {supabaseAccessToken}
```

The endpoint supports two flows:

```json
{}
```

Auto-searches Jira by the employee email.

```json
{
  "accountId": "712020:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "Jane Doe"
}
```

Stores a manually entered Atlassian `accountId` in Supabase. Use this when Jira hides emails from the
user-search API. Employers can enter this from the Staff Directory action sheet or from the task assignment
modal after choosing an unmapped employee.

The backend searches Jira with:

```http
GET /rest/api/3/user/search?query=employee@example.com&maxResults=50
```

It accepts only an active result whose visible `emailAddress` exactly matches the app profile email.
Task creation also performs this mapping automatically when an employee is not mapped yet. Jira privacy
settings can hide email addresses; in that case the mapping returns an actionable error instead of risking
assignment to the wrong person.

## Employer: Create And Assign

The Expo employer screen sends:

```json
{
  "title": "Finish client presentation",
  "description": "Add the final Q3 charts",
  "due_date": "2026-12-31T00:00:00.000Z",
  "assigned_to_id": "app-profile-uuid",
  "points_reward": 0
}
```

Express resolves the profile's Jira `accountId` and creates the Jira issue:

```json
{
  "fields": {
    "project": { "key": "HR" },
    "summary": "Finish client presentation",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [{
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Add the final Q3 charts" }]
      }]
    },
    "issuetype": { "name": "Task" },
    "assignee": { "accountId": "jira-account-id" },
    "duedate": "2026-12-31"
  }
}
```

Jira Cloud v3 rich-text fields use Atlassian Document Format (ADF), not plain strings.

After Jira creation, Express calls the Jira Agile API to add the issue key to the active sprint for
`JIRA_BOARD_ID`:

```http
POST /rest/agile/1.0/sprint/{activeSprintId}/issue
```

## Employee: Fetch Active Tasks

Normal app reads use `GET /api/tasks/my`, which reads only Supabase. Jira reconciliation uses
`POST /api/tasks/sync`; it imports Jira project issues assigned to mapped company users into Supabase.
The backend throttles Jira reconciliation with `JIRA_SYNC_TTL_MS`.

The Jira reconciliation JQL submitted through `POST /rest/api/3/search/jql` is:

```jql
project = "HR"
ORDER BY updated DESC
```

The backend normalizes Jira status categories for the app:

| Jira status category | App status |
| --- | --- |
| `new` | `TODO` |
| `indeterminate` | `IN_PROGRESS` |
| `done` | `DONE` |

## Employee: Start Or Finish A Task

Jira workflow transitions are actions, not direct status writes. The available transition IDs differ by
project workflow and current issue state, so the backend always performs two steps.

1. Fetch available transitions:

```http
GET /rest/api/3/issue/{issueKey}/transitions
```

The app may inspect the authorized proxy response with:

```http
GET /api/tasks/{issueKey}/transitions
```

2. Select a transition whose target status category is `done` (or `indeterminate` for start), then post:

```http
POST /rest/api/3/issue/{issueKey}/transitions
Content-Type: application/json

{ "transition": { "id": "31" } }
```

The Expo app uses:

```ts
await apiFetch(`/tasks/${issueKey}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'DONE' }),
});
```

Before transitioning, Express verifies that Jira currently assigns the issue to the logged-in employee's
mapped account ID.

## Supabase Read Model And Device Cache

The app uses three consistency layers:

1. Jira is the external workflow source.
2. Supabase `tasks` is the shared read model for both Jira-imported tasks and Supabase-only legacy tasks.
3. AsyncStorage is a per-user, five-minute device cache.

Normal screen opening reads AsyncStorage. When the cache is stale, the app calls `/api/tasks/sync`; the
backend checks `task_sync_state` and contacts Jira only if its server-side TTL has expired. Pull-to-refresh
forces Jira reconciliation.

Supabase Realtime is enabled for `tasks`. Inserts and updates merge into every connected user's device
cache. App-originated writes use write-through behavior:

```text
App mutation -> Jira transition/create -> Supabase mirror update -> Realtime -> other device caches
```

If Jira succeeds but the Supabase write temporarily fails, the next reconciliation imports Jira's current
state and repairs the Supabase mirror. If Jira is unavailable during a read sync, the endpoint returns the
existing Supabase tasks with a warning instead of making the task screen unavailable.

Changes made directly in Jira become visible after the next TTL-based or manual reconciliation. For
near-instant Jira-to-app updates in production, configure a signed Jira webhook that triggers the same
company reconciliation process.

## Swift Network Layer Example

This repository uses Expo, but a native iOS client can call the same secure proxy:

```swift
struct TaskStatusBody: Encodable {
    let status: String
}

final class TaskAPI {
    let baseURL: URL
    let accessToken: String

    init(baseURL: URL, accessToken: String) {
        self.baseURL = baseURL
        self.accessToken = accessToken
    }

    func complete(issueKey: String) async throws {
        var request = URLRequest(
            url: baseURL.appending(path: "/api/tasks/\(issueKey)/status")
        )
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(TaskStatusBody(status: "DONE"))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
    }
}
```

## Production Notes

- Use a dedicated Jira service account with least privilege and rotate its API token.
- Store Jira secrets only in the backend secret manager, never in Expo or Swift configuration.
- Jira Cloud rate limits apply; add retry/backoff and request tracing before high-volume rollout.
- The current exact-email mapping is intentionally conservative. If Jira hides user emails, add an
  employer-reviewed manual account-ID mapping flow rather than guessing.
- Add a reconciliation job if Jira issues can be edited outside the app, so the local task mirror remains
  useful for employer reporting.

## Official Jira References

- User search: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-user-search/
- Create issue: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- JQL issue search: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
- Issue transitions: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-workflows/
- Basic auth for API tokens: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
