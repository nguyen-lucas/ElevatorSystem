import { Elevator, ElevatorStatus } from '../models/elevator';

export interface ElevatorSystemState {
  elevators: Elevator[];
  floorCount: number;
}

// Functional singleton pattern using closure
export const createElevatorSystemManager = () => {
  // Private state
  let state: ElevatorSystemState = {
    elevators: [],
    floorCount: 10
  };
  
  let simulationInterval: NodeJS.Timeout | null = null;

  // Return the public API - only state management methods
  return {
    // Get the current state
    getState: (): ElevatorSystemState => {
      return state;
    },

    // Update the entire state
    updateState: (newState: ElevatorSystemState): void => {
      state = newState;
    },

    // Update a specific elevator in the state
    updateElevator: (elevatorId: number, updatedElevator: Elevator): void => {
      const elevatorIndex = state.elevators.findIndex(e => e.id === elevatorId);
      if (elevatorIndex !== -1) {
        const newElevators = [...state.elevators];
        newElevators[elevatorIndex] = updatedElevator;
        state = {
          ...state,
          elevators: newElevators
        };
      }
    },

    // Initialize the elevator system with a new configuration
    initializeSystem: (config: {
      elevatorCount: number,
      floorCount: number,
      defaultElevatorCapacity: number
    }): ElevatorSystemState => {
      const elevators: Elevator[] = [];
      
      for (let i = 0; i < config.elevatorCount; i++) {
        elevators.push({
          id: i,
          currentFloor: 0,
          status: ElevatorStatus.IDLE,
          targetFloors: [],
          requests: [],
          capacity: config.defaultElevatorCapacity,
          currentPassengerCount: 0,
        });
      }
      
      state = {
        elevators,
        floorCount: config.floorCount
      };
      
      return state;
    },

    // Manage the simulation interval
    setSimulationInterval: (callback: () => void, intervalMs: number): void => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      
      simulationInterval = setInterval(callback, intervalMs);
    },

    // Stop the simulation
    clearSimulationInterval: (): void => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
      }
    },

    // Check if simulation is running
    isSimulationRunning: (): boolean => {
      return simulationInterval !== null;
    }
  };
};

// Create and export the singleton instance
const elevatorSystemManager = createElevatorSystemManager();
export default elevatorSystemManager; 