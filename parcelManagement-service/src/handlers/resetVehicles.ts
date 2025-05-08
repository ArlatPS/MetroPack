import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelManagement } from '../aggregates/parcelManagement';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: object, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        await parcelManagement.resetVehicles();
    } catch (err) {
        console.error('Error creating pickup order:', err);
        throw new Error(`Error creating pickup order: ${err}`);
    }
};
