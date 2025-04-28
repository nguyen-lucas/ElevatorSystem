import { v4 as uuidv4 } from 'uuid';

import { Elevator, ElevatorRequest, ElevatorStatus, Direction } from '../models/elevator';
import elevatorSystemManager, { ElevatorSystemState } from '../state/elevatorSystemState';
import logger from '../logger';

// ---- BUSINESS LOGIC FUNCTIONS ----

// Constants for scoring
const SCORE_WEIGHTS = {
  DISTANCE: -2,
  PASSENGER_COUNT: -1,
  TARGET_FLOORS: -1,
  RIGHT_DIRECTION_AHEAD: 3,
  RIGHT_DIRECTION_BEHIND: -3,
  OPPOSITE_DIRECTION: -5,
  IDLE_STATE: 2
};

// Constants for elevator status
const ELEVATOR_STATUS = {
  IDLE: ElevatorStatus.IDLE,
  MOVING_UP: ElevatorStatus.MOVING_UP,
  MOVING_DOWN: ElevatorStatus.MOVING_DOWN
};

// Calculate score based on distance
const calculateDistanceScore = (elevator: Elevator, requestedFloor: number): number => {
  const distance = Math.abs(elevator.currentFloor - requestedFloor);
  return distance * SCORE_WEIGHTS.DISTANCE;
};

// Calculate score based on current load
const calculateLoadScore = (elevator: Elevator): number => {
  return elevator.currentPassengerCount * SCORE_WEIGHTS.PASSENGER_COUNT +
    elevator.targetFloors.length * SCORE_WEIGHTS.TARGET_FLOORS;
};

// Calculate score based on direction
const calculateDirectionScore = (elevator: Elevator, requestedFloor: number, direction: Direction): number => {
  if (elevator.status === ElevatorStatus.IDLE) {
    return SCORE_WEIGHTS.IDLE_STATE;
  }

  const elevatorDirection = elevator.status === ElevatorStatus.MOVING_UP ? Direction.UP : Direction.DOWN;

  if (elevatorDirection === direction) {
    const isAhead = (direction === Direction.UP && requestedFloor > elevator.currentFloor) ||
      (direction === Direction.DOWN && requestedFloor < elevator.currentFloor);
    return isAhead ? SCORE_WEIGHTS.RIGHT_DIRECTION_AHEAD : SCORE_WEIGHTS.RIGHT_DIRECTION_BEHIND;
  }

  return SCORE_WEIGHTS.OPPOSITE_DIRECTION;
};

// Select the best elevator to serve a request
export const selectBestElevator = (state: ElevatorSystemState, requestedFloor: number, direction: Direction): number => {
  let bestElevatorIndex = 0;
  let bestScore = Number.MIN_SAFE_INTEGER;

  for (let i = 0; i < state.elevators.length; i++) {
    const elevator = state.elevators[i];

    const distanceScore = calculateDistanceScore(elevator, requestedFloor);
    const loadScore = calculateLoadScore(elevator);
    const directionScore = calculateDirectionScore(elevator, requestedFloor, direction);

    const totalScore = distanceScore + loadScore + directionScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestElevatorIndex = i;
    }
  }

  return bestElevatorIndex;
};

// Helper functions for getNextTargetFloor
const findNextFloorInDirection = (elevator: Elevator, isUp: boolean): number | null => {
  const floors = elevator.targetFloors.filter(floor =>
    isUp ? floor > elevator.currentFloor : floor < elevator.currentFloor
  );
  return floors.length > 0
    ? (isUp ? Math.min(...floors) : Math.max(...floors))
    : null;
};

const findClosestFloor = (elevator: Elevator): number => {
  const distances = elevator.targetFloors.map(floor => ({
    floor,
    distance: Math.abs(floor - elevator.currentFloor)
  }));
  distances.sort((a, b) => a.distance - b.distance);
  return distances[0].floor;
};

