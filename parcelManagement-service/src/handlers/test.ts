import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSnap } from '../datasources/routingService';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}');

    return {
        statusCode: 200,
        body: JSON.stringify(
            await getSnap({
                longitude: body.longitude,
                latitude: body.latitude,
            }),
        ),
    };
};
