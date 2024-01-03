import express from 'express';
import controller from '../controllers/bookings';
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BookingInput:
 *       type: object
 *       properties:
 *         guestName:
 *           type: string
 *         unitID:
 *           type: string
 *         checkInDate:
 *           type: string
 *           format: date
 *         numberOfNights:
 *           type: integer
 *           format: int32
 *     HealthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: string
 * tags:
 *   - name: booking-controller
 *   - name: system
 *
 * /:
 *   get:
 *     summary: Health check
 *     tags: [system]
 *     operationId: helloWorld
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *
 * /api/v1/booking:
 *   put:
 *     summary: Create booking
 *     tags: [booking-controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', controller.healthCheck);
router.put('/api/v1/booking/', controller.createBooking);

export = router;