// Determine the next floor the elevator should go to
export const getNextTargetFloor = (elevator: Elevator): number => {
  if (elevator.targetFloors.length === 0) {
    return elevator.currentFloor;
  }

  // Try to find next floor in current direction
  if (elevator.status === ELEVATOR_STATUS.MOVING_UP) {
    const nextFloor = findNextFloorInDirection(elevator, true);
    if (nextFloor !== null) return nextFloor;
  } else if (elevator.status === ELEVATOR_STATUS.MOVING_DOWN) {
    const nextFloor = findNextFloorInDirection(elevator, false);
    if (nextFloor !== null) return nextFloor;
  }

  // If no floors in current direction, find closest floor
  return findClosestFloor(elevator);
};

// Helper functions for handleElevatorArrival
const processPassengersBoarding = (elevator: Elevator): Elevator => {
  logger.info(`Processing boarding passengers for elevator ${elevator.id} at floor ${elevator.currentFloor}`);
  const requestsAtCurrentFloor = elevator.requests.filter(
    request => request.fromFloor === elevator.currentFloor
  );

  if (requestsAtCurrentFloor.length === 0) return elevator;

  const availableCapacity = elevator.capacity - elevator.currentPassengerCount;
  const passengersToPickUp = Math.min(availableCapacity, requestsAtCurrentFloor.length);

  const updatedElevator = { ...elevator };
  updatedElevator.currentPassengerCount += passengersToPickUp;
  console.log(`Picked up ${passengersToPickUp} passengers for elevator ${elevator.id} at floor ${elevator.currentFloor}`);

  // Add new target floors
  const newTargetFloors = [...updatedElevator.targetFloors];
  for (let i = 0; i < passengersToPickUp; i++) {
    const request = requestsAtCurrentFloor[i];
    if (!newTargetFloors.includes(request.toFloor)) {
      newTargetFloors.push(request.toFloor);
    }
  }
  updatedElevator.targetFloors = newTargetFloors;

  // Remove processed requests
  updatedElevator.requests = updatedElevator.requests.filter(
    request => request.fromFloor !== updatedElevator.currentFloor
  );

  return updatedElevator;
};

const processPassengersExiting = (elevator: Elevator): Elevator => {
  logger.info(`Processing existing passengers for elevator ${elevator.id} at floor ${elevator.currentFloor}`);
  const passengerGettingOffRequests = elevator.requests.filter(
    request => request.toFloor === elevator.currentFloor
  );

  if (passengerGettingOffRequests.length === 0) return elevator;

  const updatedElevator = { ...elevator };
  updatedElevator.currentPassengerCount -= passengerGettingOffRequests.length;

  // Remove completed requests
  updatedElevator.requests = updatedElevator.requests.filter(
    request => request.toFloor !== updatedElevator.currentFloor
  );
  console.log(`Dropped off ${passengerGettingOffRequests.length} passengers for elevator ${elevator.id} at floor ${elevator.currentFloor}`);

  return updatedElevator;
};

// Handle elevator arrival at a floor
export const handleElevatorArrival = (elevator: Elevator): Elevator => {
  let updatedElevator = { ...elevator };

  // Process passengers boarding
  updatedElevator = processPassengersBoarding(updatedElevator);

  // Process passengers exiting
  updatedElevator = processPassengersExiting(updatedElevator);

  // Remove current floor from target floors
  updatedElevator.targetFloors = updatedElevator.targetFloors.filter(
    floor => floor !== updatedElevator.currentFloor
  );

  return updatedElevator;
};

// Handle idle state
const handleIdleState = (elevator: Elevator): Elevator => {
  let updatedElevator = { ...elevator };

  // If there are requests, add the starting floor to targetFloors
  if (updatedElevator.requests.length > 0) {
    const nextRequest = updatedElevator.requests[0];
    if (!updatedElevator.targetFloors.includes(nextRequest.fromFloor)) {
      updatedElevator.targetFloors.push(nextRequest.fromFloor);
    }
  }

  if (updatedElevator.targetFloors.length > 0) {
    const nextFloor = getNextTargetFloor(updatedElevator);
    if (nextFloor > updatedElevator.currentFloor) {
      updatedElevator.status = ELEVATOR_STATUS.MOVING_UP;
    } else if (nextFloor < updatedElevator.currentFloor) {
      updatedElevator.status = ELEVATOR_STATUS.MOVING_DOWN;
    } else {
      // If nextFloor equals currentFloor, process requests at current floor
      updatedElevator = handleElevatorArrival(updatedElevator);
    }
  }

  return updatedElevator;
};

