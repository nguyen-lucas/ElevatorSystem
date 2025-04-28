import { Request, Response, NextFunction } from 'express';

import { 
  getAvailableElevators,
  getElevatorById as getElevatorByIdService,
  requestElevatorService,
  startSimulation as startElevatorSimulation,
  stopSimulation as stopElevatorSimulation,
  isSimulationRunning
} from '../services/elevatorService';
import logger from '../logger';

// Get all elevators
export const getAllElevator = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const elevators = getAvailableElevators();
    
    res.status(200).json({
      success: true,
      data: elevators,
    });
  } catch (error) {
    logger.error('Error getting all elevators:', error);
    next(error);
  }
};

// Get elevator by ID
export const getElevatorById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { id } = req.params;
    const elevator = getElevatorByIdService(parseInt(id));
    
    if (!elevator) {
      res.status(404).json({
        success: false,
        message: 'Elevator not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: elevator
    });
  } catch (error) {
    logger.error('Error getting elevator by ID:', error);
    next(error);
  }
};

// Request elevator service
export const requestElevator = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { fromFloor, toFloor } = req.body;
    
    if (typeof fromFloor !== 'number' || typeof toFloor !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Invalid floor numbers'
      });
      return;
    }
    
    const result = requestElevatorService(fromFloor, toFloor);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        elevatorId: result.selectedElevatorId,
        request: result.request
      }
    });
  } catch (error) {
    logger.error('Error requesting elevator:', error);
    next(error);
  }
};

// Start simulation
export const startSimulation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (isSimulationRunning()) {
      res.status(400).json({
        success: false,
        message: 'Simulation is already running'
      });
      return;
    }
    
    startElevatorSimulation(2000);
    res.status(200).json({
      success: true,
      message: 'Simulation started successfully'
    });
  } catch (error) {
    logger.error('Error starting simulation:', error);
    next(error);
  }
};

// Stop simulation
export const stopSimulation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!isSimulationRunning()) {
      res.status(400).json({
        success: false,
        message: 'Simulation is not running'
      });
      return;
    }
    
    stopElevatorSimulation();
    res.status(200).json({
      success: true,
      message: 'Simulation stopped successfully'
    });
  } catch (error) {
    logger.error('Error stopping simulation:', error);
    next(error);
  }
};
