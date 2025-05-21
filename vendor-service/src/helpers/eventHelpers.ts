import { randomUUID } from 'crypto';
import { Context } from 'aws-lambda';
import { VendorDetailsChangedEvent, VendorRegisteredEvent } from '../aggregates/vendor';

export function createVendorRegisteredEvent(
    vendorId: string,
    name: string,
    email: string,
    longitude: number,
    latitude: number,
    context: Context,
): VendorRegisteredEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'vendorService.vendorRegistered',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'customerService',
                subdomain: 'vendor',
                service: 'vendorService',
                category: 'domainEvent',
                type: 'data',
                name: 'vendorRegistered',
            },
            data: {
                vendorId,
                name,
                email,
                location: {
                    longitude,
                    latitude,
                },
            },
        },
    };
}

export function createVendorDetailsChangedEvent(
    vendorId: string,
    context: Context,
    name?: string,
    email?: string,
    location?: {
        longitude: number;
        latitude: number;
    },
): VendorDetailsChangedEvent {
    const event: VendorDetailsChangedEvent = {
        version: '1',
        id: randomUUID(),
        detailType: 'vendorService.vendorDetailsChanged',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'customerService',
                subdomain: 'vendor',
                service: 'vendorService',
                category: 'domainEvent',
                type: 'data',
                name: 'vendorDetailsChanged',
            },
            data: {
                vendorId,
            },
        },
    };
    name && (event.detail.data.name = name);
    email && (event.detail.data.email = email);
    location && (event.detail.data.location = location);
    return event;
}
