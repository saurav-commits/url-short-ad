# URL Shortener API

## Description
The URL Shortener API is a simple service that converts long URLs into short, easily shareable links. It supports custom aliases, authentication, and analytics tracking.

## Features
- Shorten long URLs
- Custom aliases for URLs
- User authentication with Google OAuth
- Redis caching for improved performance
- Swagger documentation

## Technologies Used
- Node.js
- Express.js
- PostgreSQL
- Redis
- Swagger (OpenAPI 3.0)
- Passport.js (Google OAuth)

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/url-shortener.git
   cd url-shortener
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file and configure the following variables:
   ```env
   PORT=3000
   SESSION_SECRET=your_secret_key
   DATABASE_URL=your_postgresql_connection_string
   REDIS_URL=your_redis_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Start the server:
   ```sh
   npm start
   ```

## API Documentation
Swagger documentation is available at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback

### URL Shortening
- `POST /api/short/shorten` - Shorten a long URL
- `GET /:alias` - Redirect to the original URL

### Health Checks
- `GET /redis-status` - Check Redis connection status
- `GET /` - Welcome message

## Usage
- Send a `POST` request to `/api/short/shorten` with a JSON body:
  ```json
  {
    "longUrl": "https://example.com",
    "customAlias": "myalias"
  }
  ```
  Response:
  ```json
  {
    "shortUrl": "http://localhost:3000/myalias"
  }
  ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
This project is licensed under the MIT License.

