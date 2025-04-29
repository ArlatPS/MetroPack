import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

export async function putEvent(
    detailType: string,
    detail: object,
    source = 'parcelManagementService',
    client: EventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION }),
): Promise<void> {
    if (!process.env.EVENT_BUS_NAME) {
        throw new Error('EVENT_BUS_NAME is not defined');
    }
    const putEventsCommand = new PutEventsCommand({
        Entries: [
            {
                EventBusName: process.env.EVENT_BUS_NAME,
                Source: source,
                DetailType: detailType,
                Detail: JSON.stringify(detail),
            },
        ],
    });

    await client.send(putEventsCommand);
}
