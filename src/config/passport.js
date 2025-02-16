const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db'); // Your database connection

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback', // Ensure this URL is correct
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;
        const email = emails ? emails[0].value : null;
        const profilePicture = photos ? photos[0].value : null;

        // Check if user exists in the database by their Google ID
        const userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [id]);
        let user;

        if (userResult.rows.length === 0) {
          // Create new user if not found
          const insertResult = await pool.query(
            'INSERT INTO users (google_id, name, email, profile_picture) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, displayName, email, profilePicture]
          );
          user = insertResult.rows[0]; // New user created
        } else {
          user = userResult.rows[0]; // Existing user
        }

        // Pass user object to the next step (serialization)
        return done(null, user);
      } catch (err) {
        return done(err, null); // Handle any errors
      }
    }
  )
);

// Serialize the user into session (store the user ID)
passport.serializeUser((user, done) => {
  done(null, user.id); // Store the user ID (you can also store Google ID if preferred)
});

// Deserialize the user from the session (retrieve user by ID)
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;