import { 
  initializeElevatorSystem,
  requestElevatorService,
  getCurrentState,
  stepAllElevators,
  updateState
} from '../../services/elevatorService';
import { Elevator, ElevatorStatus } from '../../models/elevator';

describe('Elevator Service Integration Tests', () => {
  // Restore all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full System Flow', () => {
    it('should handle elevator movement from IDLE state correctly', () => {
      // Arrange - Initialize the system with 1 elevator and 10 floors
      const config = {
        elevatorCount: 1,
        floorCount: 10,
        defaultElevatorCapacity: 10
      };
      
      // Initialize the system
      initializeElevatorSystem(config);
      
      // Create a request from floor 0 to floor 5
      const request = { fromFloor: 0, toFloor: 5 };

      // Act - Send the request
      requestElevatorService(request.fromFloor, request.toFloor);

      // Simulate 10 steps of elevator movement
      let currentState = getCurrentState();
      // Need 7 steps to reach floor 5
      for (let i = 0; i < 7; i++) {
        currentState = stepAllElevators(currentState);
        updateState(currentState);
        
        // Log the state after each step
        const state = getCurrentState();
        const elevator = state.elevators[0];
        console.log(`Step ${i + 1}:`, {
          currentFloor: elevator.currentFloor,
          status: elevator.status,
          targetFloors: elevator.targetFloors,
          requests: elevator.requests,
          currentPassengerCount: elevator.currentPassengerCount
        });
      }

      // Assert - Verify the results
      const finalState = getCurrentState();
      const finalElevator = finalState.elevators[0];
      
      // Check that the elevator has moved
      expect(finalElevator.currentFloor).toBe(5); // No longer on floor 0
      
      // Check the status
      expect(finalElevator.status).toBe(ElevatorStatus.IDLE); // Should be idle
      
      // Check the passenger count
      expect(finalElevator.currentPassengerCount).toBeGreaterThanOrEqual(0);
      expect(finalElevator.currentPassengerCount).toBeLessThanOrEqual(finalElevator.capacity);
    });

    it('should handle multiple requests and elevator movements correctly', () => {
      // Arrange - Initialize the system with 3 elevators and 10 floors
      const config = {
        elevatorCount: 3,
        floorCount: 10,
        defaultElevatorCapacity: 10
      };
      
      // Initialize the system
      initializeElevatorSystem(config);
      
      // Create 3 elevator requests
      const requests = [
        { fromFloor: 0, toFloor: 5 },  // Request 1: from floor 0 to floor 5
        { fromFloor: 3, toFloor: 7 },  // Request 2: from floor 3 to floor 7
        { fromFloor: 8, toFloor: 2 }   // Request 3: from floor 8 to floor 2
      ];

      // Act - Send all requests
      requests.forEach(request => {
        requestElevatorService(request.fromFloor, request.toFloor);
      });

      // Simulate 10 steps of elevator movement
      let currentState = getCurrentState();
      for (let i = 0; i < 10; i++) {
        currentState = stepAllElevators(currentState);
        console.log(`Step ${i} data ${JSON.stringify(currentState)}`);
        updateState(currentState);
      }

      // Assert - Verify the results
      const finalState = getCurrentState();
      
      // Check details of each elevator
      finalState.elevators.forEach((elevator: Elevator, index: number) => {
        console.log(`Elevator ${index}:`, {
          currentFloor: elevator.currentFloor,
          status: elevator.status,
          targetFloors: elevator.targetFloors,
          requests: elevator.requests,
          currentPassengerCount: elevator.currentPassengerCount
        });

        // Check the current position
        expect(elevator.currentFloor).toBeGreaterThanOrEqual(0);
        expect(elevator.currentFloor).toBeLessThan(finalState.floorCount);

        // Check the status
        expect([ElevatorStatus.IDLE, ElevatorStatus.MOVING_UP, ElevatorStatus.MOVING_DOWN])
          .toContain(elevator.status);

        // Check the passenger count
        expect(elevator.currentPassengerCount).toBeGreaterThanOrEqual(0);
        expect(elevator.currentPassengerCount).toBeLessThanOrEqual(elevator.capacity);

        // Check target floors
        if (elevator.status === ElevatorStatus.MOVING_UP) {
          expect(elevator.targetFloors.some(floor => floor > elevator.currentFloor))
            .toBeTruthy();
        } else if (elevator.status === ElevatorStatus.MOVING_DOWN) {
          expect(elevator.targetFloors.some(floor => floor < elevator.currentFloor))
            .toBeTruthy();
        }
      });

      // Check the total number of requests processed
      const totalRequests = finalState.elevators.reduce((sum: number, elevator: Elevator) => 
        sum + elevator.requests.length, 0);
      expect(totalRequests).toBeLessThanOrEqual(3);

      // Check if the elevators are operating correctly
      const activeElevators = finalState.elevators.filter((elevator: Elevator) => 
        elevator.status !== ElevatorStatus.IDLE || 
        elevator.targetFloors.length > 0
      );
      expect(activeElevators.length).toBeGreaterThan(0);
    });
  });
});