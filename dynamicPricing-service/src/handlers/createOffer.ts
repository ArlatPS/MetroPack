import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Offer } from '../aggregates/offer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

interface CreateOfferRequest {
    version: string;
    buyer: {
        id: string;
        city: string;
        location: {
            latitude: string;
            longitude: string;
        };
    };
    vendor: {
        id: string;
        city: string;
        location: {
            latitude: string;
            longitude: string;
        };
    };
}
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        if (!validateRequest(body)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Invalid request body',
                }),
            };
        }

        const offer = new Offer(ddbDocClient);
        const aa = await offer.createOffer(
            body.buyer.city,
            parseFloat(body.buyer.location.latitude),
            parseFloat(body.buyer.location.longitude),
            body.vendor.city,
            parseFloat(body.vendor.location.latitude),
            parseFloat(body.vendor.location.longitude),
        );

        return {
            statusCode: 200,
            body: JSON.stringify(aa),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            }),
        };
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateRequest(body: any): body is CreateOfferRequest {
    return (
        typeof body.version === 'string' &&
        typeof body.buyer === 'object' &&
        typeof body.buyer.id === 'string' &&
        typeof body.buyer.city === 'string' &&
        typeof body.buyer.location === 'object' &&
        typeof body.buyer.location.latitude === 'string' &&
        typeof body.buyer.location.longitude === 'string' &&
        typeof body.vendor === 'object' &&
        typeof body.vendor.id === 'string' &&
        typeof body.vendor.city === 'string' &&
        typeof body.vendor.location === 'object' &&
        typeof body.vendor.location.latitude === 'string' &&
        typeof body.vendor.location.longitude === 'string'
    );
}
