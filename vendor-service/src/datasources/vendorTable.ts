import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { VendorEvent } from '../aggregates/vendor';
import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

export async function getVendorEvents(vendorId: string, ddbDocClient: DynamoDBDocumentClient): Promise<VendorEvent[]> {
    const vendorTable = process.env.VENDOR_TABLE;

    if (!vendorTable) {
        throw new Error('Vendor table is not set');
    }

    const params = {
        TableName: vendorTable,
        KeyConditionExpression: 'vendorId = :vendorId',
        ExpressionAttributeValues: {
            ':vendorId': vendorId,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));
    const items = data.Items;

    if (!items || items.length === 0) {
        throw new Error('Vendor not found.');
    }

    return items.map((item) => JSON.parse(item.event));
}

export async function putVendorEvent(
    vendorId: string,
    eventOrder: number,
    event: VendorEvent,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const vendorTable = process.env.VENDOR_TABLE;

    if (!vendorTable) {
        throw new Error('Vendor table is not set');
    }

    const params: PutItemCommandInput = {
        TableName: vendorTable,
        Item: {
            vendorId: { S: vendorId },
            eventOrder: { N: eventOrder.toString() },
            event: { S: JSON.stringify(event) },
        },
    };

    await ddbDocClient.send(new PutItemCommand(params));
}
