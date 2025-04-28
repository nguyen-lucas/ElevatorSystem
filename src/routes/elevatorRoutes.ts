import { Router } from 'express';

import * as elevatorController from '../controllers/elevatorController';
import { stopCronJobs, setupCronJobs } from '../cron';

export const elevatorRouter: Router = Router();

/**
 * @openapi
 * /api/elevators:
 *   get:
 *     tags:
 *       - Elevators
 *     summary: Get status of all elevators
 *     description: Returns information about all elevators in the system
 *     responses:
 *       '200':
 *         description: Successfully retrieved elevator information
 *       '500':
 *         description: Internal server error
 */
elevatorRouter.get('/', elevatorController.getAllElevator);

/**
 * @openapi
 * /api/elevators/{id}:
 *   get:
 *     tags:
 *       - Elevators
 *     summary: Get status of a specific elevator
 *     description: Returns information about a specific elevator by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Elevator ID
 *     responses:
 *       '200':
 *         description: Successfully retrieved elevator information
 *       '404':
 *         description: Elevator not found
 *       '500':
 *         description: Internal server error
 */
elevatorRouter.get('/:id', elevatorController.getElevatorById);

/**
 * @openapi
 * /api/elevators/request:
 *   post:
 *     tags:
 *       - Elevators
 *     summary: Request an elevator
 *     description: Request an elevator from a specific floor to go to another floor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromFloor:
 *                 type: integer
 *                 description: The floor where the request is made
 *               toFloor:
 *                 type: integer
 *                 description: The destination floor
 *     responses:
 *       '200':
 *         description: Elevator request successful
 *       '400':
 *         description: Invalid request parameters
 *       '500':
 *         description: Internal server error
 */
elevatorRouter.post('/request', elevatorController.requestElevator);

/**
 * @openapi
 * /api/elevators/stop-cron:
 *   post:
 *     tags:
 *       - Elevators
 *     summary: Stop scheduled tasks
 *     description: Stop all scheduled tasks of the elevator system
 *     responses:
 *       '200':
 *         description: Successfully stopped scheduled tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
elevatorRouter.post('/stop-cron', (req, res) => {
    try {
        stopCronJobs();
        res.status(200).json({
            success: true,
            message: 'Successfully stopped all scheduled tasks'
        });
    } catch (err) {
        const error = err as Error;
        res.status(500).json({
            success: false,
            message: 'Failed to stop scheduled tasks',
            error: error.message
        });
    }
});

/**
 * @openapi
 * /api/elevators/start-cron:
 *   post:
 *     tags:
 *       - Elevators
 *     summary: Restart scheduled tasks
 *     description: Restart all scheduled tasks of the elevator system
 *     responses:
 *       '200':
 *         description: Successfully restarted scheduled tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
elevatorRouter.post('/start-cron', (req, res) => {
    try {
        setupCronJobs();
        res.status(200).json({
            success: true,
            message: 'Successfully restarted all scheduled tasks'
        });
    } catch (err) {
        const error = err as Error;
        res.status(500).json({
            success: false,
            message: 'Failed to restart scheduled tasks',
            error: error.message
        });
    }
});

