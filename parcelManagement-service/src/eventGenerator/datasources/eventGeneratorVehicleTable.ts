import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

export async function putEventGeneratorVehicle(vehicleId: string, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const eventGeneratorVehicleTable = process.env.EVENT_GENERATOR_VEHICLE_TABLE;

    if (!eventGeneratorVehicleTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorVehicleTable,
        Item: marshall({
            vehicleId,
        }),
    };

    await ddbDocClient.send(new PutItemCommand(params));
}

export async function getEventGeneratorVehicleIds(
    ddbDocClient: DynamoDBDocumentClient,
    lastEvaluatedKey?: string,
): Promise<{ vehicleIds: string[]; lastKey?: string }> {
    const eventGeneratorVehicleTable = process.env.EVENT_GENERATOR_VEHICLE_TABLE;

    if (!eventGeneratorVehicleTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorVehicleTable,
        Limit: 20,
        ExclusiveStartKey: lastEvaluatedKey ? { vehicleId: lastEvaluatedKey } : undefined,
    };

    const result = await ddbDocClient.send(new ScanCommand(params));

    return {
        vehicleIds: result.Items?.map((item) => item.vehicleId as string) || [],
        lastKey: result.LastEvaluatedKey?.vehicleId,
    };
}

export async function deleteEventGeneratorVehicle(
    vehicleId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const eventGeneratorVehicleTable = process.env.EVENT_GENERATOR_VEHICLE_TABLE;

    if (!eventGeneratorVehicleTable) {
        throw new Error('Event generator job table is not set');
    }

    const params = {
        TableName: eventGeneratorVehicleTable,
        Key: {
            vehicleId,
        },
    };

    await ddbDocClient.send(new DeleteCommand(params));
}
