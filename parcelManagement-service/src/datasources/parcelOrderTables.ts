import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { Location } from '../valueObjects/location';
import { Warehouse } from '../aggregates/parcel';

export interface PickupOrder {
    parcelId: string;
    cityCodename: string;
    date: string;
    location: Location;
    warehouse: Warehouse;
}

export async function getPickupOrders(
    cityCodename: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<PickupOrder[]> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    return (await getOrders(pickupOrderTable, cityCodename, date, limit, ddbDocClient)) as PickupOrder[];
}

export async function getDeliveryOrders(
    cityCodename: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<any[]> {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    return await getOrders(deliveryOrderTable, cityCodename, date, limit, ddbDocClient);
}

export async function getTransferOrders(
    cityCodename: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<any[]> {
    const transferOrderTable = process.env.TRANSFER_ORDER_TABLE;

    if (!transferOrderTable) {
        throw new Error('TransferOrderTable is not set');
    }

    return await getOrders(transferOrderTable, cityCodename, date, limit, ddbDocClient);
}

async function getOrders(
    tableName: string,
    cityCodename: string,
    date: string,
    limit: number,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<object[]> {
    const params = {
        TableName: tableName,
        IndexName: 'CityDateIndex',
        KeyConditionExpression: 'cityCodename = :cityCodename AND #date = :date',
        ExpressionAttributeNames: {
            '#date': 'date',
        },
        ExpressionAttributeValues: {
            ':cityCodename': cityCodename,
            ':date': date,
        },
        Limit: limit,
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return data.Items || [];
}

export async function putPickupOrder(order: PickupOrder, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
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

export async function deletePickupOrders(parcelIds: string[], ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const pickupOrderTable = process.env.PICKUP_ORDER_TABLE;

    if (!pickupOrderTable) {
        throw new Error('PickupOrderTable is not set');
    }

    await batchDeleteItems(pickupOrderTable, parcelIds, ddbDocClient);
}

export async function deleteDeliveryOrders(parcelIds: string[], ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const deliveryOrderTable = process.env.DELIVERY_ORDER_TABLE;

    if (!deliveryOrderTable) {
        throw new Error('DeliveryOrderTable is not set');
    }

    await batchDeleteItems(deliveryOrderTable, parcelIds, ddbDocClient);
}

export async function deleteTransferOrders(parcelIds: string[], ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const transferOrderTable = process.env.TRANSFER_ORDER_TABLE;

    if (!transferOrderTable) {
        throw new Error('TransferOrderTable is not set');
    }

    await batchDeleteItems(transferOrderTable, parcelIds, ddbDocClient);
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
