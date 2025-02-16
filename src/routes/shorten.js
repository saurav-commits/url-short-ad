const express = require('express');
const geoip = require('geoip-lite');
const { getUserRequestCount, logUserRequest } = require('../models/userRequestModel');
const { createShortUrl, getLongUrlByShortUrl } = require('../models/shortUrlModel'); 
const { logRedirectEvent }  = require("../models/redirectLogModel");


const shortenRouter = express.Router();

// Define the rate limit (max requests per hour)
const RATE_LIMIT = 10;

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


module.exports = shortenRouter;
