const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Отримати всі нагадування
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM reminders WHERE is_active = 1 ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання нагадувань' });
    }
});

// Створити нове нагадування
router.post('/', async (req, res) => {
    try {
        const { title, message, type, time_interval } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO reminders (title, message, type, time_interval) VALUES (?, ?, ?, ?)',
            [title, message, type, time_interval]
        );
        res.status(201).json({ id: result.insertId, message: 'Нагадування створено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка створення нагадування' });
    }
});

// Оновити нагадування
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message, type, time_interval, is_active } = req.body;
        await pool.execute(
            'UPDATE reminders SET title = ?, message = ?, type = ?, time_interval = ?, is_active = ? WHERE id = ?',
            [title, message, type, time_interval, is_active, id]
        );
        res.json({ message: 'Нагадування оновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка оновлення нагадування' });
    }
});

// Видалити нагадування
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE reminders SET is_active = 0 WHERE id = ?', [id]);
        res.json({ message: 'Нагадування видалено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка видалення нагадування' });
    }
});

// Отримати нагадування для перерв
router.get('/breaks', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM reminders WHERE type = "break" AND is_active = 1 ORDER BY time_interval'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання нагадувань про перерви' });
    }
});

module.exports = router;
