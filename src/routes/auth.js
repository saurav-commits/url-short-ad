const express = require('express');
const authRouter = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// Route to start Google OAuth authentication
authRouter.get('/google', (req, res, next) => {
  console.log("Redirecting to Google authentication...");
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next); // Pass the request, response, and next
});

// Route that handles the Google callback after successful authentication
authRouter.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }), // Redirect to login if authentication fails
  (req, res) => {
    if (!req.user) {
      console.error('Authentication failed: No user object.');
      return res.redirect('/login');
    }
    // Successful authentication
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Create JWT
    res.redirect(`/?token=${token}`); // Redirect to home with the JWT token
  }
);

// Protected route to show profile (only accessible if authenticated)
authRouter.get("/profile", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login"); // Redirect to login if not authenticated
  }
  res.send(`<h1>Welcome ${req.user.name}</h1><img src="${req.user.profile_picture}" alt="Profile Image">`);
});

// Route to logout
authRouter.get("/logout", (req, res) => {
  req.logout((err) => {
    res.redirect("/"); // Redirect to homepage after logout
  });
});

module.exports = authRouter;
