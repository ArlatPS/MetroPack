import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { Location } from '../valueObjects/location';

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

interface Step {
    location: Location;
    arrivalTime: string;
    parcelId: string;
}

export interface TransferJob {
    jobId: string;
    status: JobStatus;
    date: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    parcelIds: string[];
}

export interface Job {
    jobId: string;
    status: JobStatus;
    date: string;
    warehouseId: string;
    vehicleId: string;
    duration: number;
    steps: Step[];
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

export async function updatePickupJobStatus(
    pickupJobId: string,
    status: JobStatus,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const pickupJobTable = process.env.PICKUP_JOB_TABLE;

    const updateParams = {
        TableName: pickupJobTable,
        Key: {
            jobId: pickupJobId,
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

// export async function getPickupJobByParcelId(
//     parcelId: string,
//     ddbDocClient: DynamoDBDocumentClient,
// ): Promise<Job | null> {
//     const pickupJobTable = process.env.PICKUP_JOB_TABLE;
//
//     if (!pickupJobTable) {
//         throw new Error('Pickup job table is not set');
//     }
//
//     const queryParams = {
//         TableName: pickupJobTable,
//         IndexName: 'ParcelIdIndex',
//         KeyConditionExpression: 'parcelId = :parcelId',
//         ExpressionAttributeValues: {
//             ':parcelId': parcelId,
//         },
//     };
//
//     const queryResult = await ddbDocClient.send(new QueryCommand(queryParams));
//
//     if (!queryResult.Items || queryResult.Items.length === 0) {
//         return null;
//     }
//
//     return queryResult.Items[0] as Job;
// }

export async function getTransferJob(transferJobId: string, ddbDocClient: DynamoDBDocumentClient): Promise<Job | null> {
    const transferJobTable = process.env.TRANSFER_JOB_TABLE;

    if (!transferJobTable) {
        throw new Error('Transfer job table is not set');
    }

    const queryParams = {
        TableName: transferJobTable,
        KeyConditionExpression: 'jobId = :jobId',
        ExpressionAttributeValues: {
            ':jobId': transferJobId,
        },
    };

    const queryResult = await ddbDocClient.send(new QueryCommand(queryParams));

    if (!queryResult.Items || queryResult.Items.length === 0) {
        return null;
    }

    return queryResult.Items[0] as Job;
}

export async function getTransferJobByConnection(
    connection: string,
    date: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<TransferJob | null> {
    const transferJobTable = process.env.TRANSFER_JOB_TABLE;
    if (!transferJobTable) {
        throw new Error('Transfer job table is not set');
    }
    const queryParams = {
        TableName: transferJobTable,
        IndexName: 'ConnectionDateIndex',
        KeyConditionExpression: 'connection = :connection AND #date = :date',
        ExpressionAttributeNames: {
            '#date': 'date',
        },
        ExpressionAttributeValues: {
            ':connection': connection,
            ':date': date,
        },
    };
    const queryResult = await ddbDocClient.send(new QueryCommand(queryParams));
    if (!queryResult.Items || queryResult.Items.length === 0) {
        return null;
    }
    return queryResult.Items[0] as TransferJob;
}

export async function addParcelToTransferJob(
    parcelId: string,
    transferJobId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const transferJobTable = process.env.TRANSFER_JOB_TABLE;

    if (!transferJobTable) {
        throw new Error('Transfer job table is not set');
    }

    const updateParams = {
        TableName: transferJobTable,
        Key: {
            jobId: transferJobId,
        },
        UpdateExpression: 'SET parcelIds = list_append(if_not_exists(parcelIds, :empty_list), :parcelId)',
        ExpressionAttributeValues: {
            ':parcelId': [parcelId],
            ':empty_list': [],
        },
    };

    await ddbDocClient.send(new UpdateCommand(updateParams));
}

export async function addTransferJob(job: TransferJob, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const transferJobTable = process.env.TRANSFER_JOB_TABLE;

    if (!transferJobTable) {
        throw new Error('Transfer job table is not set');
    }

    const params = {
        TableName: transferJobTable,
        Item: marshall(job),
    };

    await ddbDocClient.send(new PutItemCommand(params));
}

export async function updateTransferJobStatus(
    transferJobId: string,
    status: JobStatus,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const transferJobTable = process.env.TRANSFER_JOB_TABLE;
    if (!transferJobTable) {
        throw new Error('Transfer job table is not set');
    }
    const updateParams = {
        TableName: transferJobTable,
        Key: {
            jobId: transferJobId,
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
