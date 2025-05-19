import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { Location } from '../helpers/locationHelpers';

export function getPutVehicleLocationTransactItem(vehicleId: string, jobId: string, location: Location) {
    const vehicleLocationTable = process.env.VEHICLE_LOCATION_TABLE;

    if (!vehicleLocationTable) {
        throw new Error('Vehicle location table is not set');
    }

    return {
        Put: {
            TableName: vehicleLocationTable,
            Item: {
                vehicleId,
                jobId,
                location: {
                    longitude: location.longitude,
                    latitude: location.latitude,
                },
            },
        },
    };
}
export async function updateVehicleLocation(
    vehicleId: string,
    jobId: string,
    location: Location,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const vehicleLocationTable = process.env.VEHICLE_LOCATION_TABLE;

    if (!vehicleLocationTable) {
        throw new Error('Vehicle location table is not set');
    }

    const params = {
        TableName: vehicleLocationTable,
        Key: {
            vehicleId,
            jobId,
        },
        UpdateExpression: 'SET #location = :location',
        ExpressionAttributeNames: {
            '#location': 'location',
        },
        ExpressionAttributeValues: {
            ':location': {
                longitude: location.longitude,
                latitude: location.latitude,
            },
        },
    };

    await ddbDocClient.send(new UpdateCommand(params));
}

export async function getVehicleLocation(
    vehicleId: string,
    jobId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<Location | null> {
    const vehicleLocationTable = process.env.VEHICLE_LOCATION_TABLE;

    if (!vehicleLocationTable) {
        throw new Error('Vehicle location table is not set');
    }

    const params = {
        TableName: vehicleLocationTable,
        KeyConditionExpression: 'vehicleId = :vehicleId AND jobId = :jobId',
        ExpressionAttributeValues: {
            ':vehicleId': vehicleId,
            ':jobId': jobId,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return (data.Items?.[0].location as Location) || null;
}
