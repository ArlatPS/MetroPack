import { makeRequest } from '../helpers/requestHelpers';
import { Context } from 'node:vm';
import { createOrderCreatedEvent } from '../helpers/eventHelpers';

export async function putOrderCreatedEvent(
    vendorId: string,
    orderId: string,
    date: string,
    offerId: string,
    context: Context,
): Promise<void> {
    const apiId = process.env.BILLING_SERVICE_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('BILLING_SERVICE_API_ID environment variable is not set');
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
