import { Context } from 'aws-lambda';
import { ParcelRegisteredEvent, Warehouse } from '../aggregates/parcel';
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
