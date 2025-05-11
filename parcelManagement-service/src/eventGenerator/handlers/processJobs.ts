import { Context, SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { DeliveryJobCreatedEvent, PickupJobCreatedEvent, TransferJobCreatedEvent } from '../../types/jobEvents';
import { EventGenerator } from '../aggregates/eventGenerator';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

type JobCreatedEvent = PickupJobCreatedEvent | TransferJobCreatedEvent | DeliveryJobCreatedEvent;

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
    const eventGenerator = new EventGenerator(ddbDocClient, context, eventBridgeClient);

    for (const record of event.Records) {
        let jobCreatedEvent: JobCreatedEvent;
        try {
            jobCreatedEvent = JSON.parse(record.body) as JobCreatedEvent;

            switch (jobCreatedEvent.detail.metadata.name) {
                case 'pickupJobCreated':
                    await eventGenerator.processPickupJob(jobCreatedEvent.detail.data.jobId);
                    break;
                case 'deliveryJobCreated':
                    await eventGenerator.processDeliveryJob(jobCreatedEvent.detail.data.jobId);
                    break;
                case 'transferJobCreated':
                    const data = (jobCreatedEvent as TransferJobCreatedEvent).detail.data;
                    await eventGenerator.processTransferJob(
                        data.jobId,
                        data.sourceWarehouseId,
                        data.destinationWarehouseId,
                    );
                    break;
                default:
                    throw new Error(`Unknown job type: ${jobCreatedEvent.detail.metadata}`);
            }
        } catch (err) {
            console.error('Failed to process SQS message:', err);
            throw new Error(`Failed to process SQS message: ${err}`);
        }
    }
};
