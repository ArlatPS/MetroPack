import { Location } from '../valueObjects/location';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Job {
    jobId: string;
    status: JobStatus;
    date: string;
    warehouseId: string;
    vehicleId: string;
    duration: number;
    steps: Step[];
}

interface Step {
    location: Location;
    arrivalTime: string;
    parcelId: string;
}

export function getAddPickupJobTransactItem(job: Job) {
    const pickupJobTable = process.env.PICKUP_JOB_TABLE;

    if (!pickupJobTable) {
        throw new Error('Pickup job table is not set');
    }

    return {
        Put: {
            TableName: pickupJobTable,
            Item: {
                jobId: job.jobId,
                status: job.status,
                date: job.date,
                warehouseId: job.warehouseId,
                vehicleId: job.vehicleId,
                duration: job.duration,
                steps: job.steps.map((step) => ({
                    location: {
                        longitude: step.location.longitude,
                        latitude: step.location.latitude,
                    },
                    arrivalTime: step.arrivalTime,
                    parcelId: step.parcelId,
                })),
            },
        },
    };
}

export async function updatePickupJobStatusByParcelId(
    parcelId: string,
    status: JobStatus,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const pickupJobTable = process.env.PICKUP_JOB_TABLE;

    if (!pickupJobTable) {
        throw new Error('Pickup job table is not set');
    }

    const queryParams = {
        TableName: pickupJobTable,
        IndexName: 'ParcelIdIndex',
        KeyConditionExpression: 'parcelId = :parcelId',
        ExpressionAttributeValues: {
            ':parcelId': parcelId,
        },
    };

    const queryResult = await ddbDocClient.send(new QueryCommand(queryParams));

    if (!queryResult.Items || queryResult.Items.length === 0) {
        throw new Error(`No job found with parcelId: ${parcelId}`);
    }

    const job = queryResult.Items[0];

    const updateParams = {
        TableName: pickupJobTable,
        Key: {
            jobId: job.jobId,
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': status,
        },
    };

    await ddbDocClient.send(new UpdateCommand(updateParams));
}
