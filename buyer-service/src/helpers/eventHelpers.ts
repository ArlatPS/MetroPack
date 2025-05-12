import { randomUUID } from 'node:crypto';
import { Context } from 'node:vm';

interface EventBase {
    version: '1';
    id: string;
    detailType: string;
    source: string;
    time: string;
    region: string;
    resources: string[];
}

interface OfferAcceptedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'finance';
            subdomain: 'dynamicPricing';
            service: 'dynamicPricingService';
            category: 'domainEvent';
            type: 'data';
            name: 'offerAccepted';
        };
        data: {
            offerId: string;
        };
    };
}
interface OrderCreatedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'customerService';
            subdomain: 'vendor';
            service: 'vendorService';
            category: 'domainEvent';
            type: 'data';
            name: 'orderCreated';
        };
        data: {
            vendorId: string;
            orderId: string;
            date: string;
            offerId: string;
        };
    };
}

export function createOfferAcceptedEvent(offerId: string, context: Context): OfferAcceptedEvent {
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
                domain: 'finance',
                subdomain: 'dynamicPricing',
                service: 'dynamicPricingService',
                category: 'domainEvent',
                type: 'data',
                name: 'offerAccepted',
            },
            data: {
                offerId,
            },
        },
    };
}

export function createOrderCreatedEvent(
    vendorId: string,
    orderId: string,
    date: string,
    offerId: string,
    context: Context,
): OrderCreatedEvent {
    return {
        version: '1',
        id: randomUUID(),
        detailType: 'vendorService.orderCreated',
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
                name: 'orderCreated',
            },
            data: {
                vendorId,
                orderId,
                date,
                offerId,
            },
        },
    };
}
