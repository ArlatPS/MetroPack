import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Vendor } from '../aggregates/vendor';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        if (
            typeof body.name !== 'string' ||
            typeof body.email !== 'string' ||
            typeof body.location.longitude !== 'number' ||
            typeof body.location.latitude !== 'number'
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'name, email and location are required',
                }),
            };
        }

        const vendor = new Vendor(ddbDocClient, context);
        await vendor.register(body.name, body.email, body.location.longitude, body.location.latitude);

        return {
            statusCode: 200,
            body: JSON.stringify(vendor.getDetails()),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            }),
        };
    }
};
