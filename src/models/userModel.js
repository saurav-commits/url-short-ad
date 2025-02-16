const pool = require('../db'); // PostgreSQL connection pool

// Check if the user exists in the users table
const checkAndCreateUser = async (userId) => {
    try {
        const query = 'SELECT * FROM users WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        
        if (result.rowCount === 0) {
            // If the user doesn't exist, insert the user into the table
            const insertQuery = 'INSERT INTO users (user_id) VALUES ($1) RETURNING *';
            await pool.query(insertQuery, [userId]);
        }
    } catch (err) {
        console.error('Error checking or creating user:', err);
        throw err;
    }
};

// Get the count of requests made by a user in the last hour
const getUserRequestCount = async (userId) => {
    try {
        const query = `
            SELECT COUNT(*) 
            FROM user_requests 
            WHERE user_id = $1 
            AND created_at > NOW() - INTERVAL '1 hour';
        `;
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count, 10); // Return the count as an integer
    } catch (err) {
        console.error('Error fetching user request count:', err);
        throw err;
    }
};

// Record a new user request
const recordUserRequest = async (userId) => {
    try {
        const query = `
            INSERT INTO user_requests (user_id) 
            VALUES ($1);
        `;
        await pool.query(query, [userId]);
    } catch (err) {
        console.error('Error recording user request:', err);
        throw err;
    }
};

module.exports = { checkAndCreateUser, getUserRequestCount, recordUserRequest };
