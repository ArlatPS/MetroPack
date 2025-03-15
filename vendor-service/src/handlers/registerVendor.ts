import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Vendor, VendorEvent } from '../aggregates/vendor';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        if (typeof body.name !== 'string' || typeof body.email !== 'string') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'name and email are required',
                }),
            };
        }

        const vendor = new Vendor(ddbDocClient);
        await vendor.register(body.name, body.email);

        return {
            statusCode: 200,
            body: JSON.stringify(vendor.getDetails()),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
                err: JSON.stringify(err),
            }),
        };
    }
};
