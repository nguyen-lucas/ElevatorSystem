import path from 'path';
import { fileURLToPath } from 'url';

import pinoHttp from 'pino-http';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import logger from './logger';

import { errorHandler, errorNotFoundHandler } from '@/middlewares/error-handler';
import { elevatorRouter } from '@/routes/elevatorRoutes';
import { setupCronJobs } from '@/cron/index';
import { startSimulation, initializeElevatorSystem } from '@/services/elevatorService';

// Create Express server
export const app: Express = express();

app.use(pinoHttp({ logger: logger }));
// Express configuration
app.set('port', process.env.PORT || 3000);
// Add middleware for parsing request bodies
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiSpec = YAML.load(path.join(__dirname, 'openapi.yml'));
app.use(express.urlencoded({ extended: true }));

// Routes\
app.use('/api/elevators', elevatorRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Error handlers
app.use(errorNotFoundHandler);
app.use(errorHandler);

// Initialize elevator system with default configuration
initializeElevatorSystem({
  elevatorCount: 3,        // Number of elevators
  floorCount: 10,          // Number of floors
  defaultElevatorCapacity: 8  // Maximum number of passengers per elevator
});

// Automatically start simulation when application starts
startSimulation(2000);     // Update every 2 seconds 

logger.info('Elevator simulation has been automatically started');

setupCronJobs();