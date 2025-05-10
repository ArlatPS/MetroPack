import { Step } from '../../datasources/jobsTables';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

interface EventGeneratorJob {
    jobId: string;
    vehicleId: string;
    status: 'PENDING' | 'IN_PROGRESS';
    type: 'PICKUP' | 'DELIVERY';
    steps: Step[];
}

interface EventGeneratorTransferJob {
    jobId: string;
    vehicleId: string;
    status: 'PENDING' | 'IN_PROGRESS';
    type: 'TRANSFER';
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    parcelIds: string[];
}

export async function putEventGeneratorJob(
    jobId: string,
    vehicleId: string,
    status: 'PENDING' | 'IN_PROGRESS',
    type: 'PICKUP' | 'DELIVERY' | 'TRANSFER',
    ddbDocClient: DynamoDBDocumentClient,
    steps?: Step[],
    sourceWarehouseId?: string,
    destinationWarehouseId?: string,
    parcelIds?: string[],
): Promise<void> {
    const eventGeneratorJobTable = process.env.EVENT_GENERATOR_JOB_TABLE;

    if (!eventGeneratorJobTable) {
        throw new Error('Event generator job table is not set');
    }

    const params: PutItemCommandInput = {
        TableName: eventGeneratorJobTable,
        Item: marshall(
            {
                jobId,
                vehicleId,
                status,
                type,
                steps,
                sourceWarehouseId,
                destinationWarehouseId,
                parcelIds,
            },
            { removeUndefinedValues: true },
        ),
    };

    await ddbDocClient.send(new PutItemCommand(params));
}

export async function getEventGeneratorJobsForVehicle(
    vehicleId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<any> {
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
            ':status': 'IN_PROGRESS',
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return data.Items;
}
