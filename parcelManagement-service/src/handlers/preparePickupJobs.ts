import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { PreparePickupJobsCommandEvent } from '../types/events';
import { getPickupOrders } from '../datasources/parcelOrderTables';
import { getAvailableVehicles } from '../datasources/vehicleTable';
import { getOptimizedJobs } from '../datasources/routingService';
import { getWarehouse } from '../datasources/warehouseTable';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const LIMIT = 50;

export const handler = async (event: PreparePickupJobsCommandEvent): Promise<void> => {
    try {
        const warehouse = await getWarehouse(event.detail.data.warehouseId, ddbDocClient);

        if (!warehouse) {
            throw new Error(`Warehouse ${event.detail.data.warehouseId} not found`);
        }

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
        const jobs = await getOptimizedJobs(availableVehicles, warehouse, pickupOrders);

        console.log(JSON.stringify(jobs, null, 2));

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
