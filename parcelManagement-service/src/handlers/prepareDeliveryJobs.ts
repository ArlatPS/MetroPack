import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { PrepareDeliveryJobsCommandEvent } from '../types/jobEvents';
import { putEvents } from '../datasources/parcelManagementEventBridge';
import { createDeliveryJobCreatedEvent } from '../helpers/jobEventsHelpers';
import { ParcelManagement } from '../aggregates/parcelManagement';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: PrepareDeliveryJobsCommandEvent, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        const jobs = await parcelManagement.createDeliveryJobs(event.detail.data.warehouseId, event.detail.data.date);

        await putEvents(jobs.map((job) => createDeliveryJobCreatedEvent(job, context)));
    } catch (err) {
        console.error('Error preparing delivery jobs:', err);
        throw new Error(`Error preparing delivery jobs: ${err}`);
    }
};
