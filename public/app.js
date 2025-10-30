const state = {
  token: null,
  email: null,
  tasks: [],
  filters: {},
  editingId: null
};

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userLabel = document.getElementById('user-label');
const logoutBtn = document.getElementById('logout-btn');
const authFeedback = document.getElementById('auth-feedback');
const tasksFeedback = document.getElementById('tasks-feedback');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const taskForm = document.getElementById('task-form');
const taskCancel = document.getElementById('task-cancel');
const taskSubmit = document.getElementById('task-submit');
const filterForm = document.getElementById('filter-form');
const clearFiltersBtn = document.getElementById('clear-filters');
const tasksTableBody = document.getElementById('tasks-table-body');
const rowTemplate = document.getElementById('task-row-template');

function setFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('error', 'success');
  if (message && type) {
    el.classList.add(type);
  }
}

function saveAuth(token, email) {
  state.token = token;
  state.email = email;
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email || '');
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  }
}

function applyAuthToUI() {
  const authenticated = Boolean(state.token);
  authSection.classList.toggle('hidden', authenticated);
  appSection.classList.toggle('hidden', !authenticated);
  if (authenticated) {
    userLabel.textContent = state.email || 'Usuario autenticado';
  } else {
    userLabel.textContent = '';
    taskForm.reset();
    tasksTableBody.innerHTML = '';
  }
}

async function apiRequest(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_err) {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.error || `Erro ${response.status}`;
    if (response.status === 401) {
      saveAuth(null, null);
      applyAuthToUI();
    }
    throw new Error(message);
  }

  return data;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function toInputDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function resetTaskForm() {
  state.editingId = null;
  taskForm.reset();
  taskForm.querySelector('select[name="priority"]').value = 'medium';
  taskForm.querySelector('select[name="status"]').value = 'pending';
  taskSubmit.textContent = 'Salvar tarefa';
  taskCancel.classList.add('hidden');
}

function hydrateTaskForm(task) {
  state.editingId = task.id;
  taskForm.elements.taskId.value = task.id;
  taskForm.elements.title.value = task.title || '';
  taskForm.elements.description.value = task.description || '';
  taskForm.elements.priority.value = task.priority || 'medium';
  taskForm.elements.status.value = task.status || 'pending';
  taskForm.elements.dueDate.value = toInputDate(task.dueDate);
  taskSubmit.textContent = 'Atualizar tarefa';
  taskCancel.classList.remove('hidden');
}

function renderTasks(tasks) {
  tasksTableBody.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'Nenhuma tarefa encontrada.';
    row.appendChild(cell);
    tasksTableBody.appendChild(row);
    return;
  }

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    completed: 'Concluida'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Media',
    high: 'Alta'
  };

  tasks.forEach(task => {
    const fragment = rowTemplate.content.cloneNode(true);
    fragment.querySelector('.task-title').textContent = task.title;
    fragment.querySelector('.task-status').textContent = statusLabels[task.status] || task.status;
    fragment.querySelector('.task-priority').textContent = priorityLabels[task.priority] || task.priority;
    fragment.querySelector('.task-due-date').textContent = formatDate(task.dueDate);
    fragment.querySelector('.task-updated').textContent = formatDateTime(task.updatedAt);

    const editBtn = fragment.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => {
      hydrateTaskForm(task);
    });

    const deleteBtn = fragment.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      const confirmDelete = window.confirm('Deseja excluir esta tarefa?');
      if (!confirmDelete) return;
      try {
        await apiRequest(`/tasks/${task.id}`, { method: 'DELETE' });
        setFeedback(tasksFeedback, 'Tarefa removida.', 'success');
        await loadTasks();
      } catch (err) {
        setFeedback(tasksFeedback, err.message, 'error');
      }
    });

    tasksTableBody.appendChild(fragment);
  });
}

async function loadTasks(customFilters) {
  const filters = customFilters ?? state.filters;
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) {
      params.append(key, value);
    }
  });

  try {
    const query = params.toString();
    const endpoint = query ? `/tasks?${query}` : '/tasks';
    const data = await apiRequest(endpoint, { method: 'GET' });
    state.tasks = data.tasks || [];
    renderTasks(state.tasks);
    setFeedback(tasksFeedback, '', null);
  } catch (err) {
    setFeedback(tasksFeedback, err.message, 'error');
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const payload = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    const data = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    saveAuth(data.token, payload.email);
    applyAuthToUI();
    setFeedback(authFeedback, 'Login realizado com sucesso.', 'success');
    await loadTasks();
  } catch (err) {
    setFeedback(authFeedback, err.message, 'error');
  }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  try {
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    };
    const data = await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    setFeedback(authFeedback, 'Cadastro realizado. Agora faca login.', 'success');
    loginForm.elements.email.value = payload.email;
    loginForm.elements.password.value = payload.password;
  } catch (err) {
    setFeedback(authFeedback, err.message, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  saveAuth(null, null);
  applyAuthToUI();
  resetTaskForm();
  setFeedback(tasksFeedback, '', null);
});

taskCancel.addEventListener('click', () => {
  resetTaskForm();
});

taskForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const payload = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    status: formData.get('status'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate') || null
  };

  const taskId = state.editingId;
  const method = taskId ? 'PUT' : 'POST';
  const endpoint = taskId ? `/tasks/${taskId}` : '/tasks';

  try {
    await apiRequest(endpoint, {
      method,
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    setFeedback(tasksFeedback, taskId ? 'Tarefa atualizada.' : 'Tarefa criada.', 'success');
    resetTaskForm();
    await loadTasks();
  } catch (err) {
    setFeedback(tasksFeedback, err.message, 'error');
  }
});

filterForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(filterForm);
  const filters = {
    status: formData.get('status'),
    priority: formData.get('priority'),
    title: formData.get('title'),
    dueDate: formData.get('dueDate')
  };
  state.filters = filters;
  await loadTasks(filters);
});

clearFiltersBtn.addEventListener('click', async () => {
  filterForm.reset();
  state.filters = {};
  await loadTasks({});
});

function bootstrap() {
  const storedToken = localStorage.getItem('token');
  const storedEmail = localStorage.getItem('email');
  if (storedToken) {
    state.token = storedToken;
    state.email = storedEmail || '';
    applyAuthToUI();
    loadTasks().catch(err => {
      setFeedback(tasksFeedback, err.message, 'error');
    });
  } else {
    applyAuthToUI();
  }
}

bootstrap();
