import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { NotFoundError } from '../errors/NotFoundError';
import { Tracking } from '../aggregates/tracking';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const parcelId = event.pathParameters?.parcelId;

    if (!parcelId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'parcelId is required',
            }),
        };
    }

    const tracking = new Tracking(ddbDocClient);

    try {
        const result = await tracking.getParcelLocation(parcelId);
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error(err);
        if (err instanceof NotFoundError) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Parcel not found',
                }),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: err,
            }),
        };
    }
};
