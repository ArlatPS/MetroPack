import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createDeliveryJobs } from '../datasources/ors';
import { AxiosError } from 'axios';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: JSON.stringify(
                await createDeliveryJobs(
                    [
                        { id: '1', capacity: 20 },
                        { id: '2', capacity: 20 },
                        { id: '3', capacity: 20 },
                    ],
                    {
                        id: '1',
                        location: {
                            longitude: 19.928709,
                            latitude: 50.050259,
                        },
                        timeWindow: [0, 5000],
                    },
                    Array.from({ length: 50 }, (_, i) => {
                        return {
                            id: `job ${i + 1}`,
                            location: {
                                longitude: Number((19.928709 + Math.random() * 0.1).toFixed(5)),
                                latitude: Number((50.050259 + Math.random() * 0.1).toFixed(5)),
                            },
                        };
                    }),
                ),
            ),
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
