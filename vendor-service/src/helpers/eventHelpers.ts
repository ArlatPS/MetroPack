import { randomUUID } from 'crypto';
import { Context } from 'aws-lambda';
import { VendorRegisteredEvent } from '../aggregates/vendor';

export function createVendorRegisteredEvent(
    vendorId: string,
    name: string,
    email: string,
    context: Context,
): VendorRegisteredEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'vendorRegistered',
        source: context.functionName,
        time: new Date().toISOString(),
        region: 'us-east-1',
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
            },
        },
    };
}
