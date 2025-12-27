# Soreadbrain AI Project Management Platform

A modern, AI-assisted project management web application inspired by Linear/Asana. The app combines core project and task management with AI-generated tasks from meeting summaries, recording validation workflows for developer tasks, and productivity analytics.

## Quick start

This repo ships as a static, framework-free web app. Open `app/index.html` in a browser or serve the `app/` folder with any static file server.

```bash
# Example static server
python -m http.server 8000 --directory app
```

## What’s included

- **AI-augmented task creation** from Google Meet summaries
- **Projects, tasks, dependencies, and comments** with pill badges and modern SaaS styling
- **Developer mode** with recording placeholders and AI validation states
- **Productivity analytics** mock dashboards and daily stand-up generator stubs
- **Role-based UX affordances** (Admin, PM, Developer toggles) on the front-end

For architecture, API, and data model details, see `docs/architecture.md`.
