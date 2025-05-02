import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

import { PreparePickupJobsCommandEvent } from '../types/events';
import { getPickupOrders } from '../datasources/parcelOrderTables';
import { getAvailableVehicles, getVehicleCapacityUpdateTransactItem } from '../datasources/vehicleTable';
import { getOptimizedJobs } from '../datasources/routingService';
import { getWarehouse } from '../datasources/warehouseTable';
import { getAddPickupJobTransactItem } from '../datasources/jobsTables';
import { putEvents } from '../datasources/parcelManagementEventBridge';
import { createPickupJobCreatedEvent } from '../helpers/jobEventsHelpers';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const LIMIT = 50;

export const handler = async (event: PreparePickupJobsCommandEvent, context: Context): Promise<void> => {
    try {
        const warehouse = await getWarehouse(event.detail.data.warehouseId, ddbDocClient);

        if (!warehouse) {
            throw new Error(`Warehouse ${event.detail.data.warehouseId} not found`);
        }

        const pickupOrders = await getPickupOrders(
            event.detail.data.warehouseId,
            event.detail.data.date,
            LIMIT,
            ddbDocClient,
        );
        console.log(pickupOrders);

        const availableVehicles = await getAvailableVehicles(event.detail.data.warehouseId, 'PICKUP', ddbDocClient);

        console.log(availableVehicles);

        const { jobs, vehicles } = await getOptimizedJobs(availableVehicles, warehouse, pickupOrders);

        console.log(JSON.stringify(jobs, null, 2));

        const vehicleCapacityUpdateTransactItems = vehicles.map((vehicle) =>
            getVehicleCapacityUpdateTransactItem(vehicle),
        );
        const pickupJobsSaveTransactItems = jobs.map((job) => getAddPickupJobTransactItem(job));

        console.log(pickupJobsSaveTransactItems);
        await ddbDocClient.send(
            new TransactWriteCommand({
                TransactItems: [...vehicleCapacityUpdateTransactItems, ...pickupJobsSaveTransactItems],
            }),
        );

        await putEvents(jobs.map((job) => createPickupJobCreatedEvent(job, context)));
    } catch (err) {
        console.error('Error preparing pickup jobs:', err);
        throw new Error(`Error preparing pickup jobs: ${err}`);
    }
};
