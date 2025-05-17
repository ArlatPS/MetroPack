import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
    ParcelDeliveredEvent,
    ParcelDeliveredToWarehouseEvent,
    ParcelDeliveryStartedEvent,
    ParcelPickedUpEvent,
    ParcelTransferCompletedEvent,
    ParcelTransferStartedEvent,
} from '../aggregates/parcel';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

type ParcelEvent =
    | ParcelPickedUpEvent
    | ParcelTransferStartedEvent
    | ParcelDeliveryStartedEvent
    | ParcelDeliveredEvent
    | ParcelDeliveredToWarehouseEvent
    | ParcelTransferCompletedEvent;

export const handler = async (event: ParcelEvent) => {
    if (!process.env.DELIVERY_TO_WAREHOUSE_EVENTS_QUEUE_URL || !process.env.UPDATE_PARCEL_EVENTS_QUEUE_URL) {
        console.error('Missing environment variables for SQS queue URLs');
        return;
    }

    const parcelId = event.detail.data.parcelId;

    async function sendMessageToSQS(queueUrl: string): Promise<void> {
        await sqsClient.send(
            new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(event),
                MessageGroupId: parcelId,
            }),
        );
    }

    if (
        event.detail.metadata.name === 'parcelDeliveredToWarehouse' ||
        event.detail.metadata.name === 'parcelTransferCompleted'
    ) {
        await sendMessageToSQS(process.env.DELIVERY_TO_WAREHOUSE_EVENTS_QUEUE_URL);
    }

    await sendMessageToSQS(process.env.UPDATE_PARCEL_EVENTS_QUEUE_URL);
};
