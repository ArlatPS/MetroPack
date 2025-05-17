import { randomUUID } from 'node:crypto';
import { Context } from 'node:vm';

interface EventBase {
    version: '1';
    id: string;
    'detail-type': string;
    source: string;
    time: string;
    region: string;
    resources: string[];
}

interface OfferAcceptedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'customerService';
            subdomain: 'buyer';
            service: 'buyerService';
            category: 'domainEvent';
            type: 'data';
            name: 'offerAccepted';
        };
        data: {
            offerId: string;
        };
    };
}

interface OfferAcceptCancelled extends EventBase {
    detail: {
        metadata: {
            domain: 'customerService';
            subdomain: 'buyer';
            service: 'buyerService';
            category: 'domainEvent';
            type: 'data';
            name: 'offerAcceptCancelled';
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
            subdomain: 'buyer';
            service: 'buyerService';
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

interface OrderCreationCancelledEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'customerService';
            subdomain: 'buyer';
            service: 'buyerService';
            category: 'domainEvent';
            type: 'data';
            name: 'orderCreationCancelled';
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
        'detail-type': 'buyerService.offerAccepted',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'customerService',
                subdomain: 'buyer',
                service: 'buyerService',
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

export function createOfferAcceptCancelledEvent(offerId: string, context: Context): OfferAcceptCancelled {
    return {
        version: '1',
        id: randomUUID(),
        'detail-type': 'buyerService.offerAcceptCancelled',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'customerService',
                subdomain: 'buyer',
                service: 'buyerService',
                category: 'domainEvent',
                type: 'data',
                name: 'offerAcceptCancelled',
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
        'detail-type': 'buyerService.orderCreated',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'customerService',
                subdomain: 'buyer',
                service: 'buyerService',
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

export function createOrderCreationCancelledEvent(
    vendorId: string,
    orderId: string,
    date: string,
    offerId: string,
    context: Context,
): OrderCreationCancelledEvent {
    return {
        version: '1',
        id: randomUUID(),
        'detail-type': 'buyerService.orderCreationCancelled',
        source: context.functionName,
        time: new Date().toISOString(),
        region: process.env.AWS_REGION || 'eu-central-1',
        resources: [context.invokedFunctionArn],
        detail: {
            metadata: {
                domain: 'customerService',
                subdomain: 'buyer',
                service: 'buyerService',
                category: 'domainEvent',
                type: 'data',
                name: 'orderCreationCancelled',
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
