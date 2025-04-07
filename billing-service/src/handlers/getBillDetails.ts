import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Customer } from '../aggregates/customer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { vendorId, month } = JSON.parse(event.body || '');

    if (!vendorId || !month) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing vendorId or month',
            }),
        };
    }

    const customer = new Customer(ddbDocClient);

    return {
        statusCode: 200,
        body: JSON.stringify({
            bill: await customer.getBillDetails(vendorId, month),
        }),
    };
};
