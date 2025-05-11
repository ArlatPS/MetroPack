import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { putEvent } from '../datasources/parcelManagementEventBridge';

const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing request body' }),
            };
        }

        const body = JSON.parse(event.body);

        if (!body['detail-type'] || !body.source || !body.detail) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid event format' }),
            };
        }

        await putEvent(body['detail-type'], body.detail, body.source, eventBridge);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Event sent successfully' }),
        };
    } catch (error) {
        console.error('Error sending event:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};
