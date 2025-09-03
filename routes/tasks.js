const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Отримати всі завдання
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання завдань' });
    }
});

// Створити нове завдання
router.post('/', async (req, res) => {
    try {
        const { title, description, priority, deadline } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO tasks (title, description, priority, deadline) VALUES (?, ?, ?, ?)',
            [title, description, priority, deadline]
        );
        res.status(201).json({ id: result.insertId, message: 'Завдання створено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка створення завдання' });
    }
});

// Оновити завдання
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, deadline, status } = req.body;
        await pool.execute(
            'UPDATE tasks SET title = ?, description = ?, priority = ?, deadline = ?, status = ? WHERE id = ?',
            [title, description, priority, deadline, status, id]
        );
        res.json({ message: 'Завдання оновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка оновлення завдання' });
    }
});

// Видалити завдання
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Завдання видалено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка видалення завдання' });
    }
});

module.exports = router;
