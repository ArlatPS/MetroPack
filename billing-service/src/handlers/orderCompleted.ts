import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Customer } from '../aggregates/customer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

interface OrderCompletedEvent {
    data: {
        orderId: string;
    };
}

export const handler = async (
    event: EventBridgeEvent<'vendorService.orderCompleted', OrderCompletedEvent>,
): Promise<void> => {
    const { orderId } = event.detail.data;

    if (!orderId) {
        throw new Error(`Invalid event data ${JSON.stringify(event)}`);
    }

    const customer = new Customer(ddbDocClient);

    await customer.markOrderAsCompleted(orderId);
};
