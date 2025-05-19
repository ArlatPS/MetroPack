import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

interface ParcelLocation {
    parcelId: string;
    vehicleId: string;
    jobId: string;
}

export function getPutParcelLocationTransactItem(parcelId: string, vehicleId: string, jobId: string) {
    const parcelLocationTable = process.env.PARCEL_LOCATION_TABLE;

    if (!parcelLocationTable) {
        throw new Error('Parcel location table is not set');
    }

    return {
        Put: {
            TableName: parcelLocationTable,
            Item: {
                parcelId,
                vehicleId,
                jobId,
            },
        },
    };
}

export async function getParcelLocation(
    parcelId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<ParcelLocation | null> {
    const parcelLocationTable = process.env.PARCEL_LOCATION_TABLE;

    if (!parcelLocationTable) {
        throw new Error('Parcel location table is not set');
    }

    const params = {
        TableName: parcelLocationTable,
        KeyConditionExpression: 'parcelId = :parcelId',
        ExpressionAttributeValues: {
            ':parcelId': parcelId,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return (data.Items?.[0] as ParcelLocation) || null;
}
