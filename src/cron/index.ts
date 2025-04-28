import * as cron from 'node-cron';

import elevatorSystemManager from '../state/elevatorSystemState';
import { createRequest } from '../services/elevatorService'
import logger from '../logger';

export const setupCronJobs = () => {

  // Schedule a task to create a new elevator request every 5 seconds
  const randomRequest = cron.schedule('*/5 * * * * *', () => {
    logger.info('Randoming passenger...');
    createRequest();
    
    // Log the latest state of the elevators
    const state = elevatorSystemManager.getState();
    state.elevators.forEach(elevator => {
      if (elevator.requests.length > 0) {
        logger.info(`Elevator ${elevator.id}: Currently on floor ${elevator.currentFloor}, ${elevator.requests.length} pending requests`);
      }
    });
  });

  // Save references to the tasks
  const tasks = {
    randomRequest
  };
  
  return tasks;
};

/**
 * Stop all periodic tasks
 */
export const stopCronJobs = () => {
  cron.getTasks().forEach(task => {
    if (task) {
      task.stop();
    }
  });
  logger.info('Stopped all periodic tasks of the elevator system');
};