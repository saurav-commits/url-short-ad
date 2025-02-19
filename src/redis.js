const redis = require('redis');
require('dotenv').config();




const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    }
});

// Redis connection events
redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('ready', () => {
    console.log('Redis client is ready');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Check if the client is closed and reconnect if necessary
redisClient.on('end', () => {
    console.log('Redis client connection closed');
});

// Try to connect when the app starts
(async () => {
    try {
        await redisClient.connect();
        console.log("Redis client connected successfully");
    } catch (error) {
        console.error("Failed to connect to Redis:", error);
    }
})();

module.exports = { redisClient };

