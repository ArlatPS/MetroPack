import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

import { ParcelEvent } from '../aggregates/parcel';

export async function getParcelEvents(parcelId: string, ddbDocClient: DynamoDBDocumentClient): Promise<ParcelEvent[]> {
    const parcelTable = process.env.PARCEL_TABLE;

    if (!parcelTable) {
        throw new Error('Vendor table is not set');
    }

    const params = {
        TableName: parcelTable,
        KeyConditionExpression: 'parcelId = :parcelId',
        ExpressionAttributeValues: {
            ':parcelId': parcelId,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));
    const items = data.Items;

    if (!items || items.length === 0) {
        throw new Error('Parcel not found.');
    }

    return items.map((item) => JSON.parse(item.event));
}

export async function putParcelEvent(
    parcelId: string,
    eventOrder: number,
    event: ParcelEvent,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const parcelTable = process.env.PARCEL_TABLE;

    if (!parcelTable) {
        throw new Error('Parcel table is not set');
    }

    const params: PutItemCommandInput = {
        TableName: parcelTable,
        Item: {
            parcelId: { S: parcelId },
            eventOrder: { N: eventOrder.toString() },
            event: { S: JSON.stringify(event) },
        },
    };

    await ddbDocClient.send(new PutItemCommand(params));
}
