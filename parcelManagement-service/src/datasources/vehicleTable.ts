import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

type VehicleType = 'PICKUP' | 'TRANSFER' | 'DELIVERY';

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
        Limit: limit,
    };

    const data = await ddbDocClient.send(new ScanCommand(params));

    return data.Items as Vehicle[];
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
