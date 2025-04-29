import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelRegisteredEvent } from '../aggregates/parcel';
import { putPickupOrder } from '../datasources/parcelOrderTables';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: ParcelRegisteredEvent): Promise<void> => {
    try {
        await putPickupOrder(
            event.detail.data.parcelId,
            event.detail.data.transitWarehouses[0].cityCodename,
            event.detail.data.pickupDate,
            event.detail.data.pickupLocation,
            event.detail.data.transitWarehouses[0],
            ddbDocClient,
        );
    } catch (err) {
        console.error('Error creating pickup order:', err);
        throw new Error(`Error creating pickup order: ${err}`);
    }
};
