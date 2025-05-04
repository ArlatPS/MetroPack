import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelRegisteredEvent } from '../aggregates/parcel';
import { Context } from 'aws-lambda';
import { ParcelManagement } from '../aggregates/parcelManagement';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: ParcelRegisteredEvent, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        await parcelManagement.createPickupOrder(
            event.detail.data.parcelId,
            event.detail.data.transitWarehouses[0].warehouseId,
            event.detail.data.pickupDate,
            event.detail.data.pickupLocation,
            event.detail.data.transitWarehouses[0],
        );
    } catch (err) {
        console.error('Error creating pickup order:', err);
        throw new Error(`Error creating pickup order: ${err}`);
    }
};
