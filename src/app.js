/* eslint-disable */
/**
 * Express application initialization for TrailHub.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

console.log('DATABASE_URL:', process.env.DATABASE_URL);


const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./src/app/auth.middleware');

dotenv.config();

const app = express();

// Core middleware
//temporary changes
// app.use(cors());
app.use(cors({
  origin: [
    'http://localhost:5173',       // desktop dev
    'http://192.168.0.103:5173'    // mobile devices on same LAN
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true  // important if sending cookies or auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));
app.use(requestLogger);

// Auth middleware (populates req.user)
app.use(authMiddleware);

// Routes
app.use('/', routes);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
