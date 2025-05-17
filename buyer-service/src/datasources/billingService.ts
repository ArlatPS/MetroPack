import { makeRequest } from '../helpers/requestHelpers';
import { Context } from 'node:vm';
import { createOrderCreatedEvent, createOrderCreationCancelledEvent } from '../helpers/eventHelpers';

export async function putOrderCreatedEvent(
    vendorId: string,
    orderId: string,
    date: string,
    offerId: string,
    context: Context,
): Promise<void> {
    const apiId = process.env.BILLING_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('BILLING_API_ID environment variable is not set');
    }

    const endpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/prod/putEvent`;

    try {
        await makeRequest(
            endpoint,
            'POST',
            JSON.stringify(createOrderCreatedEvent(vendorId, orderId, date, offerId, context)),
        );
    } catch (e) {
        throw new Error('Failed to put order created event: ' + e);
    }
}

export async function putOrderCreationCancelledEvent(
    vendorId: string,
    orderId: string,
    date: string,
    offerId: string,
    context: Context,
): Promise<void> {
    const apiId = process.env.BILLING_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('BILLING_API_ID environment variable is not set');
    }

    const endpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/prod/putEvent`;

    try {
        await makeRequest(
            endpoint,
            'POST',
            JSON.stringify(createOrderCreationCancelledEvent(vendorId, orderId, date, offerId, context)),
        );
    } catch (e) {
        throw new Error('Failed to put order created event: ' + e);
    }
}
