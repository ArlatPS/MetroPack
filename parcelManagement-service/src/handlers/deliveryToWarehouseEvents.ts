import { Context, SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelManagement } from '../aggregates/parcelManagement';
import { ParcelDeliveredToWarehouseEvent, ParcelTransferCompletedEvent } from '../aggregates/parcel';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

type Events = ParcelDeliveredToWarehouseEvent | ParcelTransferCompletedEvent;

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
    for (const record of event.Records) {
        try {
            const messageBody = JSON.parse(record.body) as Events;
            const parcelManagement = new ParcelManagement(ddbDocClient, context);

            const warehouseId =
                messageBody.detail.metadata.name === 'parcelDeliveredToWarehouse'
                    ? (messageBody as ParcelDeliveredToWarehouseEvent).detail.data.warehouse.warehouseId
                    : (messageBody as ParcelTransferCompletedEvent).detail.data.destinationWarehouse.warehouseId;

            await parcelManagement.handleParcelDeliveredToWarehouse(messageBody.detail.data.parcelId, warehouseId);
        } catch (err) {
            console.error('Error processing SQS message:', err);
            throw new Error(`Error processing SQS message: ${err}`);
        }
    }
};
