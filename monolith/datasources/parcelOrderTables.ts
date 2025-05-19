import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { Location } from '../helpers/locationHelpers';
import { Warehouse } from '../types/warehouse';

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
    startKey?: string,
): Promise<{ orders: Order[]; lastKey?: string }> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    const result = await getOrders(pickupOrderTable, warehouseId, date, limit, ddbDocClient, startKey);
    return {
        orders: result.orders as Order[],
        lastKey: result.lastKey,
    };
}

export async function getDeliveryOrders(
    warehouseId: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
    startKey?: string,
): Promise<{ orders: Order[]; lastKey?: string }> {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    const result = await getOrders(deliveryOrderTable, warehouseId, date, limit, ddbDocClient, startKey);
    return {
        orders: result.orders as Order[],
        lastKey: result.lastKey,
    };
}

async function getOrders(
    tableName: string,
    warehouseId: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
    startKey?: string,
): Promise<{ orders: object[]; lastKey?: string }> {
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
        ExclusiveStartKey: startKey ? { parcelId: startKey } : undefined,
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return {
        orders: data.Items || [],
        lastKey: data.LastEvaluatedKey ? data.LastEvaluatedKey.parcelId : undefined,
    };
}

export async function putPickupOrder(order: Order, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    const params = {
        TableName: pickupOrderTable,
        Item: marshall(order, { convertClassInstanceToMap: true, removeUndefinedValues: true }),
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
        Item: marshall(order, { convertClassInstanceToMap: true, removeUndefinedValues: true }),
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

export function getDeleteDeliveryOrderTransactItem(parcelId: string): object {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    return {
        Delete: {
            TableName: deliveryOrderTable,
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
