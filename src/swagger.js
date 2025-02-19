const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { 
      title: 'URL Shortener API',
      version: '1.0.0',
      description: 'API documentation for the URL shortener service',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Update this path to match your project structure
};

const swaggerDocs = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerDocs };