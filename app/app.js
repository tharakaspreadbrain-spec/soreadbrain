const projects = [
  { id: 'p1', name: 'Apollo Revamp', description: 'New customer onboarding workspace', owner: 'Amira', due: '2024-07-30', health: 'Good', progress: 68 },
  { id: 'p2', name: 'Edge Infrastructure', description: 'Rollout of edge build pipeline', owner: 'Diego', due: '2024-08-15', health: 'At Risk', progress: 42 },
  { id: 'p3', name: 'AI Assist', description: 'Meeting → task automation', owner: 'Priya', due: '2024-07-05', health: 'Delayed', progress: 28 }
];

const tasks = [
  { id: 't1', projectId: 'p1', title: 'Ship onboarding checklist v2', status: 'In Progress', priority: 'High', assignee: 'Lena', due: '2024-07-01', source: 'Manual', aiFlagged: false },
  { id: 't2', projectId: 'p2', title: 'Define edge environments', status: 'Blocked', priority: 'Medium', assignee: 'Diego', due: '2024-07-10', source: 'Meeting', aiFlagged: true },
  { id: 't3', projectId: 'p3', title: 'Prompt templates for action items', status: 'Not Started', priority: 'High', assignee: 'Priya', due: '2024-06-28', source: 'AI', aiFlagged: false },
  { id: 't4', projectId: 'p1', title: 'Create customer health score', status: 'Done', priority: 'Low', assignee: 'Ravi', due: '2024-06-15', source: 'Manual', aiFlagged: false }
];

let aiQueue = [];
let recordings = [];
let activeRecording = null;

const statusColumns = ['Not Started', 'In Progress', 'Blocked', 'Done'];

function $(id) { return document.getElementById(id); }

