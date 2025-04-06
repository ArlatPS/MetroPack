import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Customer } from '../aggregates/customer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

interface OrderCreatedEvent {
    data: {
        vendorId: string;
        orderId: string;
        date: string;
        offerId: string;
    };
}

export const handler = async (
    event: EventBridgeEvent<'vendorService.orderCreated', OrderCreatedEvent>,
    context: Context,
): Promise<void> => {
    const { vendorId, orderId, date, offerId } = event.detail.data;

    if (!vendorId || !orderId || !date || !offerId) {
        throw new Error(`Invalid event data ${event}`);
    }

    const customer = new Customer(ddbDocClient);

    await customer.addOrder(vendorId, orderId, date, offerId);
};
