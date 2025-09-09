// Глобальні змінні
let currentTab = 'dashboard';
let pomodoroTimer = null;
let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60;
let pomodoroMode = 'work';
let pomodoroSessions = 0;
let currentDate = new Date();
let selectedDate = new Date();
let tasks = [];
let events = [];
let settings = {
    name: 'Сара Іванова',
    email: 'sara.ivanova@email.com',
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    soundEnabled: true,
    pushEnabled: true,
    theme: 'light'
};
let analytics = {
    totalTasks: 0,
    completedTasks: 0,
    pomodoroSessions: 0,
    currentStreak: 0
};

// Ініціалізація додатку
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    loadDataFromStorage();
    setupEventListeners();
    updateTimerDisplay();
    generateCalendar();
    updateAnalytics();
    updateProfileStats();
    console.log('App initialized successfully');
}

// Налаштування обробників подій
function setupEventListeners() {
    // Навігація
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // Кнопки додавання
    document.getElementById('add-task-mobile')?.addEventListener('click', () => openModal('task-modal'));
    document.getElementById('add-event-btn')?.addEventListener('click', () => openModal('event-modal'));

    // Форми
    document.getElementById('task-form')?.addEventListener('submit', handleTaskSubmit);
    document.getElementById('event-form')?.addEventListener('submit', handleEventSubmit);

    // Помодоро
    document.getElementById('pause-btn')?.addEventListener('click', togglePomodoro);
    document.getElementById('cancel-btn')?.addEventListener('click', resetPomodoro);

    // Календар
    document.getElementById('prev-month')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month')?.addEventListener('click', () => changeMonth(1));

    // Профіль
    document.querySelectorAll('.profile-menu-item').forEach(item => {
        item.addEventListener('click', () => handleProfileAction(item.dataset.action));
    });

    // Аналітика
    document.getElementById('chart-period')?.addEventListener('change', updateChartsData);

    // Чекбокси та пошук
    document.addEventListener('click', handleTaskCheckbox);
    document.getElementById('search-tasks')?.addEventListener('input', handleSearch);

    // Закриття модалок
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    console.log('Event listeners set up');
}

// Переключення вкладок
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    updateBottomNav(tabName);
    currentTab = tabName;

    switch(tabName) {
        case 'dashboard':
            updateTimerDisplay();
            break;
        case 'tasks':
            displayAllTasks();
            break;
        case 'calendar':
            generateCalendar();
            updateSelectedDateEvents();
            break;
        case 'analytics':
            updateAnalytics();
            createCharts();
            break;
        case 'profile':
            updateProfileStats();
            break;
    }
}

function updateBottomNav(activeTab) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === activeTab) {
            item.classList.add('active');
        }
    });
}

// Завдання
function handleTaskSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const time = document.getElementById('task-time').value;
    const priority = document.getElementById('task-priority').value;

    if (!title) {
        showNotification('Введіть назву завдання', 'error');
        return;
    }

    const newTask = {
        id: Date.now(),
        title: title,
        description: description,
        time: time,
        priority: priority,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks.push(newTask);
    saveDataToStorage();
    addTaskToDOM(newTask);

    closeModal('task-modal');
    e.target.reset();

    updateAnalytics();
    showNotification('Завдання створено! ✅', 'success');
}

function addTaskToDOM(task) {
    const taskLists = [
        document.getElementById('today-task-list'),
        document.getElementById('all-tasks-list')
    ];

    const taskHTML = `
        <div class="task-item-mobile" data-task-id="${task.id}">
            <div class="task-checkbox ${task.completed ? 'completed' : ''}">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-name ${task.completed ? 'completed' : ''}">${task.title}</div>
                <div class="task-time">
                    <i class="far fa-clock"></i> ${task.time || 'Без часу'}
                </div>
            </div>
        </div>
    `;

    taskLists.forEach(list => {
        if (list) {
            list.insertAdjacentHTML('afterbegin', taskHTML);
        }
    });
}

