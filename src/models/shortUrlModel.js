const pool = require('../db');  // Import the PostgreSQL connection

// Create a new short URL
const createShortUrl = async (longUrl, customAlias = null, topic = null) => {
    try {
        const shortUrl = customAlias || generateShortUrl();  // If no custom alias, generate a random one
        const query = `
            INSERT INTO short_urls (long_url, short_url, custom_alias, topic)
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const values = [longUrl, shortUrl, customAlias, topic];
        const result = await pool.query(query, values);
        return result.rows[0]; // Return the newly created short URL record
    } catch (err) {
        console.error('Error creating short URL:', err);
        throw err;
    }
};

// Generate a random short URL (you can replace this with your custom logic)
const generateShortUrl = () => {
    return Math.random().toString(36).substring(2, 8);  // Generates a random 6-character string
};

// Fetch the original URL by short URL
const getLongUrlByShortUrl = async (shortUrl) => {
    try {
        const query = 'SELECT long_url FROM short_urls WHERE short_url = $1';
        const result = await pool.query(query, [shortUrl]);
        // console.log("result", result);
        
        if (result.rows.length === 0) {
            throw new Error('Short URL not found');
        }
        return result.rows[0].long_url;
    } catch (err) {
        console.error('Error fetching long URL:', err);
        throw err;
    }
};

// Export the functions to use in your controllers
module.exports = { createShortUrl, getLongUrlByShortUrl };
