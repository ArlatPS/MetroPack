import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface OfferDetails {
    pickupCityCodename: string;
    pickupDate: string;
    deliveryCityCodename: string;
    deliveryDate: string;
    price: number;
}

export interface OfferWithDetails extends OfferDetails {
    offerId: string;
}

export async function putOffer(
    offerDetails: OfferDetails,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<OfferWithDetails> {
    const offerTable = process.env.OFFER_TABLE;

    if (!offerTable) {
        throw new Error('Offer table is not set');
    }

    const offer: OfferWithDetails = {
        offerId: crypto.randomUUID(),
        ...offerDetails,
    };

    const params: PutItemCommandInput = {
        TableName: offerTable,
        Item: {
            offerId: { S: offer.offerId },
            pickupCityCodename: { S: offer.pickupCityCodename },
            pickupDate: { S: offer.pickupDate },
            deliveryCityCodename: { S: offer.deliveryCityCodename },
            deliveryDate: { S: offer.deliveryDate },
            price: { N: offer.price.toString() },
            ttl: { N: (Date.now() + 1000 * 60 * 60 * 24 * 3).toString() },
        },
    };

    await ddbDocClient.send(new PutItemCommand(params));

    return offer;
}
