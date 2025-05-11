import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Location } from '../valueObjects/location';
import { Tracking } from '../aggregates/tracking';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}');

    if (!body.vehicleId || !body.jobId || !body.location.longitude || !body.location.latitude) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'vehicleId, jobId, and location are required',
            }),
        };
    }

    const tracking = new Tracking(ddbDocClient);

    try {
        await tracking.updateVehicleLocation(
            body.vehicleId,
            body.jobId,
            new Location(body.location.longitude, body.location.latitude),
        );
        return {
            statusCode: 200,
            body: 'OK',
        };
    } catch (err) {
        console.error(err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: err,
            }),
        };
    }
};
