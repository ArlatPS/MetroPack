import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { getBuyer } from '../datasources/buyerTable';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { email } = event.pathParameters || {};

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Email in path is required',
            }),
        };
    }

    const buyer = await getBuyer(email, ddbDocClient);

    if (!buyer) {
        return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'Buyer not found',
            }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(buyer),
    };
};
