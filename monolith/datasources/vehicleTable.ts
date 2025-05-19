import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { chunkArray } from '../helpers/arrayHelpers';

type VehicleType = 'PICKUP' | 'DELIVERY';

export interface Vehicle {
    vehicleId: string;
    warehouseId: string;
    type: VehicleType;
    capacity: number;
}

export async function getAvailableVehicles(
    warehouseId: string,
    type: VehicleType,
    ddbDocClient: DynamoDBDocumentClient,
    limit = 3,
    capacity = 50,
): Promise<Vehicle[]> {
    const vehicleTable = process.env.VEHICLE_TABLE;

    if (!vehicleTable) {
        throw new Error('Vehicle table is not set');
    }

    const params = {
        TableName: vehicleTable,
        FilterExpression: 'warehouseId = :warehouseId AND #type = :type AND #capacity > :capacity',
        ExpressionAttributeNames: {
            '#type': 'type',
            '#capacity': 'capacity',
        },
        ExpressionAttributeValues: {
            ':warehouseId': warehouseId,
            ':type': type,
            ':capacity': capacity,
        },
    };

    const data = await ddbDocClient.send(new ScanCommand(params));

    return (data.Items || []).slice(0, limit) as Vehicle[];
}

export function getVehicleCapacityUpdateTransactItem(vehicle: Vehicle) {
    const vehicleTable = process.env.VEHICLE_TABLE;

    if (!vehicleTable) {
        throw new Error('Vehicle table is not set');
    }

    return {
        Update: {
            TableName: vehicleTable,
            Key: {
                vehicleId: vehicle.vehicleId,
            },
            UpdateExpression: `SET #capacity = :val`,
            ExpressionAttributeNames: {
                '#capacity': 'capacity',
            },
            ExpressionAttributeValues: {
                ':val': vehicle.capacity,
            },
        },
    };
}

export async function resetVehiclesCapacity(ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const vehicleTable = process.env.VEHICLE_TABLE;

    if (!vehicleTable) {
        throw new Error('Vehicle table is not set');
    }

    const params = {
        TableName: vehicleTable,
        ProjectionExpression: 'vehicleId',
    };

    const data = await ddbDocClient.send(new ScanCommand(params));

    const vehicleIds = data.Items?.map((item) => item.vehicleId) || [];

    const chunks = chunkArray(vehicleIds, 10);

    for (const chunk of chunks) {
        const transactItems = chunk.map((vehicleId) => ({
            Update: {
                TableName: vehicleTable,
                Key: { vehicleId },
                UpdateExpression: `SET #capacity = :val`,
                ExpressionAttributeNames: { '#capacity': 'capacity' },
                ExpressionAttributeValues: { ':val': 8 * 60 * 60 },
            },
        }));

        await ddbDocClient.send(
            new TransactWriteCommand({
                TransactItems: transactItems,
            }),
        );
    }
}
