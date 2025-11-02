// src/config/swagger.js
 const swaggerJsdoc = require('swagger-jsdoc');

 const options = {
   definition: {
     openapi: '3.0.0',
     info: {
       title: 'Vicatomaps API',
       version: '1.0.0',
       description: 'Route cost calculation API for Europe'
     },
     servers: [
       { url: 'https://vicatomaps-server.onrender.com', description: 'Production' },
       { url: 'http://localhost:3000', description: 'Development' }
     ]
   },
   apis: ['./src/routes/*.js']
 };

 const swaggerSpec = swaggerJsdoc(options);

 module.exports = swaggerSpec;