import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createDeliveryJobs, Delivery, Vehicle, Warehouse } from '../datasources/ors';
import { AxiosError } from 'axios';

interface RequestEvent {
    vehicles: Vehicle[];
    warehouse: Warehouse;
    deliveries: Delivery[];
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}') as RequestEvent;

    try {
        return {
            statusCode: 200,
            body: JSON.stringify(await createDeliveryJobs(body.vehicles, body.warehouse, body.deliveries)),
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