function handleTaskCheckbox(e) {
    if (e.target.closest('.task-checkbox')) {
        const checkbox = e.target.closest('.task-checkbox');
        const taskItem = checkbox.closest('.task-item-mobile');
        const taskId = parseInt(taskItem.dataset.taskId);
        const taskName = taskItem.querySelector('.task-name');

        checkbox.classList.toggle('completed');
        taskName.classList.toggle('completed');

        // Оновлюємо дані
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = checkbox.classList.contains('completed');
            task.completedAt = task.completed ? new Date().toISOString() : null;
        }

        if (checkbox.classList.contains('completed')) {
            checkbox.innerHTML = '<i class="fas fa-check"></i>';
            showNotification('Завдання виконано! 🎉', 'success');
        } else {
            checkbox.innerHTML = '';
            showNotification('Завдання повернуто в роботу', 'info');
        }

        saveDataToStorage();
        updateAnalytics();
    }
}

function displayAllTasks() {
    const taskList = document.getElementById('all-tasks-list');
    if (!taskList || tasks.length === 0) return;

    taskList.innerHTML = tasks.map(task => `
        <div class="task-item-mobile" data-task-id="${task.id}">
            <div class="task-checkbox ${task.completed ? 'completed' : ''}">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-name ${task.completed ? 'completed' : ''}">${task.title}</div>
                <div class="task-time">
                    <i class="far fa-clock"></i> ${task.time || 'Без часу'}
                </div>
            </div>
        </div>
    `).join('');
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const taskItems = document.querySelectorAll('#all-tasks-list .task-item-mobile');

    taskItems.forEach(item => {
        const taskName = item.querySelector('.task-name').textContent.toLowerCase();
        const isVisible = taskName.includes(searchTerm);
        item.style.display = isVisible ? 'flex' : 'none';
    });
}

// Події календаря
function handleEventSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const duration = parseInt(document.getElementById('event-duration').value);
    const description = document.getElementById('event-description').value.trim();

    if (!title || !date || !time) {
        showNotification('Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    const newEvent = {
        id: Date.now(),
        title: title,
        date: date,
        time: time,
        duration: duration,
        description: description,
        createdAt: new Date().toISOString()
    };

    events.push(newEvent);
    saveDataToStorage();

    closeModal('event-modal');
    e.target.reset();

    generateCalendar();
    updateSelectedDateEvents();
    showNotification('Подія створена! 📅', 'success');
}

function deleteEvent(button) {
    const eventItem = button.closest('.event-item');
    const eventTitle = eventItem.querySelector('.event-title').textContent;

    if (confirm(`Видалити подію "${eventTitle}"?`)) {
        const eventIndex = events.findIndex(e => e.title === eventTitle);
        if (eventIndex > -1) {
            events.splice(eventIndex, 1);
            saveDataToStorage();
            updateSelectedDateEvents();
            showNotification('Подію видалено', 'info');
        }
    }
}

// Календар
function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');

    if (!calendarGrid || !currentMonthEl) return;

    const monthNames = [
        'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
        'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];

    currentMonthEl.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Очищуємо календар
    const dayHeaders = calendarGrid.querySelectorAll('.calendar-day-header');
    calendarGrid.innerHTML = '';
    dayHeaders.forEach(header => calendarGrid.appendChild(header));

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const today = new Date();

    // Попередній місяць
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        const prevMonthDay = new Date(firstDay);
        prevMonthDay.setDate(prevMonthDay.getDate() - (startDay - i));
        dayEl.textContent = prevMonthDay.getDate();
        calendarGrid.appendChild(dayEl);
    }

    // Поточний місяць
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = currentDayDate.toISOString().split('T')[0];

        if (currentDayDate.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        if (currentDayDate.toDateString() === selectedDate.toDateString()) {
            dayEl.classList.add('selected');
        }

        // Перевіряємо наявність подій
        const hasEvents = events.some(event => event.date === dateString);
        if (hasEvents) {
            dayEl.classList.add('has-tasks');
        }

        dayEl.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
            dayEl.classList.add('selected');
            selectedDate = new Date(currentDayDate);
            updateSelectedDateEvents();
        });

        calendarGrid.appendChild(dayEl);
    }

    // Наступний місяць
    const totalCells = 42;
    const remainingCells = totalCells - calendarGrid.children.length + 7;

    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarGrid.appendChild(dayEl);
    }
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    generateCalendar();
}

