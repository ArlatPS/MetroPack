import { PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface Bill {
    customerId: string;
    month: string;
    totalPrice: number;
    totalPaid: number;
}

export async function getBill(
    customerId: string,
    month: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<Bill | null> {
    const billTable = process.env.BILL_TABLE;

    if (!billTable) {
        throw new Error('Order table is not set');
    }

    const params = {
        TableName: billTable,
        KeyConditionExpression: '#customerId = :customerId AND #month = :month',
        ExpressionAttributeNames: {
            '#customerId': 'customerId',
            '#month': 'month',
        },
        ExpressionAttributeValues: {
            ':customerId': { S: customerId },
            ':month': { S: month },
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));
    const items = data.Items;

    if (!items || items.length === 0) {
        return null;
    }

    return unmarshall(items[0]) as Bill;
}

export function getAddOrderToBillTransactItem(customerId: string, month: string, orderId: string, price: number) {
    const billTable = process.env.BILL_TABLE;

    if (!billTable) {
        throw new Error('Bill table is not set');
    }

    return {
        Update: {
            TableName: billTable,
            Key: {
                customerId: customerId,
                month: month,
            },
            UpdateExpression: `ADD totalPrice :val SET orders = list_append(if_not_exists(orders, :emptyList), :orderId)`,
            ExpressionAttributeValues: {
                ':val': price,
                ':orderId': [orderId],
                ':emptyList': [],
            },
        },
    };
}

export async function createBill(bill: Bill, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const billTable = process.env.BILL_TABLE;

    if (!billTable) {
        throw new Error('Bill table is not set');
    }

    const params = {
        TableName: billTable,
        Item: {
            customerId: { S: bill.customerId },
            month: { S: bill.month },
            totalPrice: { N: bill.totalPrice.toString() },
            totalPaid: { N: bill.totalPaid.toString() },
        },
        ConditionExpression: 'attribute_not_exists(customerId) AND attribute_not_exists(#m)',
        ExpressionAttributeNames: {
            '#m': 'month',
        },
    };

    await ddbDocClient.send(new PutItemCommand(params));
}
