import { BatchGetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export interface Order {
    orderId: string;
    date: string;
    price: number;
    completed: boolean;
}

export async function getOrder(orderId: string, ddbDocClient: DynamoDBDocumentClient): Promise<Order | null> {
    const orderTable = process.env.ORDER_TABLE;

    if (!orderTable) {
        throw new Error('Order table is not set');
    }

    const params = {
        TableName: orderTable,
        KeyConditionExpression: 'orderId = :orderId',
        ExpressionAttributeValues: {
            ':orderId': { S: orderId },
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));
    const items = data.Items;

    if (!items || items.length === 0) {
        return null;
    }

    return unmarshall(items[0]) as Order;
}

export async function getOrders(orders: string[], ddbDocClient: DynamoDBDocumentClient): Promise<Order[]> {
    const orderTable = process.env.ORDER_TABLE;

    if (!orderTable) {
        throw new Error('Order table is not set');
    }

    const keys = orders.map((orderId) => ({
        orderId: { S: orderId },
    }));

    const params = {
        RequestItems: {
            [orderTable]: {
                Keys: keys,
            },
        },
    };

    const data = await ddbDocClient.send(new BatchGetItemCommand(params));
    const items = data.Responses?.[orderTable];

    if (!items || items.length === 0) {
        return [];
    }

    return items.map((item) => unmarshall(item)) as Order[];
}

export function getAddOrderTransactItem(order: Order) {
    const orderTable = process.env.ORDER_TABLE;

    if (!orderTable) {
        throw new Error('Order table is not set');
    }

    return {
        Put: {
            TableName: orderTable,
            Item: {
                orderId: order.orderId,
                date: order.date,
                price: order.price,
                completed: order.completed,
            },
        },
    };
}

export async function updateOrderStatus(
    orderId: string,
    completed: boolean,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const orderTable = process.env.ORDER_TABLE;

    if (!orderTable) {
        throw new Error('Order table is not set');
    }

    const params = {
        TableName: orderTable,
        Key: {
            orderId,
        },
        UpdateExpression: 'set completed = :completed',
        ExpressionAttributeValues: {
            ':completed': completed,
        },
    };

    await ddbDocClient.send(new UpdateCommand(params));
}
