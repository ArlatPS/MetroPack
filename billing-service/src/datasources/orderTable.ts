import { PutItemCommand, PutItemCommandInput, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export interface Order {
    orderId: string;
    date: string;
    price: number;
    completed: boolean;
}

// export async function putOffer(
//     offerDetails: OfferDetails,
//     ddbDocClient: DynamoDBDocumentClient,
// ): Promise<OfferWithDetails> {
//     const offerTable = process.env.OFFER_TABLE;
//
//     if (!offerTable) {
//         throw new Error('Offer table is not set');
//     }
//
//     const offer: OfferWithDetails = {
//         orderId: crypto.randomUUID(),
//         ...offerDetails,
//     };
//
//     const params: PutItemCommandInput = {
//         TableName: offerTable,
//         Item: {
//             orderId: { S: offer.orderId },
//             pickupCityCodename: { S: offer.pickupCityCodename },
//             pickupDate: { S: offer.pickupDate },
//             deliveryCityCodename: { S: offer.deliveryCityCodename },
//             deliveryDate: { S: offer.deliveryDate },
//             price: { N: offer.price.toString() },
//             ttl: { N: (Date.now() + 1000 * 60 * 60 * 24 * 3).toString() },
//         },
//     };
//
//     await ddbDocClient.send(new PutItemCommand(params));
//
//     return offer;
// }

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

export function getAddOrderTransactItem(order: Order) {
    const orderTable = process.env.ORDER_TABLE;

    if (!orderTable) {
        throw new Error('Order table is not set');
    }

    return {
        Put: {
            TableName: orderTable,
            Item: {
                orderId: order.orderId, // just use raw values
                date: order.date,
                price: order.price,
                completed: order.completed,
            },
        },
    };
}
