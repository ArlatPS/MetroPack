import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelManagement } from '../aggregates/parcelManagement';
import { ParcelPickedUpEvent } from '../aggregates/parcel';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: ParcelPickedUpEvent, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        await parcelManagement.updatePickupJobStatusByParcelId(event.detail.data.parcelId, 'IN_PROGRESS');
    } catch (err) {
        console.error(`Error updating pickup job for parcel ${event.detail.data.parcelId}`, err);
        throw new Error(`Error updating pickup job for parcel ${event.detail.data.parcelId} ${err}`);
    }
};
