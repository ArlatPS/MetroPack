import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Warehouse } from '../aggregates/parcel';

export async function getWarehouse(
    warehouseId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<Warehouse | null> {
    const warehouseTable = process.env.WAREHOUSE_TABLE;

    if (!warehouseTable) {
        throw new Error('Warehouse table is not set');
    }

    const params = {
        TableName: warehouseTable,
        Key: {
            id: warehouseId,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return data.Items?.[0] as Warehouse | null;
}

export async function gatAvailableWarehouses(ddbDocClient: DynamoDBDocumentClient): Promise<Warehouse[]> {
    const warehouseTable = process.env.WAREHOUSE_TABLE;

    if (!warehouseTable) {
        throw new Error('Warehouse table is not set');
    }

    const params = {
        TableName: warehouseTable,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': 'AVAILABLE',
        },
    };

    const data = await ddbDocClient.send(new ScanCommand(params));

    return data.Items as Warehouse[];
}
