import { Context } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { Job } from '../datasources/jobsTables';
import { PickupJobCreatedEvent } from '../types/events';

export function createPickupJobCreatedEvent(job: Job, context: Context): PickupJobCreatedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.pickupJobCreated',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'us-east-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'pickupJobCreated',
            },
            data: {
                jobId: job.jobId,
                vehicleId: job.vehicleId,
                warehouseId: job.warehouseId,
                duration: job.duration,
            },
        },
    };
}
