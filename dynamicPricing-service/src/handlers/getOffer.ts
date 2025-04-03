import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Offer } from '../aggregates/offer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { offerId } = event.pathParameters || {};

    if (!offerId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Offer ID is required',
            }),
        };
    }

    const offer = new Offer(ddbDocClient);

    const offerWithDetails = await offer.getOfferById(offerId);

    if (!offerWithDetails) {
        return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'Offer not found',
            }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(offerWithDetails),
    };
};