const moveElevator = (elevator: Elevator): Elevator => {
  const updatedElevator = { ...elevator };

  if (updatedElevator.status === ELEVATOR_STATUS.MOVING_UP) {
    updatedElevator.currentFloor++;
  } else if (updatedElevator.status === ELEVATOR_STATUS.MOVING_DOWN) {
    updatedElevator.currentFloor--;
  }

  return updatedElevator;
};

const updateElevatorStatus = (elevator: Elevator): Elevator => {
  const updatedElevator = { ...elevator };

  if (updatedElevator.targetFloors.length === 0) {
    updatedElevator.status = ELEVATOR_STATUS.IDLE;
    updatedElevator.currentPassengerCount = 0;
  } else {
    const nextFloor = getNextTargetFloor(updatedElevator);

    if (nextFloor > updatedElevator.currentFloor) {
      updatedElevator.status = ELEVATOR_STATUS.MOVING_UP;
    } else if (nextFloor < updatedElevator.currentFloor) {
      updatedElevator.status = ELEVATOR_STATUS.MOVING_DOWN;
    }
  }

  return updatedElevator;
};

// Simulate movement of a single elevator
export const stepElevator = (elevator: Elevator): Elevator => {
  let updatedElevator = { ...elevator };

  // Handle idle state
  if (updatedElevator.status === ELEVATOR_STATUS.IDLE) {
    updatedElevator.currentPassengerCount = 0;
    return handleIdleState(updatedElevator);
  }

  // Move elevator
  updatedElevator = moveElevator(updatedElevator);

  // Check if reached target floor
  if (updatedElevator.targetFloors.includes(updatedElevator.currentFloor)) {
    logger.info(`Processing elevator arrival at floor ${updatedElevator.currentFloor}`);
    updatedElevator = handleElevatorArrival(updatedElevator);
  }

  // Update status based on remaining target floors
  updatedElevator = updateElevatorStatus(updatedElevator);

  return updatedElevator;
};

// Move all elevators one step
export const stepAllElevators = (state: ElevatorSystemState): ElevatorSystemState => {
  const newElevators = state.elevators.map(elevator => stepElevator(elevator));

  return {
    ...state,
    elevators: newElevators
  };
};

// Create a random request from one floor to another
export const createRandomRequest = (floorCount: number): { fromFloor: number; toFloor: number } => {
  const fromFloor = Math.floor(Math.random() * floorCount);
  let toFloor;

  // Ensure destination floor is different from starting floor
  do {
    toFloor = Math.floor(Math.random() * floorCount);
  } while (toFloor === fromFloor);

  return { fromFloor, toFloor };
};

// Get current state
export const getCurrentState = (): ElevatorSystemState => {
  return elevatorSystemManager.getState();
};

// Get all elevators
export const getAvailableElevators = (): Elevator[] => {
  return elevatorSystemManager.getState().elevators;
};

// Get information about an elevator by id
export const getElevatorById = (id: number): Elevator | undefined => {
  return elevatorSystemManager.getState().elevators.find(elevator => elevator.id === id);
};

// Initialize elevator system with custom configuration
export const initializeElevatorSystem = (config: {
  elevatorCount: number,
  floorCount: number,
  defaultElevatorCapacity: number
}): ElevatorSystemState => {
  return elevatorSystemManager.initializeSystem(config);
};

export const createRequest = () => {
  const state = elevatorSystemManager.getState();
  const randomRequest = createRandomRequest(state.floorCount);
  logger.info(`New random request: From floor ${randomRequest.fromFloor} to floor ${randomRequest.toFloor}`);
  requestElevatorService(randomRequest.fromFloor, randomRequest.toFloor);
}

