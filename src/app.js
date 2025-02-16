// server.js
const express = require("express");
const redisClient = require('./redis');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const cookieSession = require("cookie-session");
const session = require('express-session');
const app = express();
const pool = require('./db');
const authRouter = require('./routes/auth');
const shortenRouter = require('./routes/shorten');


let dbReady = false; 

// Google OAuth credentials (from Google Developer Console)
// const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
// const GOOGLE_CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET";

// Use cookie-session for session management
// app.use(cookieSession({
//   name: "session",
//   keys: process.env.SESSION_SECRET,
//   maxAge: 24 * 60 * 60 * 1000, // 24 hours
// }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'topsecret',
    resave: false,
    saveUninitialized: false,
  })
)

// Initialize Passport.js
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
app.use('/auth', authRouter);
app.use('/api/short', shortenRouter);

pool.connect().then(client => {
    console.log("Database connection established.");
    dbReady = true;
    client.release();
}).catch(err => {
    console.error("Database connection error: ", err);
    process.exit(1);
})

app.get('/', (req, res) => {
  res.send('Welcome to the URL shortener API!');
});

// Example of how to check Redis connection within the app
app.get('/redis-status', async (req, res) => {
  // Check if Redis is connected by querying it
  try {
    const response = await redisClient.ping();
    return res.json({ message: 'Redis is connected', response });
  } catch (err) {
    return res.status(500).json({ message: 'Redis connection failed', error: err.message });
  }
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log("Server started on http://localhost:3000");
});
