const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Отримати всі завдання
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Помилка отримання завдань:', error);
        res.status(500).json({ error: 'Помилка отримання завдань' });
    }
});

// Створити нове завдання (виправлена версія)
router.post('/', async (req, res) => {
    try {
        console.log('Received data:', req.body); // Лог для діагностики

        const { title, description, priority, deadline } = req.body;

        // Перевірка обов'язкових полів
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Назва завдання є обов\'язковою' });
        }

        // Перевірка підключення до бази
        const connection = await pool.getConnection();
        console.log('Database connection successful');

        const [result] = await connection.execute(
            'INSERT INTO tasks (title, description, priority, deadline) VALUES (?, ?, ?, ?)',
            [
                title.trim(),
                description || null,
                priority || 'medium',
                deadline || null
            ]
        );

        connection.release();
        console.log('Task created with ID:', result.insertId);

        res.status(201).json({
            id: result.insertId,
            message: 'Завдання створено',
            title: title.trim()
        });

    } catch (error) {
        console.error('Детальна помилка створення завдання:', error);
        res.status(500).json({
            error: 'Помилка створення завдання',
            details: error.message
        });
    }
});

// Оновити завдання
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('PUT request for task ID:', id);
        console.log('Request body:', req.body);

        // Перевіряємо, чи завдання існує
        const [existingTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        if (existingTask.length === 0) {
            return res.status(404).json({ error: 'Завдання не знайдено' });
        }

        // Якщо оновлюємо тільки статус (для кнопки "Завершити")
        if (req.body.status && Object.keys(req.body).length === 1) {
            console.log('Updating only status to:', req.body.status);

            await pool.execute(
                'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [req.body.status, id]
            );
        } else {
            // Повне оновлення завдання (редагування)
            const { title, description, priority, deadline, status } = req.body;

            console.log('Full update with:', { title, description, priority, deadline, status });

            if (!title || title.trim() === '') {
                return res.status(400).json({ error: 'Назва завдання є обов\'язковою' });
            }

            // Конвертуємо дату в правильний формат для MySQL
            let mysqlDeadline = null;
            if (deadline) {
                const date = new Date(deadline);
                if (!isNaN(date.getTime())) {
                    // Форматуємо дату як YYYY-MM-DD HH:MM:SS
                    mysqlDeadline = date.toISOString().slice(0, 19).replace('T', ' ');
                }
            }

            console.log('Converted deadline:', mysqlDeadline);

            await pool.execute(
                'UPDATE tasks SET title = ?, description = ?, priority = ?, deadline = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [title.trim(), description || null, priority || 'medium', mysqlDeadline, status || 'pending', id]
            );
        }

        // Отримуємо оновлене завдання
        const [updatedTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        console.log('Task updated successfully');

        res.json({
            message: 'Завдання оновлено',
            task: updatedTask[0]
        });
    } catch (error) {
        console.error('Детальна помилка оновлення завдання:', error);
        res.status(500).json({
            error: 'Помилка оновлення завдання',
            details: error.message
        });
    }
});

// Видалити завдання
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Завдання видалено' });
    } catch (error) {
        console.error('Помилка видалення завдання:', error);
        res.status(500).json({ error: 'Помилка видалення завдання' });
    }
});

module.exports = router;