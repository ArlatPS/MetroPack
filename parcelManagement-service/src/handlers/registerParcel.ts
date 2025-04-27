import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Location } from '../valueObjects/location';
import { Parcel } from '../aggregates/parcel';
import { NotFoundError } from '../errors/NotFoundError';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}');

    if (!body.pickupLocation || !body.deliveryLocation) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'pickupLocation and deliveryLocation are required',
            }),
        };
    }

    const parcel = new Parcel(ddbDocClient, context);

    try {
        await parcel.register(
            body.pickupDate,
            new Location(body.pickupLocation.longitude, body.pickupLocation.latitude),
            body.deliveryDate,
            new Location(body.deliveryLocation.longitude, body.deliveryLocation.latitude),
        );
    } catch (err) {
        console.error(err);
        if (err instanceof NotFoundError) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'No available warehouses found',
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

    return {
        statusCode: 200,
        body: JSON.stringify(parcel.getDetails()),
    };
};
