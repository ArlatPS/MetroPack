import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ParcelManagement } from '../aggregates/parcelManagement';
import { TransferJobCompletedEvent, TransferJobStartedEvent } from '../types/jobEvents';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

type TransferEvents = TransferJobStartedEvent | TransferJobCompletedEvent;

export const handler = async (event: TransferEvents, context: Context): Promise<void> => {
    try {
        const parcelManagement = new ParcelManagement(ddbDocClient, context);

        switch (event.detail.metadata.name) {
            case 'transferJobStarted': {
                await parcelManagement.handleTransferJobStarted(
                    event.detail.data.jobId,
                    event.detail.data.time,
                    event.detail.data.sourceWarehouseId,
                    event.detail.data.destinationWarehouseId,
                );
                break;
            }
            case 'transferJobCompleted': {
                await parcelManagement.handleTransferJobCompleted(
                    event.detail.data.jobId,
                    event.detail.data.time,
                    event.detail.data.sourceWarehouseId,
                    event.detail.data.destinationWarehouseId,
                );
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error(err);
        throw new Error(`Error updating job status: ${err}`);
    }
};
