import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSnap } from '../datasources/routingService';
import { Location } from '../valueObjects/location';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}');

    return {
        statusCode: 200,
        body: JSON.stringify(await getSnap(new Location(body.longitude, body.latitude))),
    };
};
