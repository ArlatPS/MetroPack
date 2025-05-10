import { DeleteCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

import { Step } from '../../datasources/jobsTables';
import { Location } from '../../valueObjects/location';

type EventGeneratorJobStatus = 'PENDING' | 'IN_PROGRESS';

interface EventGeneratorJobStep extends Step {
    done?: boolean;
}
export interface EventGeneratorTransitJob {
    jobId: string;
    vehicleId: string;
    warehouseId: string;
    status: EventGeneratorJobStatus;
    type: 'PICKUP' | 'DELIVERY';
    steps: EventGeneratorJobStep[];
    location: Location;
    duration: number;
    started?: number;
}

export interface EventGeneratorTransferJob {
    jobId: string;
    vehicleId: string;
    status: EventGeneratorJobStatus;
    type: 'TRANSFER';
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    parcelIds: string[];
}

export async function putEventGeneratorJob(
    jobId: string,
    vehicleId: string,
    status: EventGeneratorJobStatus,
    type: 'PICKUP' | 'DELIVERY' | 'TRANSFER',
    ddbDocClient: DynamoDBDocumentClient,
    warehouseId?: string,
    steps?: EventGeneratorJobStep[],
    location?: Location,
    duration?: number,
    sourceWarehouseId?: string,
    destinationWarehouseId?: string,
    parcelIds?: string[],
): Promise<void> {
    const eventGeneratorJobTable = process.env.EVENT_GENERATOR_JOB_TABLE;

    if (!eventGeneratorJobTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorJobTable,
        Item: marshall(
            {
                jobId,
                vehicleId,
                status,
                type,
                warehouseId,
                steps,
                location,
                duration,
                sourceWarehouseId,
                destinationWarehouseId,
                parcelIds,
            },
            {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            },
        ),
    };

    await ddbDocClient.send(new PutItemCommand(params as unknown as PutItemCommandInput));
}

export async function upsertEventGeneratorTransitJob(
    job: EventGeneratorTransitJob,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const eventGeneratorJobTable = process.env.EVENT_GENERATOR_JOB_TABLE;

    if (!eventGeneratorJobTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorJobTable,
        Item: marshall(job),
    };

    await ddbDocClient.send(new PutItemCommand(params));
}

export async function getEventGeneratorJobForVehicleWithStatus(
    vehicleId: string,
    status: EventGeneratorJobStatus,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<(EventGeneratorTransitJob | EventGeneratorTransferJob)[]> {
    const eventGeneratorJobTable = process.env.EVENT_GENERATOR_JOB_TABLE;

    if (!eventGeneratorJobTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorJobTable,
        IndexName: 'VehicleStatusIndex',
        KeyConditionExpression: 'vehicleId = :vehicleId AND #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':vehicleId': vehicleId,
            ':status': status,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return (data.Items as (EventGeneratorTransitJob | EventGeneratorTransferJob)[]) || [];
}

export async function updateEventGeneratorJobStatus(
    jobId: string,
    status: EventGeneratorJobStatus,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const eventGeneratorJobTable = process.env.EVENT_GENERATOR_JOB_TABLE;

    if (!eventGeneratorJobTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorJobTable,
        Key: {
            jobId,
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': status,
        },
    };

    await ddbDocClient.send(new UpdateCommand(params));
}

export async function deleteEventGeneratorJob(jobId: string, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const eventGeneratorJobTable = process.env.EVENT_GENERATOR_JOB_TABLE;

    if (!eventGeneratorJobTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorJobTable,
        Key: {
            jobId,
        },
    };

    await ddbDocClient.send(new DeleteCommand(params));
}
