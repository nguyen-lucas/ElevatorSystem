// Định nghĩa các trạng thái có thể của thang máy
export enum ElevatorStatus {
  IDLE = 'IDLE',
  MOVING_UP = 'MOVING_UP',
  MOVING_DOWN = 'MOVING_DOWN',
}

// Định nghĩa các hướng di chuyển
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  NONE = 'NONE',
}

// Định nghĩa một yêu cầu thang máy từ hành lang
export interface ElevatorRequest {
  fromFloor: number;
  toFloor: number;
  direction: Direction;
  id: string;
}

// Định nghĩa mô hình thang máy
export interface Elevator {
  id: number;
  currentFloor: number;
  status: ElevatorStatus;
  targetFloors: number[];
  requests: ElevatorRequest[];
  capacity: number;
  currentPassengerCount: number;
}

// Định nghĩa cấu hình hệ thống thang máy
export interface ElevatorSystemConfig {
  elevatorCount: number;
  floorCount: number;
  defaultElevatorCapacity: number;
} 