function updateSelectedDateEvents() {
    const selectedDateEl = document.getElementById('selected-date');
    const dayEventsEl = document.getElementById('day-events');

    if (selectedDateEl) {
        const options = { day: 'numeric', month: 'long' };
        selectedDateEl.textContent = selectedDate.toLocaleDateString('uk-UA', options);
    }

    if (dayEventsEl) {
        const dateString = selectedDate.toISOString().split('T')[0];
        const dayEvents = events.filter(event => event.date === dateString);

        if (dayEvents.length === 0) {
            dayEventsEl.innerHTML = '<div class="no-data">Немає подій на цей день</div>';
            return;
        }

        dayEventsEl.innerHTML = dayEvents.map(event => `
            <div class="event-item">
                <div class="event-time">${event.time}</div>
                <div class="event-title">${event.title}</div>
                <button class="event-delete" onclick="deleteEvent(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // Встановлюємо дату в формі
    const eventDateInput = document.getElementById('event-date');
    if (eventDateInput) {
        eventDateInput.value = selectedDate.toISOString().split('T')[0];
    }
}

// Помодоро
function togglePomodoro() {
    const pauseBtn = document.getElementById('pause-btn');

    if (pomodoroTimer) {
        clearInterval(pomodoroInterval);
        pomodoroTimer = null;
        pomodoroInterval = null;
        pauseBtn.textContent = 'Продовжити';
        showNotification('Таймер призупинено', 'info');
    } else {
        pomodoroTimer = Date.now();
        pomodoroInterval = setInterval(updatePomodoroTimer, 1000);
        pauseBtn.textContent = 'Пауза';
        showNotification('Помодоро сесія розпочата! 🍅', 'success');
    }
}

function resetPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroTimer = null;
    pomodoroInterval = null;
    pomodoroTimeLeft = settings.workDuration * 60;
    pomodoroMode = 'work';

    updateTimerDisplay();
    document.getElementById('pause-btn').textContent = 'Пауза';
    showNotification('Таймер скинуто', 'info');
}

function updatePomodoroTimer() {
    if (pomodoroTimeLeft <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroTimer = null;
        pomodoroInterval = null;

        pomodoroSessions++;
        analytics.pomodoroSessions++;

        showNotification('Помодоро сесія завершена! 🎉', 'success');
        playNotificationSound();

        if (pomodoroMode === 'work') {
            pomodoroMode = pomodoroSessions % 4 === 0 ? 'longBreak' : 'break';
            pomodoroTimeLeft = pomodoroMode === 'longBreak' ? settings.longBreak * 60 : settings.shortBreak * 60;
        } else {
            pomodoroMode = 'work';
            pomodoroTimeLeft = settings.workDuration * 60;
        }

        saveDataToStorage();
        updateAnalytics();
        updateTimerDisplay();
        document.getElementById('pause-btn').textContent = 'Пауза';
        return;
    }

    pomodoroTimeLeft--;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const hours = Math.floor(pomodoroTimeLeft / 3600);
    const minutes = Math.floor((pomodoroTimeLeft % 3600) / 60);
    const seconds = pomodoroTimeLeft % 60;

    const timerHours = document.getElementById('timer-hours');
    const timerMinutes = document.getElementById('timer-minutes');
    const timerSeconds = document.getElementById('timer-seconds');

    if (timerHours) timerHours.textContent = hours.toString().padStart(2, '0');
    if (timerMinutes) timerMinutes.textContent = minutes.toString().padStart(2, '0');
    if (timerSeconds) timerSeconds.textContent = seconds.toString().padStart(2, '0');

    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator) {
        const modeText = pomodoroMode === 'work' ? 'Locked In Mode' :
            pomodoroMode === 'break' ? 'Break Time' : 'Long Break';
        modeIndicator.textContent = modeText;
    }
}

// Аналітика
function updateAnalytics() {
    analytics.totalTasks = tasks.length;
    analytics.completedTasks = tasks.filter(t => t.completed).length;
    analytics.currentStreak = calculateStreak();

    // Оновлюємо відображення
    document.getElementById('total-tasks-stat').textContent = analytics.totalTasks;
    document.getElementById('completed-tasks-stat').textContent = analytics.completedTasks;
    document.getElementById('pomodoro-sessions-stat').textContent = analytics.pomodoroSessions;
    document.getElementById('streak-stat').textContent = analytics.currentStreak;

    updateWeeklyProgress();
}

function calculateStreak() {
    // Простий розрахунок streak - можна ускладнити
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const dayTasks = tasks.filter(task =>
            task.completedAt && task.completedAt.startsWith(dateString)
        );

        if (dayTasks.length > 0) {
            streak++;
        } else if (i === 0) {
            break;
        } else {
            break;
        }
    }

    return streak;
}

function updateWeeklyProgress() {
    const progressGrid = document.getElementById('weekly-progress');
    if (!progressGrid) return;

    const today = new Date();
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

    let html = '';
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const dayTasks = tasks.filter(task =>
            task.completedAt && task.completedAt.startsWith(dateString)
        );

        const isCompleted = dayTasks.length > 0;

        html += `
            <div class="progress-day ${isCompleted ? 'completed' : ''}">
                <div class="progress-day-name">${weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                <div class="progress-day-value">${dayTasks.length}</div>
            </div>
        `;
    }

    progressGrid.innerHTML = html;
}

function createCharts() {
    createTasksChart();
    createProductivityChart();
    createTasksDistributionChart();
    createPomodoroChart();
}

function createTasksChart() {
    const ctx = document.getElementById('tasks-analytics-chart');
    if (!ctx) return;

    const chart = ctx.getContext('2d');

    // Генеруємо дані за останні 7 днів
    const today = new Date();
    const labels = [];
    const completedData = [];
    const totalData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        labels.push(date.toLocaleDateString('uk-UA', { weekday: 'short' }));

        const dayTasks = tasks.filter(task =>
            task.createdAt.startsWith(dateString)
        );
        const completedTasks = dayTasks.filter(task => task.completed);

        totalData.push(dayTasks.length);
        completedData.push(completedTasks.length);
    }

    new Chart(chart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Виконано',
                data: completedData,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Створено',
                data: totalData,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createProductivityChart() {
    const ctx = document.getElementById('productivity-chart');
    if (!ctx) return;

    const chart = ctx.getContext('2d');

    // Дані продуктивності по годинах (заглушка)
    const hourlyData = new Array(24).fill(0);

    tasks.filter(t => t.completedAt).forEach(task => {
        const hour = new Date(task.completedAt).getHours();
        hourlyData[hour]++;
    });

    new Chart(chart, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Завершені завдання',
                data: hourlyData,
                backgroundColor: '#4CAF50',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createTasksDistributionChart() {
    const ctx = document.getElementById('tasks-distribution-chart');
    if (!ctx) return;

    const chart = ctx.getContext('2d');

    const priorities = {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
    };

    new Chart(chart, {
        type: 'doughnut',
        data: {
            labels: ['Високий', 'Середній', 'Низький'],
            datasets: [{
                data: [priorities.high, priorities.medium, priorities.low],
                backgroundColor: ['#f44336', '#ff9800', '#4CAF50'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createPomodoroChart() {
    const ctx = document.getElementById('pomodoro-analytics-chart');
    if (!ctx) return;

    const chart = ctx.getContext('2d');

    // Дані за останні 7 днів
    const today = new Date();
    const labels = [];
    const pomodoroData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('uk-UA', { weekday: 'short' }));

        // Заглушка для Помодоро сесій
        pomodoroData.push(Math.floor(Math.random() * 8));
    }

    new Chart(chart, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Сесії Помодоро',
                data: pomodoroData,
                backgroundColor: '#ff6b6b',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updateChartsData() {
    // Оновлення даних графіків при зміні періоду
    createCharts();
}

// Профіль
function updateProfileStats() {
    document.getElementById('profile-tasks-count').textContent = analytics.totalTasks;
    document.getElementById('profile-pomodoro-count').textContent = analytics.pomodoroSessions;
    document.getElementById('profile-streak-count').textContent = analytics.currentStreak;

    document.getElementById('profile-name').textContent = settings.name;
    document.getElementById('profile-email').textContent = settings.email;
}

function handleProfileAction(action) {
    switch(action) {
        case 'settings':
            openSettingsModal();
            break;
        case 'notifications':
            showNotifications();
            break;
        case 'theme':
            showThemeSelector();
            break;
        case 'backup':
            createBackup();
            break;
        case 'export':
            exportData();
            break;
        case 'help':
            showHelp();
            break;
        case 'logout':
            handleLogout();
            break;
    }
}

function openSettingsModal() {
    // Заповнюємо поля поточними налаштуваннями
    document.getElementById('settings-name').value = settings.name;
    document.getElementById('settings-email').value = settings.email;
    document.getElementById('settings-work-duration').value = settings.workDuration;
    document.getElementById('settings-short-break').value = settings.shortBreak;
    document.getElementById('settings-long-break').value = settings.longBreak;
    document.getElementById('settings-sound').checked = settings.soundEnabled;
    document.getElementById('settings-push').checked = settings.pushEnabled;

    openModal('settings-modal');
}

function saveSettings() {
    settings.name = document.getElementById('settings-name').value;
    settings.email = document.getElementById('settings-email').value;
    settings.workDuration = parseInt(document.getElementById('settings-work-duration').value);
    settings.shortBreak = parseInt(document.getElementById('settings-short-break').value);
    settings.longBreak = parseInt(document.getElementById('settings-long-break').value);
    settings.soundEnabled = document.getElementById('settings-sound').checked;
    settings.pushEnabled = document.getElementById('settings-push').checked;

    saveDataToStorage();
    updateProfileStats();
    closeModal('settings-modal');
    showNotification('Налаштування збережено! ⚙️', 'success');
}

function showNotifications() {
    showNotification('Сповіщення: У вас 3 нових повідомлення', 'info');
}

function showThemeSelector() {
    showNotification('Зміна теми в розробці 🎨', 'info');
}

function createBackup() {
    const backup = {
        tasks: tasks,
        events: events,
        settings: settings,
        analytics: analytics,
        timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `time-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    showNotification('Резервну копію створено! 💾', 'success');
}

function exportData() {
    const exportData = {
        tasks: tasks,
        events: events,
        totalTasks: analytics.totalTasks,
        completedTasks: analytics.completedTasks,
        pomodoroSessions: analytics.pomodoroSessions,
        currentStreak: analytics.currentStreak,
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'time-manager-data.json';
    link.click();

    showNotification('Дані експортовано! 📁', 'success');
}

function showHelp() {
    showNotification('Довідка: Використовуйте завдання, календар та Помодоро для продуктивності! 💡', 'info');
}

function handleLogout() {
    if (confirm('Ви впевнені, що хочете вийти? Всі дані будуть збережені.')) {
        showNotification('До побачення! 👋', 'info');
    }
}

// Збереження та завантаження даних
function saveDataToStorage() {
    const data = {
        tasks: tasks,
        events: events,
        settings: settings,
        analytics: analytics,
        pomodoroSessions: pomodoroSessions
    };

    localStorage.setItem('timeManagerData', JSON.stringify(data));
}

function loadDataFromStorage() {
    const savedData = localStorage.getItem('timeManagerData');
    if (savedData) {
        const data = JSON.parse(savedData);
        tasks = data.tasks || [];
        events = data.events || [];
        settings = { ...settings, ...data.settings };
        analytics = { ...analytics, ...data.analytics };
        pomodoroSessions = data.pomodoroSessions || 0;
    }
}

// Утилітарні функції
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; margin-left: 12px;">×</button>
        </div>
    `;

    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 12px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        background: ${colors[type] || colors.info};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

function playNotificationSound() {
    if (!settings.soundEnabled) return;

    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.play().catch(() => {
            console.log('Audio play failed');
        });
    } catch (error) {
        console.log('Audio creation failed');
    }
}

// CSS анімації
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

console.log('Script loaded successfully');