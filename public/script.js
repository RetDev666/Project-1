// Глобальні змінні
let currentTab = 'dashboard';
let pomodoroTimer = null;
let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60; // 25 хвилин в секундах
let pomodoroMode = 'work'; // work, break, longBreak
let pomodoroSessions = 0;
let activeTracking = null;
let charts = {};

// API базовий URL
const API_BASE = '/api';

// Ініціалізація додатку
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    await loadDashboardData();
    await loadTasks();
    await loadPomodoroStats();
    await loadActiveTracking();
    await loadBlockedSites();
    await loadReminders();
}

// Налаштування обробників подій
function setupEventListeners() {
    // Навігація
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Завдання
    document.getElementById('add-task-btn').addEventListener('click', () => openModal('task-modal'));
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    document.querySelector('.close').addEventListener('click', () => closeModal('task-modal'));
    document.getElementById('priority-filter').addEventListener('change', filterTasks);
    document.getElementById('status-filter').addEventListener('change', filterTasks);

    // Помодоро
    document.getElementById('pomodoro-start').addEventListener('click', startPomodoro);
    document.getElementById('pomodoro-pause').addEventListener('click', pausePomodoro);
    document.getElementById('pomodoro-reset').addEventListener('click', resetPomodoro);
    document.getElementById('start-timer').addEventListener('click', startPomodoro);
    document.getElementById('pause-timer').addEventListener('click', pausePomodoro);
    document.getElementById('reset-timer').addEventListener('click', resetPomodoro);

    // Трекінг часу
    document.getElementById('start-tracking').addEventListener('click', startTimeTracking);

    // Налаштування
    document.getElementById('add-site-btn').addEventListener('click', addBlockedSite);
    document.getElementById('add-reminder-btn').addEventListener('click', addReminder);

    // Аналітика
    document.getElementById('analytics-period').addEventListener('change', loadAnalytics);
}

// Переключення між вкладками
function switchTab(tabName) {
    // Приховуємо всі вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Прибираємо активний клас з кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показуємо потрібну вкладку
    document.getElementById(tabName).classList.add('active');
    
    // Додаємо активний клас кнопці
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    currentTab = tabName;
    
    // Завантажуємо дані для вкладки
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'pomodoro':
            loadPomodoroStats();
            break;
        case 'tracking':
            loadTimeTracking();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'settings':
            loadBlockedSites();
            loadReminders();
            break;
    }
}

// API функції
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Помилка зєднання з сервером', 'error');
        throw error;
    }
}

// Завантаження даних головної сторінки
async function loadDashboardData() {
    try {
        const [tasks, stats] = await Promise.all([
            apiCall('/tasks'),
            apiCall('/analytics/overview')
        ]);
        
        displayTodayTasks(tasks);
        displayQuickStats(stats);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Відображення сьогоднішніх завдань
function displayTodayTasks(tasks) {
    const container = document.getElementById('today-tasks');
    const today = new Date().toDateString();
    
    const todayTasks = tasks.filter(task => {
        const taskDate = new Date(task.created_at).toDateString();
        return taskDate === today && task.status !== 'completed';
    }).slice(0, 5);
    
    if (todayTasks.length === 0) {
        container.innerHTML = '<div class="no-data">Немає завдань на сьогодні</div>';
        return;
    }
    
    container.innerHTML = todayTasks.map(task => `
        <div class="task-item">
            <div class="task-info">
                <h4>${task.title}</h4>
                <p>${task.description || 'Без опису'}</p>
            </div>
            <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
        </div>
    `).join('');
}

// Відображення швидкої статистики
function displayQuickStats(stats) {
    const container = document.getElementById('quick-stats');
    
    container.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${stats.tasks?.total_tasks || 0}</div>
            <div class="stat-label">Всього завдань</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.tasks?.completed_tasks || 0}</div>
            <div class="stat-label">Завершено</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.pomodoro?.completed_sessions || 0}</div>
            <div class="stat-label">Сесій Помодоро</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${Math.round((stats.timeTracking?.total_minutes || 0) / 60)}</div>
            <div class="stat-label">Годин трекінгу</div>
        </div>
    `;
}

// Завантаження завдань
async function loadTasks() {
    try {
        const tasks = await apiCall('/tasks');
        displayTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Відображення завдань
function displayTasks(tasks) {
    const container = document.getElementById('tasks-list');
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-data">Немає завдань</div>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-item" data-id="${task.id}">
            <div class="task-info">
                <h4>${task.title}</h4>
                <p>${task.description || 'Без опису'}</p>
                ${task.deadline ? `<small>Дедлайн: ${new Date(task.deadline).toLocaleString()}</small>` : ''}
            </div>
            <div class="task-actions">
                <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
                <button class="btn btn-secondary" onclick="editTask(${task.id})">Редагувати</button>
                <button class="btn btn-danger" onclick="deleteTask(${task.id})">Видалити</button>
            </div>
        </div>
    `).join('');
}

