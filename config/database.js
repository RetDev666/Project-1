const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'StZubko',
    password: process.env.DB_PASSWORD || 'Zubko258013',
    database: process.env.DB_NAME || 'time_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database tables
async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create tasks table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
                deadline DATETIME,
                status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create pomodoro_sessions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pomodoro_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                duration INT NOT NULL,
                task_id INT,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
            )
        `);

        // Create time_tracking table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS time_tracking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                activity_name VARCHAR(255) NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                duration_minutes INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create blocked_sites table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS blocked_sites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url VARCHAR(255) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create reminders table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS reminders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type ENUM('break', 'exercise', 'custom') DEFAULT 'custom',
                time_interval INT DEFAULT 30,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('База даних успішно ініціалізована');
    } catch (error) {
        console.error('Помилка ініціалізації бази даних:', error);
    }
}

module.exports = { pool, initDatabase };
