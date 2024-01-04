import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma'

interface Booking {
    id: number | undefined;
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
};
type bookingOutcome = {
    result: boolean,
    reason: string
};
type updateInput = {
    numberOfNights: number
};

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "OK"
    })
}

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    const booking: Booking = req.body;

    let bookingOutcome = await isBookingPossible(booking);
    if (!bookingOutcome.result) {
        return res.status(400).json(bookingOutcome.reason);
    }

    let schedulingOutcome = await isSchedulingPossible(booking);
    if (!schedulingOutcome.result) {
        return res.status(400).json(schedulingOutcome.reason);
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

const modifyBooking = async (req: Request, res: Response, next: NextFunction) => {
    const data = req.body;
    const where = {
        guestName: data.guestName,
        unitID: data.unitID,
        checkInDate: new Date(data.checkInDate),
    };

    const booking = await prisma.booking.findFirst({ where: where });
    const updateData: updateInput = { numberOfNights: data.numberOfNights }

    let extendOutcome = await isExtendPossible(booking, updateData);
    if (!extendOutcome.result) {
        return res.status(400).json(extendOutcome.reason);
    }

    // isExtendPossible returns if booking does not exist
    let schedulingOutcome = await isSchedulingPossible({ ...booking!, ...updateData });
    if (!schedulingOutcome.result) {
        return res.status(400).json(schedulingOutcome.reason);
    }

    const updateResult = await prisma.booking.update({
        where: { id: booking?.id },
        data: updateData,
    });

    return res.status(200).json(updateResult);
}

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

    return { result: true, reason: "OK" };
}

async function isSchedulingPossible(booking: Booking): Promise<bookingOutcome> {
    // check 3 : Unit is available for the check-in date
    let isUnitAvailableOnCheckInDate = (await prisma.booking.findMany({
        where: {
            AND: {
                id: {
                    // Exclude this booking from check
                    not: booking.id,
                },
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
                id: {
                    // Exclude this booking from check
                    not: booking.id,
                },
            }, {
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

    return { result: true, reason: "OK" };
}

async function isExtendPossible(booking: Booking | null, data: updateInput): Promise<bookingOutcome> {
    if (booking === null) {
        return { result: false, reason: 'This booking does not exist.' };
    }

    if (data.numberOfNights <= booking.numberOfNights) {
        return { result: false, reason: 'This booking cannot be shortened.' };
    }

    return { result: true, reason: "OK" };
}

export default { healthCheck, createBooking, modifyBooking }