function renderProjects() {
  const wrap = $('projectList');
  wrap.innerHTML = '';
  projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="badge-row">
        <span class="pill primary">${project.progress}%</span>
        <span class="status-pill status-${project.health.replace(' ', '')}">${project.health}</span>
        <span class="pill muted">Due ${project.due || '—'}</span>
      </div>
      <h4>${project.name}</h4>
      <p class="help">${project.description}</p>
      <div class="badge-row">
        <span class="pill">Owner: ${project.owner}</span>
        <span class="pill">Tasks: ${tasks.filter(t => t.projectId === project.id).length}</span>
      </div>
    `;
    wrap.appendChild(card);
  });
  syncProjectOptions();
}

function syncProjectOptions() {
  const selects = ['meetingProject', 'taskProject'];
  selects.forEach(id => {
    const node = $(id);
    node.innerHTML = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  });
}

function renderKanban() {
  const board = $('kanban');
  board.innerHTML = '';
  statusColumns.forEach(status => {
    const col = document.createElement('div');
    col.className = 'kanban-column';
    const title = status === 'Not Started' ? 'Backlog' : status;
    col.innerHTML = `<h4>${title}</h4>`;
    const related = tasks.filter(t => t.status === status);
    if (related.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No tasks yet';
      col.appendChild(empty);
    }
    related.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.innerHTML = `
        <h5>${task.title}</h5>
        <div class="task-meta">
          <span class="pill ${pillFromPriority(task.priority)}">${task.priority}</span>
          <span class="pill muted">${projectName(task.projectId)}</span>
          <span class="pill muted">${task.assignee || 'Unassigned'}</span>
          <span class="pill ${task.aiFlagged ? 'warning' : 'primary'}">${task.source}</span>
        </div>
        <p class="help">Due ${task.due || '—'}</p>
      `;
      col.appendChild(card);
    });
    board.appendChild(col);
  });
  syncRecordingTaskOptions();
}

function pillFromPriority(priority) {
  switch (priority) {
    case 'High': return 'danger';
    case 'Low': return 'muted';
    default: return 'primary';
  }
}

function projectName(id) {
  const project = projects.find(p => p.id === id);
  return project ? project.name : 'Unknown';
}

function renderAITasks() {
  const wrap = $('aiTasks');
  wrap.innerHTML = '';
  if (aiQueue.length === 0) {
    wrap.innerHTML = '<p class="empty">No AI-generated tasks yet. Paste a meeting summary to get started.</p>';
    return;
  }
  aiQueue.forEach(task => {
    const row = document.createElement('div');
    row.className = 'task-card';
    row.innerHTML = `
      <div class="badge-row">
        <span class="pill primary">${(task.confidence * 100).toFixed(0)}% confidence</span>
        ${task.aiFlagged ? '<span class="pill warning">Needs PM review</span>' : ''}
      </div>
      <h5>${task.title}</h5>
      <p class="help">${task.description}</p>
      <div class="task-meta">
        <span class="pill muted">Assignee: ${task.assignee || 'Unclear'}</span>
        <span class="pill muted">Due: ${task.due || 'Unclear'}</span>
      </div>
      <div class="inline">
        <button class="primary" data-accept="${task.id}">Approve</button>
        <button class="ghost" data-reject="${task.id}">Reject</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderRecordingStatus() {
  const wrap = $('recordingStatus');
  wrap.innerHTML = '';
  if (activeRecording) {
    const row = document.createElement('div');
    row.className = 'task-card';
    const elapsed = Math.round((Date.now() - activeRecording.startedAt) / 60000);
    row.innerHTML = `<h5>Recording: ${taskName(activeRecording.taskId)}</h5><p class="help">Active for ${elapsed}m</p>`;
    wrap.appendChild(row);
  }
  recordings.forEach(rec => {
    const row = document.createElement('div');
    row.className = 'task-card';
    row.innerHTML = `
      <div class="badge-row">
        <span class="pill primary">${taskName(rec.taskId)}</span>
        <span class="pill">${rec.duration} mins</span>
        <span class="pill ${rec.aiDecision === 'blocked' ? 'warning' : rec.aiDecision === 'done' ? 'success' : 'muted'}">AI: ${rec.aiDecision}</span>
      </div>
      <p class="help">PM notes: ${rec.pmDecision || 'Pending validation'}</p>
    `;
    wrap.appendChild(row);
  });
  if (!activeRecording && recordings.length === 0) {
    wrap.innerHTML = '<p class="empty">No recordings yet.</p>';
  }
}

function taskName(id) {
  const task = tasks.find(t => t.id === id);
  return task ? task.title : 'Unknown task';
}

function renderStandup() {
  const wrap = $('standup');
  wrap.innerHTML = '';
  const summary = buildStandup();
  wrap.innerHTML = summary.map(line => `<p>${line}</p>`).join('');
}

function buildStandup() {
  const completed = tasks.filter(t => t.status === 'Done').slice(-2).map(t => `✅ ${t.title}`);
  const inProgress = tasks.filter(t => t.status === 'In Progress').map(t => `🟢 ${t.title}`);
  const blocked = tasks.filter(t => t.status === 'Blocked').map(t => `🚧 ${t.title}`);
  return [
    'Updates in last 24h:',
    ...completed,
    '',
    'In progress:',
    ...inProgress,
    '',
    'Blocked/risks:',
    ...blocked,
    '',
    'Follow-ups: Ensure recording validation for open sessions and clarify AI-flagged items.'
  ];
}

function renderAnalytics() {
  const wrap = $('analytics');
  wrap.innerHTML = '';
  const metrics = [
    { label: 'Velocity', value: '21 pts', trend: '+12% vs last week' },
    { label: 'Focus time', value: '4.6h', trend: 'AI validated' },
    { label: 'Blocked rate', value: '18%', trend: '2 tasks need PM' },
    { label: 'Meeting→Task accuracy', value: '82%', trend: 'Flagged items reduced' }
  ];
  metrics.forEach(m => {
    const row = document.createElement('div');
    row.className = 'project-card';
    row.innerHTML = `<h4>${m.label}</h4><p class="help">${m.trend}</p><strong>${m.value}</strong>`;
    wrap.appendChild(row);
  });
}

function parseMeeting(text) {
  const lines = text.split(/\n|\. /).map(l => l.trim()).filter(Boolean);
  const dueRegex = /(\bby\s+)?(\d{4}-\d{2}-\d{2}|next week|tomorrow|Friday|Monday)/i;
  return lines.map((line, idx) => {
    const dueMatch = line.match(dueRegex);
    const assigneeMatch = line.match(/@?(\b[A-Z][a-zA-Z]+\b)/);
    const confidence = Math.min(0.95, 0.5 + line.length / 160 + (assigneeMatch ? 0.1 : 0));
    return {
      id: `ai-${Date.now()}-${idx}`,
      title: line.slice(0, 60),
      description: line,
      assignee: assigneeMatch ? assigneeMatch[1] : '',
      due: dueMatch ? dueMatch[2] : '',
      confidence,
      aiFlagged: !assigneeMatch || !dueMatch
    };
  });
}

function addProject(evt) {
  evt.preventDefault();
  const name = $('projectName').value;
  const description = $('projectDesc').value;
  const owner = $('projectOwner').value || 'Unassigned';
  const due = $('projectDue').value;
  projects.push({ id: `p${projects.length + 1}`, name, description, owner, due, health: 'Good', progress: 0 });
  renderProjects();
  toggleModal('projectModal', false);
  evt.target.reset();
}

function addTask(evt) {
  evt.preventDefault();
  const title = $('taskTitle').value;
  const projectId = $('taskProject').value;
  const description = $('taskDesc').value;
  const assignee = $('taskAssignee').value;
  const due = $('taskDue').value;
  const priority = $('taskPriority').value;
  const status = $('taskStatus').value;
  tasks.push({ id: `t${tasks.length + 1}`, projectId, title, description, assignee, due, priority, status, source: 'Manual', aiFlagged: false });
  renderKanban();
  renderProjects();
  toggleModal('taskModal', false);
  evt.target.reset();
}

function generateTasks(evt) {
  evt.preventDefault();
  const summary = $('meetingSummary').value.trim();
  if (!summary) return;
  const projectId = $('meetingProject').value;
  const generated = parseMeeting(summary).map(task => ({ ...task, projectId, status: 'Not Started', priority: 'Medium', source: 'Meeting' }));
  aiQueue = generated;
  renderAITasks();
}

function handleAIInboxClick(evt) {
  const acceptId = evt.target.getAttribute('data-accept');
  const rejectId = evt.target.getAttribute('data-reject');
  if (acceptId) {
    const task = aiQueue.find(t => t.id === acceptId);
    if (task) {
      tasks.push({ ...task, id: `t${tasks.length + 1}`, status: 'Not Started', source: 'Meeting', aiFlagged: task.aiFlagged });
      aiQueue = aiQueue.filter(t => t.id !== acceptId);
      renderKanban();
      renderProjects();
      renderAITasks();
    }
  }
  if (rejectId) {
    aiQueue = aiQueue.filter(t => t.id !== rejectId);
    renderAITasks();
  }
}

function startRecording() {
  const taskId = $('recordingTask').value;
  if (!taskId || activeRecording) return;
  activeRecording = { taskId, startedAt: Date.now() };
  renderRecordingStatus();
}

function completeRecording() {
  if (!activeRecording) return;
  const duration = Math.max(1, Math.round((Date.now() - activeRecording.startedAt) / 60000));
  const decision = duration > 25 ? 'done' : duration < 5 ? 'blocked' : 'partial';
  recordings.unshift({ taskId: activeRecording.taskId, duration, aiDecision: decision, pmDecision: 'Pending' });
  activeRecording = null;
  renderRecordingStatus();
}

function syncRecordingTaskOptions() {
  const select = $('recordingTask');
  select.innerHTML = tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
}

function toggleModal(id, open) {
  const modal = $(id);
  modal.classList[open ? 'remove' : 'add']('hidden');
}

function bindModal(id, buttonId) {
  $(buttonId).addEventListener('click', () => toggleModal(id, true));
  document.querySelector(`#${id} [data-close]`).addEventListener('click', () => toggleModal(id, false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleModal(id, false);
  });
}

function init() {
  renderProjects();
  renderKanban();
  renderAITasks();
  renderRecordingStatus();
  renderStandup();
  renderAnalytics();

  $('projectForm').addEventListener('submit', addProject);
  $('taskForm').addEventListener('submit', addTask);
  $('meetingForm').addEventListener('submit', generateTasks);
  $('aiTasks').addEventListener('click', handleAIInboxClick);
  $('startRecording').addEventListener('click', startRecording);
  $('completeRecording').addEventListener('click', completeRecording);
  bindModal('projectModal', 'newProjectBtn');
  bindModal('taskModal', 'newTaskBtn');

  $('aiStandup').addEventListener('click', () => renderStandup());
  $('aiCreate').addEventListener('click', () => toggleModal('taskModal', true));
  $('ingestMeetingBtn').addEventListener('click', () => $('meetingSummary').focus());
}

document.addEventListener('DOMContentLoaded', init);
