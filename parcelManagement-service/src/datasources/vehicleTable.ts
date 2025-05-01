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
    limit: number = 3,
    capacity: number = 50,
): Promise<Vehicle[]> {
    const vehicleTable = process.env.VEHICLE_TABLE;

    if (!vehicleTable) {
        throw new Error('Vehicle table is not set');
    }

    const params = {
        TableName: vehicleTable,
        IndexName: 'WarehouseTypeIndex',
        KeyConditionExpression: 'warehouseId = :warehouseId AND type = :type',
        FilterExpression: 'capacity > :capacity',
        ExpressionAttributeValues: {
            ':warehouseId': warehouseId,
            ':type': type,
        },
        Limit: limit,
    };

    const data = await ddbDocClient.send(new ScanCommand(params));

    return data.Items as Vehicle[];
}
