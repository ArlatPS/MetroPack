import { PutItemCommand, PutItemCommandInput, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

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
        offerId: randomUUID(),
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
            price: { N: offer.price.toFixed(2) },
            ttl: { N: (Math.round(Date.now() / 1000) + 60 * 60 * 24).toString() },
        },
    };

    await ddbDocClient.send(new PutItemCommand(params));

    return offer;
}

export async function getOffer(
    offerId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<OfferWithDetails | null> {
    const offerTable = process.env.OFFER_TABLE;

    if (!offerTable) {
        throw new Error('Offer table is not set');
    }

    const params = {
        TableName: offerTable,
        KeyConditionExpression: 'offerId = :offerId',
        ExpressionAttributeValues: {
            ':offerId': { S: offerId },
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));
    const items = data.Items;

    if (!items || items.length === 0) {
        return null;
    }

    const offer = unmarshall(items[0]);

    delete offer.ttl;

    return offer as OfferWithDetails;
}
