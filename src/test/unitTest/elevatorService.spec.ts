import { 
  selectBestElevator, 
  getNextTargetFloor, 
  handleElevatorArrival
} from '../../services/elevatorService';
import { Elevator, ElevatorStatus, Direction } from '../../models/elevator';
import { ElevatorSystemState } from '../../state/elevatorSystemState';

describe('Elevator Service Tests', () => {
  // Restore all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectBestElevator', () => {
    it('should select the closest idle elevator', () => {
      // Arrange
      const state: ElevatorSystemState = {
        elevators: [
          {
            id: 0,
            currentFloor: 0,
            status: ElevatorStatus.IDLE,
            targetFloors: [],
            requests: [],
            capacity: 10,
            currentPassengerCount: 0
          },
          {
            id: 1,
            currentFloor: 5,
            status: ElevatorStatus.IDLE,
            targetFloors: [],
            requests: [],
            capacity: 10,
            currentPassengerCount: 0
          }
        ],
        floorCount: 10
      };

      // Act - Request from floor 6, going up
      const selectedElevatorIndex = selectBestElevator(state, 6, Direction.UP);

      // Assert - Should select elevator 1 because it is closer (on floor 5)
      expect(selectedElevatorIndex).toBe(1);
    });

    it('should prefer elevator moving in the same direction with a request on the way', () => {
      // Arrange
      const state: ElevatorSystemState = {
        elevators: [
          {
            id: 0,
            currentFloor: 3,
            status: ElevatorStatus.MOVING_UP,
            targetFloors: [8],
            requests: [],
            capacity: 10,
            currentPassengerCount: 0
          },
          {
            id: 1,
            currentFloor: 5,
            status: ElevatorStatus.IDLE,
            targetFloors: [],
            requests: [],
            capacity: 10,
            currentPassengerCount: 0
          }
        ],
        floorCount: 10
      };

      // Act - Request from floor 4, going up
      const selectedElevatorIndex = selectBestElevator(state, 4, Direction.UP);

      // Assert - Should select elevator 0 because it is moving up and floor 4 is on its way
      expect(selectedElevatorIndex).toBe(0);
    });

    it('should consider passenger count in selection', () => {
      // Arrange
      const state: ElevatorSystemState = {
        elevators: [
          {
            id: 0,
            currentFloor: 3,
            status: ElevatorStatus.IDLE,
            targetFloors: [],
            requests: [],
            capacity: 10,
            currentPassengerCount: 8 // Almost full
          },
          {
            id: 1,
            currentFloor: 4,
            status: ElevatorStatus.IDLE,
            targetFloors: [],
            requests: [],
            capacity: 10,
            currentPassengerCount: 2 // More space available
          }
        ],
        floorCount: 10
      };

      // Act - Request from floor 5, going up
      const selectedElevatorIndex = selectBestElevator(state, 5, Direction.UP);

      // Assert - Should select elevator 1 because it has fewer passengers and is similarly close
      expect(selectedElevatorIndex).toBe(1);
    });
  });

  describe('getNextTargetFloor', () => {
    it('should return current floor when no target floors', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 3,
        status: ElevatorStatus.IDLE,
        targetFloors: [],
        requests: [],
        capacity: 10,
        currentPassengerCount: 0
      };

      // Act
      const nextFloor = getNextTargetFloor(elevator);

      // Assert
      expect(nextFloor).toBe(3);
    });

    it('should select the lowest floor above current when moving up', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 3,
        status: ElevatorStatus.MOVING_UP,
        targetFloors: [7, 5, 9],
        requests: [],
        capacity: 10,
        currentPassengerCount: 0
      };

      // Act
      const nextFloor = getNextTargetFloor(elevator);

      // Assert - Should select floor 5 because it is the lowest above the current floor
      expect(nextFloor).toBe(5);
    });

    it('should select the highest floor below current when moving down', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 6,
        status: ElevatorStatus.MOVING_DOWN,
        targetFloors: [2, 4, 1],
        requests: [],
        capacity: 10,
        currentPassengerCount: 0
      };

      // Act
      const nextFloor = getNextTargetFloor(elevator);

      // Assert - Should select floor 4 because it is the highest below the current floor
      expect(nextFloor).toBe(4);
    });

    it('should select the closest floor when idle', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 6,
        status: ElevatorStatus.IDLE,
        targetFloors: [2, 8],
        requests: [],
        capacity: 10,
        currentPassengerCount: 0
      };

      // Act
      const nextFloor = getNextTargetFloor(elevator);

      // Assert - Should select floor 8 because it is closest to the current floor
      expect(nextFloor).toBe(8);
    });
  });

  describe('handleElevatorArrival', () => {
    it('should pick up passengers waiting at the current floor', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 3,
        status: ElevatorStatus.MOVING_UP,
        targetFloors: [3, 7],
        requests: [
          { id: '1', fromFloor: 3, toFloor: 7, direction: Direction.UP },
          { id: '2', fromFloor: 3, toFloor: 5, direction: Direction.UP }
        ],
        capacity: 10,
        currentPassengerCount: 0
      };

      // Act
      const updatedElevator = handleElevatorArrival(elevator);

      // Assert
      expect(updatedElevator.currentPassengerCount).toBe(2); // Picked up 2 passengers
      expect(updatedElevator.targetFloors).toContain(7); // Keeps existing target floor
      expect(updatedElevator.targetFloors).toContain(5); // Adds new target floor
      expect(updatedElevator.targetFloors).not.toContain(3); // Removes current floor from targets
      expect(updatedElevator.requests.length).toBe(0); // Processes all requests at the current floor
    });

    it('should drop off passengers at the current floor', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 5,
        status: ElevatorStatus.MOVING_UP,
        targetFloors: [5, 7],
        requests: [
          { id: '1', fromFloor: 2, toFloor: 5, direction: Direction.UP },
          { id: '2', fromFloor: 3, toFloor: 5, direction: Direction.UP },
          { id: '3', fromFloor: 1, toFloor: 7, direction: Direction.UP }
        ],
        capacity: 10,
        currentPassengerCount: 3
      };

      // Act
      const updatedElevator = handleElevatorArrival(elevator);

      // Assert
      expect(updatedElevator.currentPassengerCount).toBe(1); // 2 passengers got off, 1 remains
      expect(updatedElevator.targetFloors).not.toContain(5); // Removes current floor
      expect(updatedElevator.targetFloors).toContain(7); // Keeps other target floors
      expect(updatedElevator.requests.length).toBe(1); // 1 request remains for floor 7
    });

    it('should respect elevator capacity when picking up passengers', () => {
      // Arrange
      const elevator: Elevator = {
        id: 0,
        currentFloor: 2,
        status: ElevatorStatus.MOVING_UP,
        targetFloors: [2, 8],
        requests: [
          { id: '1', fromFloor: 2, toFloor: 5, direction: Direction.UP },
          { id: '2', fromFloor: 2, toFloor: 6, direction: Direction.UP },
          { id: '3', fromFloor: 2, toFloor: 8, direction: Direction.UP }
        ],
        capacity: 2, // Can only hold 2 passengers
        currentPassengerCount: 0
      };

      // Act
      const updatedElevator = handleElevatorArrival(elevator);

      // Assert
      expect(updatedElevator.currentPassengerCount).toBe(2); // Picks up only 2 passengers
      expect(updatedElevator.targetFloors.length).toBe(3); // Adds 2 new target floors
      expect(updatedElevator.requests.length).toBe(0); // Processes all requests at the current floor
    });
  });

  // Other tests remain unchanged...
});