// Start simulation with automatic updates at given interval
export const startSimulation = (interval: number = 2000): void => {
  logger.info(`Starting elevator simulation with interval of ${interval}ms`);
  // Set up the simulation interval that will create random requests and move elevators
  elevatorSystemManager.setSimulationInterval(() => {
    const state = elevatorSystemManager.getState();
    const newState = stepAllElevators(state);
    elevatorSystemManager.updateState(newState);
    loggingTask();
  }, interval);
};

const loggingTask = () => {
  const state = elevatorSystemManager.getState();
  console.log(`Current elevator system status:`, {
    totalElevators: state.elevators.length,
    activeRequests: state.elevators.reduce((count, elevator) =>
      count + elevator.requests.length, 0),
    elevatorStatus: state.elevators.map(elevator => ({
      id: elevator.id,
      currentFloor: elevator.currentFloor,
      status: elevator.status,
      pendingRequests: elevator.requests.length,
      targetFloors: elevator.targetFloors.join(', '),
      requests: elevator.requests.map(req => `${req.fromFloor} -> ${req.toFloor}`).join(', '),
      currentPassengerCount: elevator.currentPassengerCount
    }))
  });
}

// Stop simulation
export const stopSimulation = (): void => {
  logger.info('Stopping elevator simulation');
  elevatorSystemManager.clearSimulationInterval();
};

// Request an elevator from one floor to another
export const requestElevatorService = (fromFloor: number, toFloor: number): {
  success: boolean;
  selectedElevatorId?: number;
  request?: ElevatorRequest;
  message?: string;
} => {
  try {
    const state = elevatorSystemManager.getState();

    // Validate floor values
    if (fromFloor < 0 || fromFloor >= state.floorCount) {
      return {
        success: false,
        message: `Request floor must be between 0 and ${state.floorCount - 1}`
      };
    }

    if (toFloor < 0 || toFloor >= state.floorCount) {
      return {
        success: false,
        message: `Destination floor must be between 0 and ${state.floorCount - 1}`
      };
    }

    if (fromFloor === toFloor) {
      return {
        success: false,
        message: 'Request floor and destination floor cannot be the same'
      };
    }

    // Determine direction of request
    const direction = fromFloor < toFloor ? Direction.UP : Direction.DOWN;

    // Create new request
    const request: ElevatorRequest = {
      id: uuidv4(),
      fromFloor,
      toFloor,
      direction
    };

    // Select the most suitable elevator
    const selectedElevatorIndex = selectBestElevator(state, fromFloor, direction);

    // Get a copy of the state and the selected elevator
    const newState = { ...state, elevators: [...state.elevators] };
    const selectedElevator = { ...newState.elevators[selectedElevatorIndex] };

    // Add request to the selected elevator
    selectedElevator.requests = [...selectedElevator.requests, request];

    // Add the starting floor to the list of target floors if not already included
    if (!selectedElevator.targetFloors.includes(fromFloor)) {
      logger.info('Added target floor into elevator ' + selectedElevatorIndex);
      selectedElevator.targetFloors = [...selectedElevator.targetFloors, fromFloor];
    }

    // Update elevator status if in idle state
    if (selectedElevator.status === ElevatorStatus.IDLE) {
      if (fromFloor > selectedElevator.currentFloor) {
        selectedElevator.status = ElevatorStatus.MOVING_UP;
      } else if (fromFloor < selectedElevator.currentFloor) {
        selectedElevator.status = ElevatorStatus.MOVING_DOWN;
      }
    }

    // Update the elevator in the state
    logger.info('Update the elevator in the state with request ' + selectedElevator.requests.length);
    newState.elevators[selectedElevatorIndex] = selectedElevator;

    // Update the state
    elevatorSystemManager.updateState(newState);

    return {
      success: true,
      selectedElevatorId: selectedElevator.id,
      request: request
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const updateState = (newState: ElevatorSystemState): void => {
  elevatorSystemManager.updateState(newState)
}

// Kiểm tra xem mô phỏng có đang chạy không
export const isSimulationRunning = (): boolean => {
  return elevatorSystemManager.isSimulationRunning();
};
