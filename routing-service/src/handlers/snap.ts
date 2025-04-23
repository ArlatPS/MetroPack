import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { snapToRoute } from '../datasources/ors';
import { AxiosError } from 'axios';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { longitude, latitude } = JSON.parse(event.body || '');
    try {
        return {
            statusCode: 200,
            body: JSON.stringify(await snapToRoute({ longitude, latitude })),
        };
    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: (error as AxiosError).response?.status || 500,
            body: JSON.stringify({
                message: 'Failed to process the request',
                error: (error as AxiosError).message,
            }),
        };
    }
};
