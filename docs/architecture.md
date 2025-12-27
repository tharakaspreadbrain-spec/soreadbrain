# AI Project Management Platform Architecture

## Product breakdown
- **Project management:** create/edit/archive projects, due dates, owners, percent complete, and health (Good/At Risk/Delayed).
- **Task management:** manual and AI-created tasks with title, description, priority, status, assignee, due date, source, dependencies, comments, and activity log.
- **AI task generation:** upload/ paste Google Meet summary, detect action items, owners, deadlines, open loops, confidence scores, and PM review flags.
- **Developer recording validation:** start work sessions, attach screen recordings/sharing metadata, AI validates progress, PM approves/rejects.
- **Advanced analytics:** daily standup summaries, follow-up task creation, productivity analytics per developer, meeting-to-task accuracy scores, multi-view (Timeline/Kanban/List), and role-based access.

## UI layout
- **Left sidebar:** navigation for Projects, Tasks, Meetings, Recordings, Analytics, Settings; includes quick project selector and AI action shortcuts.
- **Top header:** global search, AI actions button (generate tasks, daily standup, follow-up), user profile/role switcher.
- **Main area:** card grid with project health, active tasks, AI inbox, meeting ingestion, developer mode, and analytics cards.
- **Task views:** kanban-style columns (status), list table, and timeline preview; inline pill badges for status/priority.
- **Modals/panels:** create/edit project, create/edit task, AI task review queue, developer recording session details.

## Data model (relational)
- **users** (`id`, `name`, `email`, `role`: Admin/PM/Developer, `avatar_url`)
- **projects** (`id`, `name`, `description`, `owner_id`, `due_date`, `health`, `progress_pct`, `status`)
- **project_members** (`project_id`, `user_id`, `role`)
- **tasks** (`id`, `project_id`, `title`, `description`, `priority`, `status`, `assignee_id`, `due_date`, `source`, `confidence`, `parent_task_id`, `ai_flagged`, `created_by`, `created_at`, `updated_at`)
- **task_dependencies** (`task_id`, `depends_on_task_id`)
- **task_comments** (`id`, `task_id`, `author_id`, `body`, `created_at`, `sentiment`)
- **meetings** (`id`, `project_id`, `title`, `summary_text`, `meeting_date`, `source`, `accuracy_score`)
- **meeting_action_items** (`id`, `meeting_id`, `task_id`, `confidence`)
- **recordings** (`id`, `task_id`, `developer_id`, `start_time`, `end_time`, `duration_seconds`, `artifact_url`, `ai_validation_state`, `ai_notes`, `pm_validation_state`, `pm_notes`, `app_usage_json`)
- **analytics_snapshots** (`id`, `project_id`, `period_start`, `period_end`, `developer_id`, `velocity_score`, `focus_time_minutes`, `blocked_rate`, `followup_count`)

## API surface (REST-first, WebSocket for live events)
- `POST /auth/login`, `POST /auth/refresh`
- `GET/POST/PATCH/DELETE /projects`
- `GET/POST/PATCH/DELETE /projects/:id/tasks`
- `POST /tasks/:id/comments`, `POST /tasks/:id/dependencies`
- `POST /ai/tasks/from-meeting` (body: `summary_text`, optional `project_id`) → returns structured tasks with confidence + AI flags
- `POST /ai/standup` (body: project/user scope) → daily summary + follow-up suggestions
- `POST /tasks/:id/recordings/start`, `/complete` → returns upload URL and validation stub
- `GET /recordings/:id/analysis` → AI validation details
- `GET /analytics/velocity`, `GET /analytics/productivity`
- WebSocket channels: `project:{id}:tasks`, `task:{id}:comments`, `recording:{id}:status`, `analytics:standup`.

## AI workflows
1. **Meeting → tasks**
   - Ingest summary text.
   - NLP extraction: action verbs, owners (names/emails), deadlines/date expressions, urgency.
   - Generate candidate tasks with confidence; tasks missing owners/dates are flagged `ai_flagged=true` for PM review.
   - Deduplicate against existing tasks by similarity.
2. **Recording validation**
   - Capture start/end timestamps and optional screen-share metadata.
   - Track active window/application focus to ensure task relevance.
   - AI labels: `completed`, `partial`, `blocked` + notes; compute meeting-to-task accuracy and focus ratio.
3. **Daily standup**
   - Aggregate tasks updated in last 24h, blocked items, and upcoming deadlines.
   - Generate summaries plus auto follow-up tasks for overdue/blocked work.

## Security & auth
- JWT-based auth with refresh tokens, BFF/SPA friendly.
- Role-based authorization checks server-side; claims propagated to UI for UX gating.
- Signed URLs for recording uploads; recordings encrypted at rest.
- Audit logging for AI overrides and PM decisions.

## Non-functional requirements
- API-first with OpenAPI contract.
- Extensible worker queue for AI jobs (e.g., Celery/BullMQ/Sidekiq).
- Observability: structured logs, tracing, and metrics for AI accuracy & latency.
- Responsive UI with offline-friendly local caching for draft tasks.

## Deployment approach
- Front-end: static hosting + CDN.
- Back-end: containerized services (API + worker) behind API gateway; optional WebSocket service.
- Storage: Postgres for relational data, S3-compatible bucket for recordings, Redis for queues/cache.
- AI: external LLM provider with prompt templates versioned in code; fallback heuristics when offline.
