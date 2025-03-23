import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

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

        const putEventsCommand = new PutEventsCommand({
            Entries: [
                {
                    EventBusName: process.env.EVENT_BUS_NAME,
                    Source: body.source,
                    DetailType: body['detail-type'],
                    Detail: JSON.stringify(body.detail),
                },
            ],
        });

        await eventBridge.send(putEventsCommand);

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
