import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { PreparePickupJobsCommandEvent } from '../types/events';
import { putEvents } from '../datasources/parcelManagementEventBridge';
import { createPickupJobCreatedEvent } from '../helpers/jobEventsHelpers';
import { ParcelManagement } from '../aggregates/parcelManagement';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: PreparePickupJobsCommandEvent, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        const jobs = await parcelManagement.createPickupJobs(event.detail.data.warehouseId, event.detail.data.date);

        await putEvents(jobs.map((job) => createPickupJobCreatedEvent(job, context)));
    } catch (err) {
        console.error('Error preparing pickup jobs:', err);
        throw new Error(`Error preparing pickup jobs: ${err}`);
    }
};
