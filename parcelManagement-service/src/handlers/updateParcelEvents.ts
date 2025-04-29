import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Parcel, ParcelEvent } from '../aggregates/parcel';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: ParcelEvent, context: Context): Promise<void> => {
    if (!event.detail.data.parcelId) {
        throw new Error(`Invalid event data ${JSON.stringify(event)}`);
    }

    const parcel = new Parcel(ddbDocClient, context);

    try {
        await parcel.loadState(event.detail.data.parcelId);

        await parcel.saveEvent(event);
    } catch (err) {
        console.error('Failed to update parcel state:', err);
        throw new Error(`Failed to update parcel state: ${err}`);
    }
};
