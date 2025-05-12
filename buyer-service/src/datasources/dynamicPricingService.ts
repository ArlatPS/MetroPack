import { makeRequest } from '../helpers/requestHelpers';
import { Context } from 'node:vm';
import { createOfferAcceptedEvent } from '../helpers/eventHelpers';

interface Offer {
    offerId: string;
    pickupCityCodename: string;
    pickupDate: string;
    deliveryCityCodename: string;
    deliveryDate: string;
    price: number;
}

export async function getOffer(offerId: string): Promise<Offer> {
    const apiId = process.env.DYNAMIC_PRICING_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('DYNAMIC_PRICING_API_ID environment variable is not set');
    }

    const apiBaseUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/prod`;
    const endpoint = `${apiBaseUrl}/getOffer/${offerId}`;

    try {
        const response = await makeRequest(endpoint, 'GET');

        return response as Offer;
    } catch (e) {
        throw new Error('Failed to fetch offer: ' + e);
    }
}

export async function putOfferAcceptedEvent(offerId: string, context: Context): Promise<void> {
    const apiId = process.env.DYNAMIC_PRICING_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('DYNAMIC_PRICING_API_ID environment variable is not set');
    }

    const endpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/prod/putEvent`;

    try {
        await makeRequest(endpoint, 'POST', JSON.stringify(createOfferAcceptedEvent(offerId, context)));
    } catch (e) {
        throw new Error('Failed to put offer accepted event: ' + e);
    }
}
