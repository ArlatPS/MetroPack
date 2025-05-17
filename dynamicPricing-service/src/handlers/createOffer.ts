import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Offer } from '../aggregates/offer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        if (!body.pickupCityCodename || !body.deliveryCityCodename) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Invalid request body',
                }),
            };
        }

        const offer = new Offer(ddbDocClient);
        const offers = await offer.createOffer(body.pickupCityCodename, body.deliveryCityCodename);

        return {
            statusCode: 200,
            body: JSON.stringify(offers),
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
