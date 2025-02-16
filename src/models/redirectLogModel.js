const pool = require('../db'); // PostgreSQL connection pool

// Log a redirect event
const logRedirectEvent = async (alias, userAgent, ip, geo) => {
    try {
        const query = `
            INSERT INTO redirect_logs (alias, user_agent, ip_address, geolocation, timestamp)
            VALUES ($1, $2, $3, $4, NOW()) RETURNING *;
        `;
        const values = [alias, userAgent, ip, JSON.stringify(geo)];
        const result = await pool.query(query, values);
        return result.rows[0]; // Return the logged event
    } catch (err) {
        console.error('Error logging redirect event:', err);
        throw err;
    }
};

module.exports = { logRedirectEvent };
