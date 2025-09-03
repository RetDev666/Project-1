const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Отримати список заблокованих сайтів
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM blocked_sites WHERE is_active = 1 ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання заблокованих сайтів' });
    }
});

// Додати новий заблокований сайт
router.post('/', async (req, res) => {
    try {
        const { url } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO blocked_sites (url) VALUES (?)',
            [url]
        );
        res.status(201).json({ id: result.insertId, message: 'Сайт заблоковано' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка блокування сайту' });
    }
});

// Видалити заблокований сайт
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE blocked_sites SET is_active = 0 WHERE id = ?', [id]);
        res.json({ message: 'Сайт розблоковано' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка розблокування сайту' });
    }
});

// Перевірити чи сайт заблокований
router.post('/check', async (req, res) => {
    try {
        const { url } = req.body;
        const [rows] = await pool.execute(
            'SELECT * FROM blocked_sites WHERE url = ? AND is_active = 1',
            [url]
        );
        res.json({ blocked: rows.length > 0 });
    } catch (error) {
        res.status(500).json({ error: 'Помилка перевірки сайту' });
    }
});

module.exports = router;
