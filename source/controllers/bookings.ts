import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma'

interface Booking {
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "OK"
    })
}

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    const booking: Booking = req.body;

    let outcome = await isBookingPossible(booking);
    if (!outcome.result) {
        return res.status(400).json(outcome.reason);
    }

    let bookingResult = await prisma.booking.create({
        data: {
             guestName: booking.guestName,
             unitID: booking.unitID,
             checkInDate: new Date(booking.checkInDate),
             numberOfNights: booking.numberOfNights
       }
    })

    return res.status(200).json(bookingResult);
}

type bookingOutcome = {result:boolean, reason:string};

async function isBookingPossible(booking: Booking): Promise<bookingOutcome> {
    // check 1 : The Same guest cannot book the same unit multiple times
    let sameGuestSameUnit = await prisma.booking.findMany({
        where: {
            AND: {
                guestName: {
                    equals: booking.guestName,
                },
                unitID: {
                    equals: booking.unitID,
                },
            },
        },
    });
    if (sameGuestSameUnit.length > 0) {
        return {result: false, reason: "The given guest name cannot book the same unit multiple times"};
    }

    // check 2 : the same guest cannot be in multiple units at the same time
    let sameGuestAlreadyBooked = await prisma.booking.findMany({
        where: {
            guestName: {
                equals: booking.guestName,
            },
        },
    });
    if (sameGuestAlreadyBooked.length > 0) {
        return {result: false, reason: "The same guest cannot be in multiple units at the same time"};
    }

    // check 3 : Unit is available for the check-in date
    let isUnitAvailableOnCheckInDate = (await prisma.booking.findMany({
        where: {
            AND: {
                checkInDate: {
                    lte: new Date(booking.checkInDate),
                },
                unitID: {
                    equals: booking.unitID,
                }
            }
        }
    })).filter((occupiedBooking) => {
        // Runtime array filter op - keep only bookings which are overlapped by my check-in date
        const checkOutTime = occupiedBooking.checkInDate.getTime() + occupiedBooking.numberOfNights * 24 * 60 * 60 * 1000;
        return (new Date(booking.checkInDate).getTime()) <= checkOutTime;
    });
    if (isUnitAvailableOnCheckInDate.length > 0) {
        return {result: false, reason: "For the given check-in date, the unit is already occupied"};
    }

    // check 4: Unit is available for duration of stay
    let isUnitAvailableDuringStay = await prisma.booking.findMany({
        where: {
            AND: [{
                checkInDate: {
                    gte: new Date(booking.checkInDate),
                },
            }, {
                checkInDate: {
                    // Allow booking when check-in is the same as occupied check-out date
                    lte: new Date(new Date(booking.checkInDate).getTime() + booking.numberOfNights * 24 * 60 * 60 * 1000)
                },
            }, {
                unitID: {
                    equals: booking.unitID,
                },
            }],
        },
    });
    if (isUnitAvailableDuringStay.length > 0) {
        return {result: false, reason: "For the given check-in date, the unit is already occupied"};
    }

    return {result: true, reason: "OK"};
}

export default { healthCheck, createBooking }
