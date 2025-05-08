import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { DeliveryJobCreatedEvent } from '../types/jobEvents';
import { Tracking } from '../aggregates/tracking';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: DeliveryJobCreatedEvent): Promise<void> => {
    const tracking = new Tracking(ddbDocClient);

    try {
        await tracking.prepareJobTracking(
            event.detail.data.jobId,
            event.detail.data.parcels,
            event.detail.data.vehicleId,
            event.detail.data.warehouseId,
        );
    } catch (err) {
        console.error('Failed to prepare delivery job tracking', err);
        throw new Error(`Failed to prepare delivery job tracking ${err}`);
    }
};
