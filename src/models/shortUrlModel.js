const pool = require('../db');  // Import the PostgreSQL connection
const { redisClient } = require('../redis');

// Create a new short URL
// const createShortUrl = async (longUrl, customAlias = null, topic = null) => {
//     try {
//         const shortUrl = customAlias || generateShortUrl();  // If no custom alias, generate a random one
//         const query = `
//             INSERT INTO short_urls (long_url, short_url, custom_alias, topic)
//             VALUES ($1, $2, $3, $4) 
//             RETURNING *;
//         `;
//         const values = [longUrl, shortUrl, customAlias, topic];
//         const result = await pool.query(query, values);
//         return result.rows[0]; // Return the newly created short URL record
//     } catch (err) {
//         console.error('Error creating short URL:', err);
//         throw err;
//     }
// };

const createShortUrl = async (longUrl, customAlias = null, topic = null) => {
    try {
        let shortUrl = customAlias || generateShortUrl();

        // Step 1: Check if custom alias already exists (case-insensitive)
        if (customAlias) {
            const checkCustomAliasQuery = 'SELECT 1 FROM short_urls WHERE LOWER(short_url) = LOWER($1)';
            const checkCustomAliasResult = await pool.query(checkCustomAliasQuery, [customAlias]);

            if (checkCustomAliasResult.rows.length > 0) {
                throw new Error('Custom alias already exists. Please choose another one.');
            }
        }

        // Step 2: Ensure the randomly generated short URL is unique
        if (!customAlias) {
            let isUnique = false;
            while (!isUnique) {
                const checkGeneratedUrlQuery = 'SELECT 1 FROM short_urls WHERE short_url = $1';
                const checkGeneratedUrlResult = await pool.query(checkGeneratedUrlQuery, [shortUrl]);

                if (checkGeneratedUrlResult.rows.length === 0) {
                    isUnique = true;
                } else {
                    shortUrl = generateShortUrl(); // Regenerate until unique
                }
            }
        }

        // Step 3: Insert using a transaction to prevent race conditions
        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Start transaction

            const insertQuery = `
                INSERT INTO short_urls (long_url, short_url, custom_alias, topic)
                VALUES ($1, $2, $3, $4) 
                RETURNING *;
            `;
            const values = [longUrl, shortUrl, customAlias, topic];
            const result = await client.query(insertQuery, values);

            await client.query('COMMIT'); // Commit transaction

            // Step 4: Store in Redis with expiration time
            await redisClient.set(shortUrl, longUrl, {
                EX: 3600, // Expire after 1 hour
            });

            return result.rows[0];
        } catch (dbError) {
            await client.query('ROLLBACK'); // Rollback if insert fails
            throw dbError;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error creating short URL:', err.message);
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
