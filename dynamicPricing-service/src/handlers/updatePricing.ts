import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Offer } from '../aggregates/offer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

interface OfferAcceptedEvent {
    data: {
        offerId: string;
    };
}

interface OfferAcceptCancelledEvent {
    data: {
        offerId: string;
    };
}

export const handler = async (
    event:
        | EventBridgeEvent<'buyerService.offerAccepted', OfferAcceptedEvent>
        | EventBridgeEvent<'buyerService.offerAcceptCancelled', OfferAcceptCancelledEvent>,
): Promise<void> => {
    const { offerId } = event.detail.data;

    if (!offerId) {
        throw new Error(`Invalid event data ${JSON.stringify(event)}`);
    }
    const offer = new Offer(ddbDocClient);

    switch (event['detail-type']) {
        case 'buyerService.offerAccepted':
            await offer.handleOfferAccepted(offerId);
            break;
        case 'buyerService.offerAcceptCancelled':
            await offer.handleOfferAcceptCancelled(offerId);
            break;
        default:
            throw new Error(`Unknown event type: ${event['detail-type']}`);
    }
};
