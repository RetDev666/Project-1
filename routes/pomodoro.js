const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Отримати статистику Помодоро
router.get('/stats', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions,
                SUM(duration) as total_duration
            FROM pomodoro_sessions 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання статистики' });
    }
});

// Створити нову сесію Помодоро
router.post('/session', async (req, res) => {
    try {
        const { duration, task_id } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO pomodoro_sessions (duration, task_id) VALUES (?, ?)',
            [duration, task_id]
        );
        res.status(201).json({ id: result.insertId, message: 'Сесія створена' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка створення сесії' });
    }
});

// Завершити сесію Помодоро
router.put('/session/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE pomodoro_sessions SET completed = 1 WHERE id = ?', [id]);
        res.json({ message: 'Сесія завершена' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка завершення сесії' });
    }
});

// Отримати історію сесій
router.get('/history', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT ps.*, t.title as task_title 
            FROM pomodoro_sessions ps 
            LEFT JOIN tasks t ON ps.task_id = t.id 
            ORDER BY ps.created_at DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання історії' });
    }
});

module.exports = router;
