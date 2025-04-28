import * as cron from 'node-cron';

import { setupCronJobs, stopCronJobs } from '../../cron';
import elevatorSystemManager from '../../state/elevatorSystemState';
import { createRequest } from '../../services/elevatorService';

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn()
  }),
  getTasks: jest.fn().mockReturnValue([])
}));

jest.mock('../../state/elevatorSystemState', () => ({
  getState: jest.fn(),
  __esModule: true,
  default: {
    getState: jest.fn()
  }
}));

jest.mock('../../services/elevatorService', () => ({
  createRequest: jest.fn()
}));

describe('Cron Jobs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupCronJobs', () => {
    it('should create a cron job that runs every 5 seconds', () => {
      // Arrange

      // Act
      const tasks = setupCronJobs();

      // Assert
      expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * * *', expect.any(Function));
      expect(tasks).toHaveProperty('randomRequest');
    });

    it('should call createRequest and log elevator status', () => {
      // Arrange
      (elevatorSystemManager.getState as jest.Mock).mockReturnValue({
        elevators: [
          {
            id: 0,
            currentFloor: 2,
            requests: [{ id: '1', fromFloor: 3, toFloor: 5 }]
          },
          {
            id: 1,
            currentFloor: 5,
            requests: []
          }
        ]
      });

      // Act
      setupCronJobs();
      
      // Get the callback passed to cron.schedule
      const scheduledCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      
      // Execute the callback (simulate cron tick)
      scheduledCallback();

      // Assert
      expect(createRequest).toHaveBeenCalled();
      expect(elevatorSystemManager.getState).toHaveBeenCalled();
    });
  });

  describe('stopCronJobs', () => {
    it('should stop all cron tasks', () => {
      // Arrange
      const mockTask1 = { stop: jest.fn() };
      const mockTask2 = { stop: jest.fn() };
      (cron.getTasks as jest.Mock).mockReturnValue([mockTask1, mockTask2]);

      // Act
      stopCronJobs();

      // Assert
      expect(cron.getTasks).toHaveBeenCalled();
      expect(mockTask1.stop).toHaveBeenCalled();
      expect(mockTask2.stop).toHaveBeenCalled();
    });

    it('should handle null tasks', () => {
      // Arrange
      (cron.getTasks as jest.Mock).mockReturnValue([null, undefined]);

      // Act
      stopCronJobs();

      // Assert
      expect(cron.getTasks).toHaveBeenCalled();
    });
  });
});