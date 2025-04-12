import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Customer } from '../aggregates/customer';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { vendorId } = JSON.parse(event.body || '');

    if (!vendorId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing vendorId',
            }),
        };
    }

    const customer = new Customer(ddbDocClient);

    const bills = await customer.getBills(vendorId);

    return {
        statusCode: 200,
        body: JSON.stringify({
            bills,
        }),
    };
};
