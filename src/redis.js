// const redis = require('redis');
// require('dotenv').config();

// // Ensure necessary environment variables are set
// if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
//     console.error('Error: Redis host and port are required.');
//     process.exit(1);
// }

// // Create Redis client
// const redisClient = redis.createClient({
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//     // password: process.env.REDIS_PASSWORD || undefined,  // Ensure password is set if required
//     db: 0,
// });

// // Event listener for successful connection
// redisClient.on('connect', () => {
//     console.log('Successfully connected to Redis');
// });

// // Event listener for Redis connection errors
// redisClient.on('error', (err) => {
//     console.error('Redis connection error:', err);
// });

// // Optional: Log Redis ready state to ensure it's fully connected
// redisClient.on('ready', () => {
//     console.log('Redis client is ready and fully connected');
// });

// // Optional: Log when Redis is end (disconnect)
// redisClient.on('end', () => {
//     console.log('Redis client connection ended');
// });

// // Optional: Log Redis reconnected if disconnected
// redisClient.on('reconnecting', () => {
//     console.log('Redis client is reconnecting');
// });

// // Optional: Handle close event (when Redis connection is closed)
// redisClient.on('close', () => {
//     console.log('Redis client connection closed');
// });

// module.exports = redisClient;



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

