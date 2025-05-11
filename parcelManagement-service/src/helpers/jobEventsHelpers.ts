import { Context } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { Job, TransferJob } from '../datasources/jobsTables';
import {
    DeliveryJobCompletedEvent,
    DeliveryJobCreatedEvent,
    DeliveryJobStartedEvent,
    PickupJobCompletedEvent,
    PickupJobCreatedEvent,
    PickupJobStartedEvent,
    PrepareDeliveryJobsCommandEvent,
    PreparePickupJobsCommandEvent,
    TransferJobCompletedEvent,
    TransferJobCreatedEvent,
    TransferJobStartedEvent,
} from '../types/jobEvents';

export function createPickupJobCreatedEvent(job: Job, context: Context): PickupJobCreatedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.pickupJobCreated',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
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
                date: job.date,
                status: 'PENDING',
            },
        },
    };
}

export function createDeliveryJobCreatedEvent(job: Job, context: Context): DeliveryJobCreatedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.deliveryJobCreated',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'deliveryJobCreated',
            },
            data: {
                jobId: job.jobId,
                vehicleId: job.vehicleId,
                warehouseId: job.warehouseId,
                duration: job.duration,
                date: job.date,
                status: 'PENDING',
                parcels: job.steps.map((step) => step.parcelId),
            },
        },
    };
}

export function createTransferJobCreatedEvent(job: TransferJob, context: Context): TransferJobCreatedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.transferJobCreated',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'transferJobCreated',
            },
            data: {
                jobId: job.jobId,
                date: job.date,
                status: 'PENDING',
                sourceWarehouseId: job.sourceWarehouseId,
                destinationWarehouseId: job.destinationWarehouseId,
            },
        },
    };
}

export function createPreparePickupJobsCommand(
    warehouseId: string,
    date: string,
    context: Context,
): PreparePickupJobsCommandEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.preparePickupJobs',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'command',
                name: 'preparePickupJobs',
            },
            data: {
                warehouseId,
                date,
            },
        },
    };
}

export function createPrepareDeliveryJobsCommand(
    warehouseId: string,
    date: string,
    context: Context,
): PrepareDeliveryJobsCommandEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.prepareDeliveryJobs',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'command',
                name: 'prepareDeliveryJobs',
            },
            data: {
                warehouseId,
                date,
            },
        },
    };
}

export function createTransferJobStartedEvent(
    jobId: string,
    sourceWarehouseId: string,
    destinationWarehouseId: string,
    context: Context,
    time: string = new Date().toISOString(),
): TransferJobStartedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.transferJobStarted',
        source: context.functionName,
        time,
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'transferJobStarted',
            },
            data: {
                jobId,
                sourceWarehouseId,
                destinationWarehouseId,
                time,
            },
        },
    };
}

export function createTransferJobCompletedEvent(
    jobId: string,
    sourceWarehouseId: string,
    destinationWarehouseId: string,
    context: Context,
    time: string = new Date().toISOString(),
): TransferJobCompletedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.transferJobCompleted',
        source: context.functionName,
        time,
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'transferJobCompleted',
            },
            data: {
                jobId,
                sourceWarehouseId,
                destinationWarehouseId,
                time,
            },
        },
    };
}
export function createPickupJobStartedEvent(
    jobId: string,
    vehicleId: string,
    warehouseId: string,
    context: Context,
    time: string = new Date().toISOString(),
): PickupJobStartedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.pickupJobStarted',
        source: context.functionName,
        time,
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'pickupJobStarted',
            },
            data: {
                jobId,
                vehicleId,
                warehouseId,
                time,
            },
        },
    };
}

export function createPickupJobCompletedEvent(
    jobId: string,
    vehicleId: string,
    warehouseId: string,
    context: Context,
    time: string = new Date().toISOString(),
): PickupJobCompletedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.pickupJobCompleted',
        source: context.functionName,
        time,
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'pickupJobCompleted',
            },
            data: {
                jobId,
                vehicleId,
                warehouseId,
                time,
            },
        },
    };
}

export function createDeliveryJobStartedEvent(
    jobId: string,
    vehicleId: string,
    warehouseId: string,
    context: Context,
    time: string = new Date().toISOString(),
): DeliveryJobStartedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.deliveryJobStarted',
        source: context.functionName,
        time,
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'deliveryJobStarted',
            },
            data: {
                jobId,
                vehicleId,
                warehouseId,
                time,
            },
        },
    };
}

export function createDeliveryJobCompletedEvent(
    jobId: string,
    vehicleId: string,
    warehouseId: string,
    context: Context,
    time: string = new Date().toISOString(),
): DeliveryJobCompletedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.deliveryJobCompleted',
        source: context.functionName,
        time,
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'parcelShipping',
                subdomain: 'parcelManagement',
                service: 'parcelManagementService',
                category: 'domainEvent',
                type: 'event',
                name: 'deliveryJobCompleted',
            },
            data: {
                jobId,
                vehicleId,
                warehouseId,
                time,
            },
        },
    };
}
