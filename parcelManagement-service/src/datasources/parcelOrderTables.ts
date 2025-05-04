import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { Location } from '../valueObjects/location';
import { Warehouse } from '../aggregates/parcel';

export interface Order {
    parcelId: string;
    warehouseId: string;
    date: string;
    location: Location;
    warehouse: Warehouse;
}

export async function getPickupOrders(
    warehouseId: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<Order[]> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    return (await getOrders(pickupOrderTable, warehouseId, date, limit, ddbDocClient)) as Order[];
}

export async function getDeliveryOrders(
    warehouseId: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<Order[]> {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    return (await getOrders(deliveryOrderTable, warehouseId, date, limit, ddbDocClient)) as Order[];
}

async function getOrders(
    tableName: string,
    warehouseId: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<object[]> {
    const params = {
        TableName: tableName,
        IndexName: 'WarehouseDateIndex',
        KeyConditionExpression: 'warehouseId = :warehouseId AND #date = :date',
        ExpressionAttributeNames: {
            '#date': 'date',
        },
        ExpressionAttributeValues: {
            ':warehouseId': warehouseId,
            ':date': date,
        },
        Limit: limit,
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return data.Items || [];
}

export async function putPickupOrder(order: Order, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    const params = {
        TableName: pickupOrderTable,
        Item: marshall(order),
    };

    await ddbDocClient.send(new PutItemCommand(params));
}

export async function putDeliveryOrder(order: Order, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    const params = {
        TableName: deliveryOrderTable,
        Item: marshall(order),
    };

    await ddbDocClient.send(new PutItemCommand(params));
}

export async function deletePickupOrders(parcelIds: string[], ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    await batchDeleteItems(pickupOrderTable, parcelIds, ddbDocClient);
}

export function getDeletePickupOrderTransactItem(parcelId: string): object {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    return {
        Delete: {
            TableName: pickupOrderTable,
            Key: {
                parcelId,
            },
        },
    };
}

export async function deleteDeliveryOrders(parcelIds: string[], ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    await batchDeleteItems(deliveryOrderTable, parcelIds, ddbDocClient);
}

async function batchDeleteItems(
    tableName: string,
    itemIds: string[],
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const BATCH_SIZE = 25;
    const batches = [];

    for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const batch = itemIds.slice(i, i + BATCH_SIZE).map((itemId) => ({
            DeleteRequest: {
                Key: { parcelId: itemId },
            },
        }));
        batches.push(batch);
    }

    for (const batch of batches) {
        const params = {
            RequestItems: {
                [tableName]: batch,
            },
        };

        await ddbDocClient.send(new BatchWriteCommand(params));
    }
}
