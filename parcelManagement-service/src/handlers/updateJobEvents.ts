import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelManagement } from '../aggregates/parcelManagement';
import {
    DeliveryJobCompletedEvent,
    DeliveryJobStartedEvent,
    PickupJobCompletedEvent,
    PickupJobStartedEvent,
} from '../types/jobEvents';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

type JobEvents = PickupJobStartedEvent | PickupJobCompletedEvent | DeliveryJobStartedEvent | DeliveryJobCompletedEvent;

export const handler = async (event: JobEvents, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        switch (event.detail.metadata.name) {
            case 'pickupJobStarted': {
                await parcelManagement.updatePickupJobStatus(event.detail.data.jobId, 'IN_PROGRESS');
                break;
            }
            case 'pickupJobCompleted': {
                await parcelManagement.updatePickupJobStatus(event.detail.data.jobId, 'COMPLETED');
                break;
            }
            case 'deliveryJobStarted': {
                await parcelManagement.updateDeliveryJobStatus(event.detail.data.jobId, 'IN_PROGRESS');
                await parcelManagement.handleDeliveryJobStarted(event.detail.data.jobId, event.detail.data.time);
                break;
            }
            case 'deliveryJobCompleted': {
                await parcelManagement.updateDeliveryJobStatus(event.detail.data.jobId, 'COMPLETED');
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error(err);
        throw new Error(`Error updating job status: ${err}`);
    }
};
