const express = require('express');
const geoip = require('geoip-lite');
const uaParser = require("ua-parser-js"); 
const { getUserRequestCount, logUserRequest } = require('../models/userRequestModel');
const { createShortUrl, getLongUrlByShortUrl } = require('../models/shortUrlModel'); 
const { logRedirectEvent }  = require("../models/redirectLogModel");
const pool = require("../db");
const authenticateUser = require("../middleware/authMiddleware");
const { redisClient } = require('../redis');



const shortenRouter = express.Router();

// Define the rate limit (max requests per hour)
const RATE_LIMIT = 10;

/**
 * @swagger
 * /api/short/shorten:
 *   post:
 *     summary: Create a short URL
 *     description: Generates a short URL from a long URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               longUrl:
 *                 type: string
 *                 example: "https://example.com"
 *               customAlias:
 *                 type: string
 *                 example: "myalias"
 *               topic:
 *                 type: string
 *                 example: "technology"
 *               userId:
 *                 type: string
 *                 example: "user123"
 *     responses:
 *       201:
 *         description: Short URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shortUrl:
 *                   type: string
 *                   example: "http://localhost:3000/abc123"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal Server Error
 */
shortenRouter.post('/shorten', async (req, res) => {
    const { longUrl, customAlias, topic, userId } = req.body;

    try {
        // Step 1: Check if the user has exceeded the rate limit
        const requestCount = await getUserRequestCount(userId);

        if (requestCount >= RATE_LIMIT) {
            return res.status(429).json({ message: 'Rate limit exceeded' });
        }

        // Step 2: Log the user request (for rate-limiting purposes)
        await logUserRequest(userId);

        // Step 3: Generate the short URL
        const shortUrlData = await createShortUrl(longUrl, customAlias, topic);

        // Step 4: Return the response with the short URL and created timestamp
        res.status(201).json({
            shortUrl: `${req.protocol}://${req.get('host')}/${shortUrlData.short_url}`,
            createdAt: shortUrlData.created_at,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/short/{short_url}:
 *   get:
 *     summary: Redirect to the original long URL from a shortened URL
 *     description: Fetches the long URL from the database using the provided short URL and redirects the user.
 *     tags: 
 *       - URL Shortener
 *     parameters:
 *       - in: path
 *         name: short_url
 *         required: true
 *         description: The short URL alias
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to the long URL
 *       404:
 *         description: Short URL not found
 *       500:
 *         description: Internal Server Error
 */
shortenRouter.get('/:short_url', async (req, res) => {
    const { short_url } = req.params;
    console.log("params", req.params);
    

    try {
        // Step 1: Get the long URL from the database based on the alias
        const longUrl = await getLongUrlByShortUrl(short_url);
        console.log('Fetched long URL:', longUrl);


        // Step 2: Log the redirect event for analytics (user agent, IP, and geolocation)
        const userAgent = req.get('User-Agent');
        const ip = req.ip; // Get the user's IP address
        const geo = geoip.lookup(ip); // Fetch geolocation based on IP

        // Log the redirect event with relevant data
        await logRedirectEvent(short_url, userAgent, ip, geo);

        // Step 3: Redirect the user to the long URL
        return res.redirect(longUrl);
    } catch (err) {
        console.error('Error fetching long URL or logging redirect event:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get URL Analytics
// shortenRouter.get("/analytics/:alias", async (req, res) => {
//     const { alias } = req.params;

//     try {
//         // Step 1: Check if the short URL exists in logs
//         const urlExists = await pool.query(
//             "SELECT COUNT(*) FROM redirect_logs WHERE alias = $1",
//             [alias]
//         );

//         if (parseInt(urlExists.rows[0].count) === 0) {
//             return res.status(404).json({ message: "Short URL not found" });
//         }

//         // Step 2: Fetch analytics data

//         // 2.1 Get Total Clicks
//         const totalClicksResult = await pool.query(
//             "SELECT COUNT(*) AS total_clicks FROM redirect_logs WHERE alias = $1",
//             [alias]
//         );
//         const totalClicks = parseInt(totalClicksResult.rows[0].total_clicks) || 0;

//         // 2.2 Get Unique Users (based on distinct IP addresses)
//         const uniqueUsersResult = await pool.query(
//             "SELECT COUNT(DISTINCT ip_address) AS unique_users FROM redirect_logs WHERE alias = $1",
//             [alias]
//         );
//         const uniqueUsers = parseInt(uniqueUsersResult.rows[0].unique_users) || 0;

//         // 2.3 Get Clicks by Date (Last 7 Days)
//         const clicksByDateResult = await pool.query(
//             `SELECT DATE(timestamp) AS date, COUNT(*) AS click_count 
//              FROM redirect_logs 
//              WHERE alias = $1 AND timestamp >= NOW() - INTERVAL '7 days' 
//              GROUP BY DATE(timestamp) 
//              ORDER BY DATE(timestamp) DESC`,
//             [alias]
//         );
//         const clicksByDate = clicksByDateResult.rows.map(row => ({
//             date: row.date,
//             clickCount: parseInt(row.click_count)
//         }));

//         // 2.4 Get Clicks by OS Type
//         const osTypeResult = await pool.query(
//             `SELECT user_agent FROM redirect_logs WHERE alias = $1`,
//             [alias]
//         );

//         const osData = {};
//         osTypeResult.rows.forEach(row => {
//             const parsedUA = uaParser(row.user_agent);
//             const osName = parsedUA.os.name || "Unknown";
//             if (!osData[osName]) {
//                 osData[osName] = { uniqueClicks: 0, uniqueUsers: new Set() };
//             }
//             osData[osName].uniqueClicks += 1;
//             osData[osName].uniqueUsers.add(row.ip_address);
//         });

//         const osType = Object.keys(osData).map(osName => ({
//             osName,
//             uniqueClicks: osData[osName].uniqueClicks,
//             uniqueUsers: osData[osName].uniqueUsers.size
//         }));

//         // 2.5 Get Clicks by Device Type
//         const deviceData = {};
//         osTypeResult.rows.forEach(row => {
//             const parsedUA = uaParser(row.user_agent);
//             const deviceType = parsedUA.device.type || "desktop";
//             if (!deviceData[deviceType]) {
//                 deviceData[deviceType] = { uniqueClicks: 0, uniqueUsers: new Set() };
//             }
//             deviceData[deviceType].uniqueClicks += 1;
//             deviceData[deviceType].uniqueUsers.add(row.ip_address);
//         });

//         const deviceType = Object.keys(deviceData).map(deviceName => ({
//             deviceName,
//             uniqueClicks: deviceData[deviceName].uniqueClicks,
//             uniqueUsers: deviceData[deviceName].uniqueUsers.size
//         }));

//         // Step 3: Return the response
//         return res.json({
//             totalClicks,
//             uniqueUsers,
//             clicksByDate,
//             osType,
//             deviceType
//         });

//     } catch (error) {
//         console.error("Error fetching analytics:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// });

/**
 * @swagger
 * /api/short/analytics/{alias}:
 *   get:
 *     summary: Get analytics for a shortened URL
 *     description: Fetches analytics data, including total clicks and unique users, for a given short URL alias.
 *     tags:
 *       - URL Shortener
 *     parameters:
 *       - in: path
 *         name: alias
 *         required: true
 *         description: The alias of the shortened URL
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: integer
 *                   example: 150
 *                 uniqueUsers:
 *                   type: integer
 *                   example: 120
 *       404:
 *         description: Alias not found
 *       500:
 *         description: Internal Server Error
 */
shortenRouter.get('/analytics/:alias', async (req, res) => {
    const { alias } = req.params;

    try {
        // Check cache
        const cachedData = await redisClient.get(`analytics:${alias}`);
        if (cachedData) {
            console.log('Serving from cache');
            return res.json(JSON.parse(cachedData));
        }

        console.log('Fetching from DB');

        const totalClicksResult = await pool.query(
            "SELECT COUNT(*) AS total_clicks FROM redirect_logs WHERE alias = $1",
            [alias]
        );
        const totalClicks = parseInt(totalClicksResult.rows[0].total_clicks) || 0;

        const uniqueUsersResult = await pool.query(
            "SELECT COUNT(DISTINCT ip_address) AS unique_users FROM redirect_logs WHERE alias = $1",
            [alias]
        );
        const uniqueUsers = parseInt(uniqueUsersResult.rows[0].unique_users) || 0;

        const analyticsData = { totalClicks, uniqueUsers };

        // Store in Redis with expiration (e.g., 5 minutes)
        await redisClient.setEx(`analytics:${alias}`, 300, JSON.stringify(analyticsData));

        return res.json(analyticsData);
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


// Get Topic-Based Analytics
// shortenRouter.get("/analytics/topic/:topic", async (req, res) => {
//     const topic = req.params.topic;

//     const query = `
//         SELECT 
//             su.short_url, 
//             COUNT(rl.id) AS totalClicks, 
//             COUNT(DISTINCT rl.ip_address) AS uniqueUsers
//         FROM short_urls su
//         JOIN redirect_logs rl ON su.short_url = rl.alias
//         WHERE su.topic = $1
//         GROUP BY su.short_url
//     `;

//     try {
//         const { rows } = await pool.query(query, [topic]);
//         res.json({
//             totalClicks: rows.reduce((sum, row) => sum + Number(row.totalclicks), 0),
//             uniqueUsers: rows.reduce((sum, row) => sum + Number(row.uniqueusers), 0),
//             urls: rows.map(row => ({
//                 shortUrl: row.short_url,
//                 totalClicks: Number(row.totalclicks),
//                 uniqueUsers: Number(row.uniqueusers),
//             }))
//         });
//     } catch (error) {
//         console.error("Error fetching topic analytics:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }

// });

/**
 * @swagger
 * /api/short/analytics/topic/{topic}:
 *   get:
 *     summary: Get analytics for a specific topic
 *     description: Fetches analytics data for all shortened URLs under a specific topic, including total clicks and unique users.
 *     tags:
 *       - URL Shortener
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         description: The topic associated with the shortened URLs
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics data for the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: integer
 *                   example: 500
 *                 uniqueUsers:
 *                   type: integer
 *                   example: 400
 *                 urls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shortUrl:
 *                         type: string
 *                         example: "abc123"
 *                       totalClicks:
 *                         type: integer
 *                         example: 100
 *                       uniqueUsers:
 *                         type: integer
 *                         example: 80
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal Server Error
 */
shortenRouter.get("/analytics/topic/:topic", async (req, res) => {
    const topic = req.params.topic;
    const cacheKey = `analytics:${topic}`;

    try {
        // Check Redis cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData)); // Return cached response
        }

        // Query database if cache is empty
        const query = `
            SELECT 
                su.short_url, 
                COUNT(rl.id) AS totalClicks, 
                COUNT(DISTINCT rl.ip_address) AS uniqueUsers
            FROM short_urls su
            JOIN redirect_logs rl ON su.short_url = rl.alias
            WHERE su.topic = $1
            GROUP BY su.short_url
        `;

        const { rows } = await pool.query(query, [topic]);

        const responseData = {
            totalClicks: rows.reduce((sum, row) => sum + Number(row.totalclicks), 0),
            uniqueUsers: rows.reduce((sum, row) => sum + Number(row.uniqueusers), 0),
            urls: rows.map(row => ({
                shortUrl: row.short_url,
                totalClicks: Number(row.totalclicks),
                uniqueUsers: Number(row.uniqueusers),
            }))
        };

        // Store result in Redis cache for 10 minutes (600 seconds)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(responseData));

        res.json(responseData);
    } catch (error) {
        console.error("Error fetching topic analytics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


/**
 * @swagger
 * /api/short/analytic/overall:
 *   get:
 *     summary: Get overall analytics for the authenticated user
 *     description: Fetches overall analytics for the authenticated user, including total URLs, clicks, unique users, and click distribution by date, OS, and device type.
 *     tags:
 *       - URL Shortener
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved overall analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUrls:
 *                   type: integer
 *                   example: 25
 *                 totalClicks:
 *                   type: integer
 *                   example: 500
 *                 uniqueUsers:
 *                   type: integer
 *                   example: 400
 *                 clicksByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2024-02-10"
 *                       click_count:
 *                         type: integer
 *                         example: 50
 *                 osType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       os_name:
 *                         type: string
 *                         example: "Windows"
 *                       unique_users:
 *                         type: integer
 *                         example: 200
 *                       unique_clicks:
 *                         type: integer
 *                         example: 300
 *                 deviceType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       device_name:
 *                         type: string
 *                         example: "Mobile"
 *                       unique_users:
 *                         type: integer
 *                         example: 150
 *                       unique_clicks:
 *                         type: integer
 *                         example: 250
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal Server Error
 */
shortenRouter.get('/analytic/overall', authenticateUser, async (req, res) => {
    try {
        const userId = req.user; // Get from JWT/session
        const cacheKey = `analytics:overall:${userId}`;

        // Check Redis cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData)); // Return cached response
        }

        // 1. Total URLs created by the user
        const { rows: totalUrlsData } = await pool.query(
            'SELECT COUNT(*) FROM short_urls WHERE user_id = $1', [userId]
        );
        const totalUrls = parseInt(totalUrlsData[0].count, 10);

        // 2. Total clicks across all URLs created by the user
        const { rows: totalClicksData } = await pool.query(
            'SELECT COUNT(*) FROM redirect_logs JOIN short_urls ON redirect_logs.alias = short_urls.short_url WHERE short_urls.user_id = $1', [userId]
        );
        const totalClicks = parseInt(totalClicksData[0].count, 10);

        // 3. Total unique users who accessed the user's URLs
        const { rows: uniqueUsersData } = await pool.query(
            'SELECT COUNT(DISTINCT user_agent) FROM redirect_logs JOIN short_urls ON redirect_logs.alias = short_urls.short_url WHERE short_urls.user_id = $1', [userId]
        );
        const uniqueUsers = parseInt(uniqueUsersData[0].count, 10);

        // 4. Clicks by date (last 7 days)
        const { rows: clicksByDateData } = await pool.query(
            'SELECT DATE(redirect_logs.timestamp) AS date, COUNT(*) AS click_count FROM redirect_logs JOIN short_urls ON redirect_logs.alias = short_urls.short_url WHERE short_urls.user_id = $1 AND redirect_logs.timestamp >= NOW() - INTERVAL \'7 days\' GROUP BY date ORDER BY date DESC', [userId]
        );

        // 5. Clicks by OS
        const { rows: osTypeData } = await pool.query(
            'SELECT CASE WHEN user_agent LIKE \'%Windows%\' THEN \'Windows\' WHEN user_agent LIKE \'%Mac%\' THEN \'macOS\' WHEN user_agent LIKE \'%Linux%\' THEN \'Linux\' WHEN user_agent LIKE \'%iPhone%\' THEN \'iOS\' WHEN user_agent LIKE \'%Android%\' THEN \'Android\' ELSE \'Other\' END AS os_name, COUNT(DISTINCT user_agent) AS unique_users, COUNT(*) AS unique_clicks FROM redirect_logs JOIN short_urls ON redirect_logs.alias = short_urls.short_url WHERE short_urls.user_id = $1 GROUP BY os_name', [userId]
        );

        // 6. Clicks by device type
        const { rows: deviceTypeData } = await pool.query(
            'SELECT CASE WHEN user_agent LIKE \'%Mobile%\' OR user_agent LIKE \'%Android%\' OR user_agent LIKE \'%iPhone%\' THEN \'Mobile\' ELSE \'Desktop\' END AS device_name, COUNT(DISTINCT user_agent) AS unique_users, COUNT(*) AS unique_clicks FROM redirect_logs JOIN short_urls ON redirect_logs.alias = short_urls.short_url WHERE short_urls.user_id = $1 GROUP BY device_name', [userId]
        );

        // Build response object
        const response = {
            totalUrls,
            totalClicks,
            uniqueUsers,
            clicksByDate: clicksByDateData,
            osType: osTypeData,
            deviceType: deviceTypeData,
        };

        // Store result in Redis cache for 10 minutes
        await redisClient.setEx(cacheKey, 600, JSON.stringify(response));

        // Return response
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching overall analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});




module.exports = shortenRouter;
