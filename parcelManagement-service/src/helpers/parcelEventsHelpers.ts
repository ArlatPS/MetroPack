import { Context } from 'aws-lambda';
import {
    ParcelRegisteredEvent,
    ParcelTransferStartedEvent,
    ParcelTransferCompletedEvent,
    Warehouse,
    ParcelDeliveryStartedEvent,
} from '../aggregates/parcel';
import { Location } from '../valueObjects/location';
import { randomUUID } from 'node:crypto';

export function createParcelRegisteredEvent(
    pickupDate: string,
    pickupLocation: Location,
    deliveryDate: string,
    deliveryLocation: Location,
    transitWarehouses: Warehouse[],
    context: Context,
): ParcelRegisteredEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.parcelRegistered',
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
                type: 'data',
                name: 'parcelRegistered',
            },
            data: {
                parcelId: randomUUID(),
                time: new Date().toISOString(),
                pickupDate,
                pickupLocation,
                deliveryLocation,
                deliveryDate,
                transitWarehouses,
            },
        },
    };
}

export function createParcelTransferStartedEvent(
    parcelId: string,
    time: string,
    sourceWarehouse: Warehouse,
    destinationWarehouse: Warehouse,
    context: Context,
): ParcelTransferStartedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.parcelTransferStarted',
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
                type: 'data',
                name: 'parcelTransferStarted',
            },
            data: {
                parcelId,
                sourceWarehouse,
                destinationWarehouse,
                time,
            },
        },
    };
}

export function createParcelTransferCompletedEvent(
    parcelId: string,
    time: string,
    sourceWarehouse: Warehouse,
    destinationWarehouse: Warehouse,
    context: Context,
): ParcelTransferCompletedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.parcelTransferCompleted',
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
                type: 'data',
                name: 'parcelTransferCompleted',
            },
            data: {
                parcelId,
                sourceWarehouse,
                destinationWarehouse,
                time,
            },
        },
    };
}

export function createParcelDeliveryStartedEvent(
    parcelId: string,
    vehicleId: string,
    time: string,
    deliveryLocation: Location,
    context: Context,
): ParcelDeliveryStartedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'parcelManagementService.parcelDeliveryStarted',
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
                type: 'data',
                name: 'parcelDeliveryStarted',
            },
            data: {
                parcelId,
                vehicleId,
                time,
                deliveryLocation,
            },
        },
    };
}
