import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelManagement } from '../aggregates/parcelManagement';
import { ParcelDeliveredToWarehouseEvent, ParcelTransferCompletedEvent } from '../aggregates/parcel';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

type Events = ParcelDeliveredToWarehouseEvent | ParcelTransferCompletedEvent;

export const handler = async (event: Events, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        const warehouseId =
            event.detail.metadata.name === 'parcelDeliveredToWarehouse'
                ? (event as ParcelDeliveredToWarehouseEvent).detail.data.warehouse.warehouseId
                : (event as ParcelTransferCompletedEvent).detail.data.destinationWarehouse.warehouseId;

        await parcelManagement.handleParcelDeliveredToWarehouse(event.detail.data.parcelId, warehouseId);
    } catch (err) {
        console.error(`Error updating pickup job for parcel ${event.detail.data.parcelId}`, err);
        throw new Error(`Error updating pickup job for parcel ${event.detail.data.parcelId} ${err}`);
    }
};
