const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Отримати аналітику продуктивності
router.get('/productivity', async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        let interval;

        switch(period) {
            case 'day': interval = '1 DAY'; break;
            case 'week': interval = '7 DAY'; break;
            case 'month': interval = '30 DAY'; break;
            default: interval = '7 DAY';
        }

        console.log('Getting productivity data for period:', period, 'interval:', interval);

        const [rows] = await pool.execute(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                ROUND((SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as completion_rate
            FROM tasks
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        console.log('Productivity data:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Error getting productivity analytics:', error);
        res.status(500).json({ error: 'Помилка отримання аналітики' });
    }
});

// Отримати статистику використання часу
router.get('/time-usage', async (req, res) => {
    try {
        console.log('Getting time usage data');

        const [rows] = await pool.execute(`
            SELECT
                activity_name,
                SUM(duration_minutes) as total_minutes,
                COUNT(*) as sessions_count
            FROM time_tracking
            WHERE end_time IS NOT NULL
              AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY activity_name
            ORDER BY total_minutes DESC
        `);

        console.log('Time usage data:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Error getting time usage analytics:', error);
        res.status(500).json({ error: 'Помилка отримання статистики часу' });
    }
});

// Отримати загальну статистику
router.get('/overview', async (req, res) => {
    try {
        console.log('Getting overview statistics');

        const [tasks] = await pool.execute(`
            SELECT
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
            FROM tasks
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        const [pomodoro] = await pool.execute(`
            SELECT
                COUNT(*) as total_sessions,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions,
                SUM(duration) as total_duration
            FROM pomodoro_sessions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        const [timeTracking] = await pool.execute(`
            SELECT
                COUNT(*) as total_sessions,
                SUM(duration_minutes) as total_minutes
            FROM time_tracking
            WHERE end_time IS NOT NULL
              AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        const result = {
            tasks: tasks[0],
            pomodoro: pomodoro[0],
            timeTracking: timeTracking[0]
        };

        console.log('Overview statistics:', result);
        res.json(result);
    } catch (error) {
        console.error('Error getting overview analytics:', error);
        res.status(500).json({ error: 'Помилка отримання загальної статистики' });
    }
});

module.exports = router;