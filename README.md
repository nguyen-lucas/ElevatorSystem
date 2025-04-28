# Elevator System

## Overview

Build a Elevators system that a passenger calls an elevator in a certain floor and we 
need to know which elevator would stop for that passenger.

## Setup & Running

### Running with docker
```bash
docker-compose up --build
```

### Running without docker

1. Install [Node.js](https://nodejs.org/en/)
2. Install dependencies:

```bash
npm install
```
3. Run tests to ensure no errors happen:

```bash
npm test
```

4. Run the development server:

```bash
npm run dev
```
5. Access the application at `http://localhost:3000/api-docs/` with swagger UI, you can test all api here

## Project Structure

```
ElevatorSystem/
├── src/
│   ├── controllers/
│   │   └── elevatorController.ts       # Contains API controllers for handling elevator-related requests.
│   ├── cron/
│   │   └── index.ts                    # Manages periodic tasks using cron, such as creating random elevator requests.
│   ├── logger.ts                       # Configures and exports the logger for the application.
│   ├── models/
│   │   └── elevator.ts                 # Defines the data models for elevators, requests, and system configuration.
│   ├── routes/
│   │   └── elevatorRoutes.ts           # Defines API routes for elevator operations.
│   ├── services/
│   │   └── elevatorService.ts          # Contains the core business logic for elevator operations.
│   ├── state/
│   │   └── elevatorSystemState.ts      # Manages the state of the elevator system using a singleton pattern.
│   ├── app.ts                          # Configures the Express application and middleware.
│   ├── server.ts                       # Starts the server and handles shutdown signals.
│   ├── openapi.yml                     # OpenAPI specification for documenting the API.
├── test/
│   ├── cron/
│   │   └── index.spec.ts               # Unit tests for cron job functionality.
│   ├── integrationTest/
│   │   └── elevatorService.integration.spec.ts # Integration tests for the elevator service.
│   ├── unitTest/
│   │   └── elevatorService.spec.ts     # Unit tests for the elevator service business logic.
├── README.md                           # Documentation for the project, including setup, running, and API details.
├── package.json                        # Project metadata and dependencies.
├── jest.config.cjs                     # Configuration for Jest testing framework.
├── tsconfig.json                       # TypeScript configuration file.
├── docker-compose.yml                  # Docker Compose configuration for running the application.
```

## Cronjob to random passenger every 5 seconds

It simulates a random passenger request by calling the `createRequest` function.
- After creating the request, the system logs the current state of all elevators, including:
- The elevator's current floor.
- The number of pending requests for the elevator.

### Example Log Output

When the cron job runs, it generates logs like the following:

```
[INFO] Randoming passenger...
[INFO] Elevator 1: Currently on floor 3, 2 pending requests
[INFO] Elevator 2: Currently on floor 5, 1 pending request
```

### Purpose
- This functionality is useful for testing and simulating real-world scenarios where passengers request elevators at random intervals.
- It ensures the system is continuously handling requests and updating the state of elevators.

### How to Stop the Cron Job
The cron job can be stopped by calling the API `/api/elevators/stop-cron` function, which stops all scheduled tasks. This is useful when you want to test manually.

### How to Restart the Cron Job
The cron job can be restarted by calling the `/api/elevators/start-cron` function, which reinitializes all scheduled tasks.


## Algorithm: Selecting the Best Elevator

The `selectBestElevator` function determines the most suitable elevator to handle a request based on several factors. The algorithm assigns a score to each elevator and selects the one with the highest score.

### Factors Considered in Scoring:

1. **Distance to the Requested Floor**:
- Elevators closer to the requested floor are preferred.
- The score is calculated as `distance * -2` (negative weight for distance).

2. **Current Load (Passenger Count)**:
- Elevators with fewer passengers are preferred.
- The score is calculated as `currentPassengerCount * -1`.

3. **Number of Target Floors**:
- Elevators with fewer target floors are preferred.
- The score is calculated as `targetFloors.length * -1`.

4. **Direction Matching**:
- Elevators moving in the same direction as the request are preferred.
- If the elevator is moving in the correct direction and the requested floor is ahead:
  - Score: `+3`.
- If the elevator is moving in the correct direction but the requested floor is behind:
  - Score: `-3`.
- If the elevator is moving in the opposite direction:
  - Score: `-5`.

5. **Idle State**:
  - Idle elevators are preferred over moving elevators.
  - Score: `+2`.

### Algorithm Steps:
1. Initialize `bestScore` to a very low value (`Number.MIN_SAFE_INTEGER`) and `bestElevatorIndex` to `0`.
2. Iterate through all elevators in the system.
3. For each elevator:
   - Calculate the **distance score** based on the distance to the requested floor.
   - Calculate the **load score** based on the current passenger count and target floors.
   - Calculate the **direction score** based on the elevator's current direction and the request's direction.
   - Sum up all scores to get the **total score** for the elevator.
4. Compare the total score with the current `bestScore`:
   - If the total score is higher, update `bestScore` and set `bestElevatorIndex` to the current elevator's index.
5. Return the index of the elevator with the highest score.

### Example:
- **Request**: From floor 6, going up.
- **Elevators**:
  1. Elevator 0: On floor 3, moving up, 2 passengers, target floors [8].
  2. Elevator 1: On floor 5, idle, 0 passengers, no target floors.

**Scoring**:
- Elevator 0:
  - Distance score: `|6 - 3| * -2 = -6`.
  - Load score: `2 * -1 + 1 * -1 = -3`.
  - Direction score: `+3` (moving up, request is ahead).
  - Total score: `-6 + -3 + 3 = -6`.

- Elevator 1:
  - Distance score: `|6 - 5| * -2 = -2`.
  - Load score: `0 * -1 + 0 * -1 = 0`.
  - Direction score: `+2` (idle).
  - Total score: `-2 + 0 + 2 = 0`.

**Result**:
- Elevator 1 is selected because it has the highest score (`0`).

---

## API Documentation

### 1. Get All Elevators
**Endpoint**: `GET /api/elevators`

**Description**: Retrieves the status of all elevators in the system.

**Responses**:
- **200 OK**: Successfully retrieved elevator information.
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 0,
        "currentFloor": 2,
        "status": "IDLE",
        "targetFloors": [],
        "requests": [],
        "capacity": 10,
        "currentPassengerCount": 0
      }
    ]
  }
  ```
- **500 Internal Server Error**: An error occurred while retrieving elevator information.

---

### 2. Get Elevator by ID
**Endpoint**: `GET /api/elevators/{id}`

**Description**: Retrieves the status of a specific elevator by its ID.

**Path Parameters**:
- `id` (integer, required): The ID of the elevator.

**Responses**:
- **200 OK**: Successfully retrieved elevator information.
  ```json
  {
    "success": true,
    "data": {
      "id": 0,
      "currentFloor": 2,
      "status": "IDLE",
      "targetFloors": [],
      "requests": [],
      "capacity": 10,
      "currentPassengerCount": 0
    }
  }
  ```
- **404 Not Found**: Elevator with the specified ID was not found.
- **500 Internal Server Error**: An error occurred while retrieving elevator information.

---

### 3. Request an Elevator
**Endpoint**: `POST /api/elevators/request`

**Description**: Requests an elevator from a specific floor to go to another floor.

**Request Body**:
```json
{
  "fromFloor": 2,
  "toFloor": 5
}
```

**Responses**:
- **200 OK**: Elevator request was successful.
  ```json
  {
    "success": true,
    "data": {
      "elevatorId": 1,
      "request": {
        "fromFloor": 2,
        "toFloor": 5,
        "direction": "UP",
        "id": "unique-request-id"
      }
    }
  }
  ```
- **400 Bad Request**: Invalid request parameters (e.g., `fromFloor` and `toFloor` are the same or out of range).
- **500 Internal Server Error**: An error occurred while processing the request.

---

### 4. Stop Scheduled Tasks
**Endpoint**: `POST /api/elevators/stop-cron`

**Description**: Stops all scheduled tasks of the elevator system.

**Responses**:
- **200 OK**: Successfully stopped all scheduled tasks.
  ```json
  {
    "success": true,
    "message": "Successfully stopped all scheduled tasks"
  }
  ```
- **500 Internal Server Error**: An error occurred while stopping scheduled tasks.

---

### 5. Restart Scheduled Tasks
**Endpoint**: `POST /api/elevators/start-cron`

**Description**: Restarts all scheduled tasks of the elevator system.

**Responses**:
- **200 OK**: Successfully restarted all scheduled tasks.
  ```json
  {
    "success": true,
    "message": "Successfully restarted all scheduled tasks"
  }
  ```
- **500 Internal Server Error**: An error occurred while restarting scheduled tasks.
