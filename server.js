const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const db = require('./config/database');

db.initDatabase();

// Routes
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/pomodoro', require('./routes/pomodoro'));
app.use('/api/time-tracking', require('./routes/timeTracking'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/blocked-sites', require('./routes/blockedSites'));
app.use('/api/reminders', require('./routes/reminders'));

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Щось пішло не так!' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на порту ${PORT}`);
    console.log(`Відкрийте http://localhost:${PORT} у браузері`);
});
