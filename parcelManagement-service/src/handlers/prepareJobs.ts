import { Context, SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { PreparePickupJobsCommandEvent, PrepareDeliveryJobsCommandEvent } from '../types/jobEvents';
import { ParcelManagement } from '../aggregates/parcelManagement';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
    try {
        // Ensure only one record is processed
        if (event.Records.length !== 1) {
            throw new Error('Batch size must be 1');
        }

        const record = event.Records[0];
        const messageBody = JSON.parse(record.body);

        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        if (messageBody['detail-type'] === 'parcelManagementService.preparePickupJobs') {
            const pickupEvent = messageBody as PreparePickupJobsCommandEvent;
            await parcelManagement.createPickupJobs(pickupEvent.detail.data.warehouseId, pickupEvent.detail.data.date);
        } else if (messageBody['detail-type'] === 'parcelManagementService.prepareDeliveryJobs') {
            const deliveryEvent = messageBody as PrepareDeliveryJobsCommandEvent;
            await parcelManagement.createDeliveryJobs(
                deliveryEvent.detail.data.warehouseId,
                deliveryEvent.detail.data.date,
            );
        } else {
            throw new Error(`Unsupported event type: ${messageBody['detail-type']}`);
        }
    } catch (err) {
        console.error('Error processing SQS message:', err);
        throw new Error(`Error processing SQS message: ${err}`);
    }
};
