/* eslint-disable */
// This is the main server file - starts everything up

// 0) Load envs early (before anything else)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });        // root app envs (PORT, Firebase, etc.)
require('dotenv').config({ path: path.resolve(__dirname, '../../prisma/.env') }); // Prisma DB env (DATABASE_URL)

// (Optional) quick debug – remove after confirming
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT);

// 1) Imports
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { config } = require('./config');                    // Load settings (reads from process.env)
const { authMiddleware } = require('./auth.middleware');   // Check if user is logged in
const { errorHandler } = require('./errors');              // Handle errors nicely
const routes = require('./routes');                        // All API endpoints
const { connectPool, getPool } = require('../shared/db');  // Database connection (pg)
const { logger } = require('../shared/logger');            // Log messages
const chatGateway = require('../modules/chat/gateway');    // Real-time chat
const { validateAdminConfig } = require('../utils/admin');  // Validate admin config

// External services (stubs for now - not implemented yet)
const firebaseAuth = require('../adapters/firebase.auth');       // User login
const firebaseStorage = require('../adapters/firebase.storage'); // File storage
const spacesStorage = require('../adapters/spaces.storage');     // DigitalOcean Spaces storage
const maps = require('../adapters/maps.adapter');                // Maps and geocoding
const payments = require('../adapters/payments.adapter');        // Payment processing

let server;
let io;

/**
 * Sets up the Express web server with all middleware and routes
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  // Allow web browsers to connect to our API
  // Support both development (Vite on 5173) and Docker (nginx on 8080)
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:8080'];
  
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Parse JSON data from requests (like when creating a hike)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Log every request to console
  app.use((req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'request',
        method: req.method,
        url: req.originalUrl,
      })
    );
    next();
  });

  // Make external services available to other parts of the app
  app.locals.adapters = {
    firebaseAuth, // For checking user login
    firebaseStorage, // For storing photos/files (fallback)
    spacesStorage, // For storing photos/files in DigitalOcean Spaces
    maps, // For geocoding and maps
    payments, // For processing payments
  };

  // Serve uploads directory (local fallback storage - only used when Spaces isn't configured)
  // Folders are auto-created by uploadHandler.js and controller when needed
  app.use('/hikes', express.static(path.join(__dirname, '..', 'modules', 'hikes', 'uploads')));


  // Check if user is logged in on every request
  app.use(authMiddleware);

  // Health check endpoint - anyone can check if server is running
  app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

  // Add all API routes (hikes, bookings, guides, etc.)
  // NOTE: ensure `./routes` exports an Express Router function, e.g., `module.exports = router`
  app.use(routes);

  // Handle any errors that happen
  app.use(errorHandler);

  return app;
}

/**
 * Starts the TrailHub server - this is the main function
 * Sets up database, web server, and real-time chat
 * @param {number} [customPort] - port to run on (default from .env file)
 * @returns {Promise<{ server: import('http').Server, io: import('socket.io').Server, stop: () => Promise<void> }>}
 */
async function start(customPort) {
  // 1) Get port number from settings
  const port = Number(customPort || config.port);

  // 2) Validate admin configuration
  validateAdminConfig();

  // 3) Try to connect to database (PostgreSQL)
  const dbPool = await connectPool();
  if (!dbPool) {
    console.warn('Starting without database connection (development mode)');
  }

  // 4) Load external services (not implemented yet)
  // TODO: Initialize firebase-admin and other SDKs here when implementing
  void firebaseAuth;
  void firebaseStorage;
  void payments;

  // 5) Create the web server with all routes and middleware
  const app = createApp();

  // 6) Start HTTP server and real-time chat
  server = http.createServer(app);
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
  });
  chatGateway.register(io);

  // 7) Start listening for requests
  await new Promise((resolve) => server.listen(port, resolve));
  logger.info('TrailHub ready', { port });

  // 8) Return server handles and cleanup function
  async function stop() {
    // Close real-time chat
    if (io) {
      io.removeAllListeners();
      io.close();
    }
    // Close web server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Close database connection
    try {
      const pool = getPool();
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
    } catch (_e) {
      // swallow
    }
  }

  return { server, io, stop };
}

if (require.main === module) {
  // Run if executed directly
  start();
}

module.exports = { start };