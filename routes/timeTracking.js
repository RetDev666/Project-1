const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Почати трекінг часу
router.post('/start', async (req, res) => {
    try {
        const { activity_name } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO time_tracking (activity_name, start_time) VALUES (?, NOW())',
            [activity_name]
        );
        res.status(201).json({ id: result.insertId, message: 'Трекінг часу розпочато' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка запуску трекінгу' });
    }
});

// Зупинити трекінг часу
router.put('/stop/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute(
            'UPDATE time_tracking SET end_time = NOW(), duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NOW()) WHERE id = ?',
            [id]
        );
        res.json({ message: 'Трекінг часу зупинено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка зупинки трекінгу' });
    }
});

// Отримати активні трекінги
router.get('/active', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM time_tracking WHERE end_time IS NULL ORDER BY start_time DESC'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання активних трекінгів' });
    }
});

// Отримати історію трекінгу
router.get('/history', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM time_tracking WHERE end_time IS NOT NULL ORDER BY start_time DESC LIMIT 100'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання історії' });
    }
});

module.exports = router;
