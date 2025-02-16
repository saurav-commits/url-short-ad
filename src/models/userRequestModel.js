const pool = require('../db');  // Import the PostgreSQL connection

// Log a new request by a user
const logUserRequest = async (userId) => {
    try {
        const query = `
            INSERT INTO user_requests (user_id)
            VALUES ($1)
            RETURNING *;
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0]; // Return the newly logged user request
    } catch (err) {
        console.error('Error logging user request:', err);
        throw err;
    }
};

// Get the number of requests made by a user in the last hour
const getUserRequestCount = async (userId) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);  // 1 hour ago
        const query = `
            SELECT COUNT(*) FROM user_requests 
            WHERE user_id = $1 AND created_at > $2;
        `;
        const result = await pool.query(query, [userId, oneHourAgo]);
        return parseInt(result.rows[0].count, 10);  // Return the count of requests
    } catch (err) {
        console.error('Error fetching user request count:', err);
        throw err;
    }
};


module.exports = { logUserRequest, getUserRequestCount };
