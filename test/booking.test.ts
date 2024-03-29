import axios, { AxiosError } from 'axios';
import { startServer, stopServer } from '../source/server';
import { PrismaClient } from '@prisma/client';

const GUEST_A_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_A_UNIT_2 = {
    unitID: '2',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_B_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestB',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const prisma = new PrismaClient();

beforeEach(async () => {
    // Clear any test setup or state before each test
    await prisma.booking.deleteMany();
});

beforeAll(async () => {
    await startServer();
});

afterAll(async () => {
    await prisma.$disconnect();
    await stopServer();
});

describe('Booking API', () => {
    describe('createBooking', () => {
        test('Create fresh booking', async () => {
            const response = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);

            expect(response.status).toBe(200);
            expect(response.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
            expect(response.data.unitID).toBe(GUEST_A_UNIT_1.unitID);
            expect(response.data.numberOfNights).toBe(GUEST_A_UNIT_1.numberOfNights);
        });

        test('Same guest same unit booking', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
            expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

            // Guests want to book the same unit again
            let error: any;
            try {
                await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(400);
            expect(error.response.data).toEqual('The given guest name cannot book the same unit multiple times');
        });

        test('Same guest different unit booking', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
            expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

            // Guest wants to book another unit
            let error: any;
            try {
                await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_2);
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(400);
            expect(error.response.data).toEqual('The same guest cannot be in multiple units at the same time');
        });

        test('Different guest same unit booking', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
            expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

            // GuestB trying to book a unit that is already occupied
            let error: any;
            try {
                await axios.put('http://localhost:8000/api/v1/booking', GUEST_B_UNIT_1);
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(400);
            expect(error.response.data).toEqual('For the given check-in date, the unit is already occupied');
        });

        test('Different guest same unit booking different date', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

            // GuestB trying to book a unit that is already occupied
            let error: any;
            try {
                await axios.put('http://localhost:8000/api/v1/booking', {
                    unitID: '1',
                    guestName: 'GuestB',
                    checkInDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    numberOfNights: 5
                });
            } catch(e) {
                error = e;
            }

            expect(error.response.status).toBe(400);
            expect(error.response.data).toBe('For the given check-in date, the unit is already occupied');
        });

        test('Different guest same unit booking different date within stay duration', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

            // GuestB trying to book a unit that is already occupied
            let error: any;
            const numberOfNights = 5
            try {
                await axios.put('http://localhost:8000/api/v1/booking', {
                    unitID: '1',
                    guestName: 'GuestB',
                    checkInDate: new Date(new Date().getTime() - numberOfNights * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    numberOfNights: numberOfNights
                });
            } catch(e) {
                error = e;
            }

            expect(error.response.status).toBe(400);
            expect(error.response.data).toBe('For the given check-in date, the unit is already occupied');
        });
    });

    describe('modifyBooking', () => {
        test('Extend existing booking', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

            const data = {
                ...GUEST_A_UNIT_1,
                id: response1.data.id,
                numberOfNights: ++GUEST_A_UNIT_1.numberOfNights,
            };
            const response = await axios.patch('http://localhost:8000/api/v1/booking', data);

            expect(response.status).toBe(200);
            expect(response.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
            expect(response.data.unitID).toBe(GUEST_A_UNIT_1.unitID);
            expect(response.data.numberOfNights).toBe(data.numberOfNights);
        });

        test('Shortening existing booking not possible', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

            const data = {
                ...GUEST_A_UNIT_1,
                numberOfNights: --GUEST_A_UNIT_1.numberOfNights,
            };

            let error: any;
            try {
                const response = await axios.patch('http://localhost:8000/api/v1/booking', data);
            } catch(e) {
                error = e;
            }

            expect(error.response.status).toBe(400);
            expect(error.response.data).toBe('This booking cannot be shortened.');
        });

        test('Modify non-existent booking', async () => {
            let error: any;
            try {
                const response = await axios.patch('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            } catch(e) {
                error = e;
            }

            expect(error.response.status).toBe(400);
            expect(error.response.data).toBe('This booking does not exist.');
        });

        test('Different guest same unit booking different date within stay duration', async () => {
            // Create first booking
            const response1 = await axios.put('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
            expect(response1.status).toBe(200);
            expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

            const guestBData = {
                ...GUEST_B_UNIT_1,
                checkInDate: new Date(new Date().getTime() - ++GUEST_B_UNIT_1.numberOfNights * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            };
            const response2 = await axios.put('http://localhost:8000/api/v1/booking', guestBData);
            expect(response2.status).toBe(200);
            expect(response2.data.guestName).toBe(GUEST_B_UNIT_1.guestName);

            // GuestB trying to extend their stay to overlap GuestA
            let error: any;
            try {
                await axios.patch('http://localhost:8000/api/v1/booking', {
                    ...guestBData,
                    numberOfNights: ++GUEST_B_UNIT_1.numberOfNights
                });
            } catch(e) {
                error = e;
            }

            expect(error.response.status).toBe(400);
            expect(error.response.data).toBe('For the given check-in date, the unit is already occupied');
        });
    });
});
