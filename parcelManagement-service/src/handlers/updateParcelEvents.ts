import { Context, SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Parcel, ParcelEvent } from '../aggregates/parcel';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
    for (const record of event.Records) {
        let parcelEvent: ParcelEvent;

        try {
            parcelEvent = JSON.parse(record.body) as ParcelEvent;

            if (!parcelEvent.detail.data.parcelId) {
                throw new Error(`Invalid event data ${JSON.stringify(parcelEvent)}`);
            }

            const parcel = new Parcel(ddbDocClient, context);

            await parcel.loadState(parcelEvent.detail.data.parcelId);
            await parcel.saveEvent(parcelEvent);
        } catch (err) {
            console.error('Failed to process SQS message:', err);
            throw new Error(`Failed to process SQS message: ${err}`);
        }
    }
};
