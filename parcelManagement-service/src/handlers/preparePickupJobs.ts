import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { PreparePickupJobsCommandEvent } from '../types/events';
import { getPickupOrders } from '../datasources/parcelOrderTables';
import { getAvailableVehicles } from '../datasources/vehicleTable';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const LIMIT = 50;

export const handler = async (event: PreparePickupJobsCommandEvent): Promise<void> => {
    try {
        // get pickup orders, up to limit
        const pickupOrders = await getPickupOrders(
            event.detail.data.warehouseId,
            event.detail.data.date,
            LIMIT,
            ddbDocClient,
        );
        // get available vehicles
        const availableVehicles = await getAvailableVehicles(event.detail.data.warehouseId, 'PICKUP', ddbDocClient);

        // make request to routing service

        // IN ONE TRANSACTION
        // save pickup jobs
        // update vehicle capacity

        // send event to event bus
        // about pickup jobs created
    } catch (err) {
        console.error('Error creating pickup order:', err);
        throw new Error(`Error creating pickup order: ${err}`);
    }
};
