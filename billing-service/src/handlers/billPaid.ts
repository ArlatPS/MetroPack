import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Customer } from '../aggregates/customer';
import { Month } from '../valueObjects';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

interface BillPaidEvent {
    data: {
        customerId: string;
        month: string;
        amount: number;
    };
}

export const handler = async (event: EventBridgeEvent<'billingService.billPaid', BillPaidEvent>): Promise<void> => {
    const { customerId, month, amount } = event.detail.data;

    if (!customerId || !month || !amount) {
        throw new Error(`Invalid event data ${JSON.stringify(event)}`);
    }

    if (!Month.validateMonth(month)) {
        throw new Error(`Invalid month format. Expected YYYY-MM`);
    }

    const customer = new Customer(ddbDocClient);

    await customer.payBill(customerId, month, amount);
};
