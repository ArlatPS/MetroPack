import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelRegisteredEvent } from '../aggregates/parcel';
import { putPickupOrder } from '../datasources/parcelOrderTables';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: ParcelRegisteredEvent): Promise<void> => {
    try {
        await putPickupOrder(
            {
                parcelId: event.detail.data.parcelId,
                warehouseId: event.detail.data.transitWarehouses[0].warehouseId,
                date: event.detail.data.pickupDate,
                location: event.detail.data.pickupLocation,
                warehouse: event.detail.data.transitWarehouses[0],
            },
            ddbDocClient,
        );
    } catch (err) {
        console.error('Error creating pickup order:', err);
        throw new Error(`Error creating pickup order: ${err}`);
    }
};
