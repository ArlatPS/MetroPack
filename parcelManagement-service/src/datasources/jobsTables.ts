import { Location } from '../valueObjects/location';

export interface Job {
    jobId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    date: string;
    warehouseId: string;
    vehicleId: string;
    duration: number;
    steps: Step[];
}

interface Step {
    location: Location;
    arrivalTime: string;
    parcelId: string;
}

export function getAddPickupJobTransactItem(job: Job) {
    const pickupJobTable = process.env.PICKUP_JOB_TABLE;

    if (!pickupJobTable) {
        throw new Error('Pickup job table is not set');
    }

    return {
        Put: {
            TableName: pickupJobTable,
            Item: {
                jobId: job.jobId,
                status: job.status,
                date: job.date,
                warehouseId: job.warehouseId,
                vehicleId: job.vehicleId,
                duration: job.duration,
                steps: job.steps.map((step) => ({
                    location: {
                        longitude: step.location.longitude,
                        latitude: step.location.latitude,
                    },
                    arrivalTime: step.arrivalTime,
                    parcelId: step.parcelId,
                })),
            },
        },
    };
}