// Фільтрація завдань
function filterTasks() {
    const priorityFilter = document.getElementById('priority-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        const priority = item.querySelector('.task-priority').classList.contains(`priority-${priorityFilter}`);
        const status = item.dataset.status === statusFilter;
        
        const showPriority = !priorityFilter || priority;
        const showStatus = !statusFilter || status;
        
        item.style.display = showPriority && showStatus ? 'flex' : 'none';
    });
}

// Обробка створення завдання
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const taskData = {
        title: formData.get('task-title'),
        description: formData.get('task-description'),
        priority: formData.get('task-priority'),
        deadline: formData.get('task-deadline')
    };
    
    try {
        await apiCall('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        
        closeModal('task-modal');
        e.target.reset();
        loadTasks();
        loadDashboardData();
        showNotification('Завдання створено', 'success');
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

// Помодоро функції
function startPomodoro() {
    if (pomodoroTimer) return;
    
    const workDuration = parseInt(document.getElementById('work-duration').value) * 60;
    const breakDuration = parseInt(document.getElementById('break-duration').value) * 60;
    const longBreakDuration = parseInt(document.getElementById('long-break-duration').value) * 60;
    
    if (pomodoroMode === 'work') {
        pomodoroTimeLeft = workDuration;
    } else if (pomodoroMode === 'break') {
        pomodoroTimeLeft = breakDuration;
    } else {
        pomodoroTimeLeft = longBreakDuration;
    }
    
    pomodoroTimer = Date.now();
    pomodoroInterval = setInterval(updatePomodoroTimer, 1000);
    
    // Створюємо сесію в базі даних
    apiCall('/pomodoro/session', {
        method: 'POST',
        body: JSON.stringify({
            duration: Math.floor(pomodoroTimeLeft / 60),
            task_id: null
        })
    });
    
    updatePomodoroDisplay();
}

function pausePomodoro() {
    if (!pomodoroTimer) return;
    
    clearInterval(pomodoroInterval);
    pomodoroTimer = null;
    pomodoroInterval = null;
}

function resetPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroTimer = null;
    pomodoroInterval = null;
    pomodoroTimeLeft = parseInt(document.getElementById('work-duration').value) * 60;
    pomodoroMode = 'work';
    updatePomodoroDisplay();
}

function updatePomodoroTimer() {
    if (pomodoroTimeLeft <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroTimer = null;
        pomodoroInterval = null;
        
        // Переключаємо режим
        if (pomodoroMode === 'work') {
            pomodoroSessions++;
            if (pomodoroSessions % 4 === 0) {
                pomodoroMode = 'longBreak';
                pomodoroTimeLeft = parseInt(document.getElementById('long-break-duration').value) * 60;
            } else {
                pomodoroMode = 'break';
                pomodoroTimeLeft = parseInt(document.getElementById('break-duration').value) * 60;
            }
        } else {
            pomodoroMode = 'work';
            pomodoroTimeLeft = parseInt(document.getElementById('work-duration').value) * 60;
        }
        
        showNotification('Помодоро сесія завершена!', 'success');
        playNotificationSound();
        
        // Завершуємо сесію в базі даних
        apiCall('/pomodoro/session/1/complete', {
            method: 'PUT'
        });
        
        return;
    }
    
    pomodoroTimeLeft--;
    updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    
    document.getElementById('pomodoro-minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('pomodoro-seconds').textContent = seconds.toString().padStart(2, '0');
    document.getElementById('timer-minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('timer-seconds').textContent = seconds.toString().padStart(2, '0');
    
    // Оновлюємо лейбл
    const labels = document.querySelectorAll('.timer-label');
    labels.forEach(label => {
        label.textContent = pomodoroMode === 'work' ? 'Помодоро' : 
                           pomodoroMode === 'break' ? 'Перерва' : 'Довга перерва';
    });
}

// Завантаження статистики Помодоро
async function loadPomodoroStats() {
    try {
        const stats = await apiCall('/pomodoro/stats');
        displayPomodoroStats(stats);
    } catch (error) {
        console.error('Error loading pomodoro stats:', error);
    }
}

function displayPomodoroStats(stats) {
    const container = document.getElementById('pomodoro-stats');
    
    container.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${stats.total_sessions || 0}</div>
            <div class="stat-label">Всього сесій</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.completed_sessions || 0}</div>
            <div class="stat-label">Завершено</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${Math.round((stats.total_duration || 0) / 60)}</div>
            <div class="stat-label">Годин фокусу</div>
        </div>
    `;
}

// Трекінг часу
async function startTimeTracking() {
    const activityName = document.getElementById('activity-name').value.trim();
    
    if (!activityName) {
        showNotification('Введіть назву активності', 'error');
        return;
    }
    
    try {
        const result = await apiCall('/time-tracking/start', {
            method: 'POST',
            body: JSON.stringify({ activity_name: activityName })
        });
        
        activeTracking = {
            id: result.id,
            activity_name: activityName,
            start_time: new Date()
        };
        
        document.getElementById('activity-name').value = '';
        loadActiveTracking();
        showNotification('Трекінг часу розпочато', 'success');
    } catch (error) {
        console.error('Error starting time tracking:', error);
    }
}

async function stopTimeTracking(trackingId) {
    try {
        await apiCall(`/time-tracking/stop/${trackingId}`, {
            method: 'PUT'
        });
        
        activeTracking = null;
        loadActiveTracking();
        loadTimeTracking();
        showNotification('Трекінг часу зупинено', 'success');
    } catch (error) {
        console.error('Error stopping time tracking:', error);
    }
}

async function loadActiveTracking() {
    try {
        const activeTrackings = await apiCall('/time-tracking/active');
        displayActiveTracking(activeTrackings);
    } catch (error) {
        console.error('Error loading active tracking:', error);
    }
}

function displayActiveTracking(trackings) {
    const container = document.getElementById('active-tracking');
    const noTracking = document.getElementById('no-tracking');
    
    if (trackings.length === 0) {
        noTracking.style.display = 'block';
        return;
    }
    
    noTracking.style.display = 'none';
    container.innerHTML = trackings.map(tracking => `
        <div class="tracking-item">
            <div>
                <strong>${tracking.activity_name}</strong>
                <br>
                <small>Почато: ${new Date(tracking.start_time).toLocaleTimeString()}</small>
            </div>
            <button class="btn btn-danger" onclick="stopTimeTracking(${tracking.id})">Зупинити</button>
        </div>
    `).join('');
}

async function loadTimeTracking() {
    try {
        const [activeTrackings, history] = await Promise.all([
            apiCall('/time-tracking/active'),
            apiCall('/time-tracking/history')
        ]);
        
        displayActiveTracking(activeTrackings);
        displayTrackingHistory(history);
    } catch (error) {
        console.error('Error loading time tracking:', error);
    }
}

function displayTrackingHistory(history) {
    const container = document.getElementById('tracking-history');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="no-data">Немає історії трекінгу</div>';
        return;
    }
    
    container.innerHTML = history.slice(0, 10).map(tracking => `
        <div class="tracking-item">
            <div>
                <strong>${tracking.activity_name}</strong>
                <br>
                <small>${new Date(tracking.start_time).toLocaleString()} - ${new Date(tracking.end_time).toLocaleString()}</small>
            </div>
            <div>
                <strong>${Math.round(tracking.duration_minutes)} хв</strong>
            </div>
        </div>
    `).join('');
}

// Аналітика
async function loadAnalytics() {
    const period = document.getElementById('analytics-period').value;
    
    try {
        const [productivity, timeUsage, overview] = await Promise.all([
            apiCall(`/analytics/productivity?period=${period}`),
            apiCall('/analytics/time-usage'),
            apiCall('/analytics/overview')
        ]);
        
        createTasksChart(productivity);
        createTimeUsageChart(timeUsage);
        createPomodoroChart(overview);
        displayOverviewStats(overview);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function createTasksChart(data) {
    const ctx = document.getElementById('tasks-chart').getContext('2d');
    
    if (charts.tasks) {
        charts.tasks.destroy();
    }
    
    charts.tasks = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => new Date(item.date).toLocaleDateString()),
            datasets: [{
                label: 'Завершено завдань',
                data: data.map(item => item.completed_tasks),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

function createTimeUsageChart(data) {
    const ctx = document.getElementById('time-usage-chart').getContext('2d');
    
    if (charts.timeUsage) {
        charts.timeUsage.destroy();
    }
    
    charts.timeUsage = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.activity_name),
            datasets: [{
                data: data.map(item => item.total_minutes),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#f5576c',
                    '#4facfe',
                    '#00f2fe'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

function createPomodoroChart(data) {
    const ctx = document.getElementById('pomodoro-chart').getContext('2d');
    
    if (charts.pomodoro) {
        charts.pomodoro.destroy();
    }
    
    charts.pomodoro = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Загальні сесії', 'Завершені сесії'],
            datasets: [{
                label: 'Кількість',
                data: [data.pomodoro?.total_sessions || 0, data.pomodoro?.completed_sessions || 0],
                backgroundColor: ['#667eea', '#38a169']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function displayOverviewStats(data) {
    const container = document.getElementById('overview-stats');
    
    container.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${data.tasks?.total_tasks || 0}</div>
            <div class="stat-label">Всього завдань</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${data.tasks?.completed_tasks || 0}</div>
            <div class="stat-label">Завершено</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${data.pomodoro?.completed_sessions || 0}</div>
            <div class="stat-label">Сесій Помодоро</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${Math.round((data.timeTracking?.total_minutes || 0) / 60)}</div>
            <div class="stat-label">Годин трекінгу</div>
        </div>
    `;
}

// Налаштування
async function loadBlockedSites() {
    try {
        const sites = await apiCall('/blocked-sites');
        displayBlockedSites(sites);
    } catch (error) {
        console.error('Error loading blocked sites:', error);
    }
}

function displayBlockedSites(sites) {
    const container = document.getElementById('blocked-sites-list');
    
    if (sites.length === 0) {
        container.innerHTML = '<div class="no-data">Немає заблокованих сайтів</div>';
        return;
    }
    
    container.innerHTML = sites.map(site => `
        <div class="site-item">
            <span>${site.url}</span>
            <button class="btn btn-danger" onclick="removeBlockedSite(${site.id})">Видалити</button>
        </div>
    `).join('');
}

async function addBlockedSite() {
    const url = document.getElementById('site-url').value.trim();
    
    if (!url) {
        showNotification('Введіть URL сайту', 'error');
        return;
    }
    
    try {
        await apiCall('/blocked-sites', {
            method: 'POST',
            body: JSON.stringify({ url })
        });
        
        document.getElementById('site-url').value = '';
        loadBlockedSites();
        showNotification('Сайт заблоковано', 'success');
    } catch (error) {
        console.error('Error adding blocked site:', error);
    }
}

async function removeBlockedSite(siteId) {
    try {
        await apiCall(`/blocked-sites/${siteId}`, {
            method: 'DELETE'
        });
        
        loadBlockedSites();
        showNotification('Сайт розблоковано', 'success');
    } catch (error) {
        console.error('Error removing blocked site:', error);
    }
}

async function loadReminders() {
    try {
        const reminders = await apiCall('/reminders');
        displayReminders(reminders);
    } catch (error) {
        console.error('Error loading reminders:', error);
    }
}

function displayReminders(reminders) {
    const container = document.getElementById('reminders-list');
    
    if (reminders.length === 0) {
        container.innerHTML = '<div class="no-data">Немає нагадувань</div>';
        return;
    }
    
    container.innerHTML = reminders.map(reminder => `
        <div class="reminder-item">
            <div>
                <strong>${reminder.title}</strong>
                <br>
                <small>${reminder.message} (${reminder.time_interval} хв)</small>
            </div>
            <button class="btn btn-danger" onclick="removeReminder(${reminder.id})">Видалити</button>
        </div>
    `).join('');
}

async function addReminder() {
    const title = document.getElementById('reminder-title').value.trim();
    const message = document.getElementById('reminder-message').value.trim();
    const type = document.getElementById('reminder-type').value;
    const interval = parseInt(document.getElementById('reminder-interval').value);
    
    if (!title || !message) {
        showNotification('Заповніть всі поля', 'error');
        return;
    }
    
    try {
        await apiCall('/reminders', {
            method: 'POST',
            body: JSON.stringify({
                title,
                message,
                type,
                time_interval: interval
            })
        });
        
        document.getElementById('reminder-title').value = '';
        document.getElementById('reminder-message').value = '';
        loadReminders();
        showNotification('Нагадування створено', 'success');
    } catch (error) {
        console.error('Error adding reminder:', error);
    }
}

async function removeReminder(reminderId) {
    try {
        await apiCall(`/reminders/${reminderId}`, {
            method: 'DELETE'
        });
        
        loadReminders();
        showNotification('Нагадування видалено', 'success');
    } catch (error) {
        console.error('Error removing reminder:', error);
    }
}

// Утилітарні функції
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function getPriorityText(priority) {
    const priorities = {
        'high': 'Високий',
        'medium': 'Середній',
        'low': 'Низький'
    };
    return priorities[priority] || priority;
}

function showNotification(message, type = 'info') {
    // Створюємо повідомлення
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Додаємо стилі
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#667eea'};
    `;
    
    document.body.appendChild(notification);
    
    // Видаляємо через 3 секунди
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function playNotificationSound() {
    // Створюємо звук сповіщення
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.play().catch(() => {
        // Ігноруємо помилки автопрокрутки
    });
}

// Додаємо CSS анімації для повідомлень
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Запуск нагадувань
setInterval(async () => {
    try {
        const reminders = await apiCall('/reminders/breaks');
        reminders.forEach(reminder => {
            showNotification(reminder.message, 'info');
            playNotificationSound();
        });
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}, 60000); // Перевіряємо кожну хвилину
