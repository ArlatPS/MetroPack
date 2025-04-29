import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { PreparePickupJobsCommandEvent } from '../types/events';
import { getPickupOrders } from '../datasources/parcelOrderTables';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const LIMIT = 60;

export const handler = async (event: PreparePickupJobsCommandEvent): Promise<void> => {
    try {
        // get pickup orders, up to limit
        const pickupOrders = await getPickupOrders(
            event.detail.data.cityCodename,
            event.detail.data.date,
            LIMIT,
            ddbDocClient,
        );
        // get available vehicles

        // make request to routing service

        // save pickup jobs

        // send event to event bus
        // about pickup jobs created
        // about PreparePickupJobsCommandEvent
    } catch (err) {
        console.error('Error creating pickup order:', err);
        throw new Error(`Error creating pickup order: ${err}`);
    }
};
