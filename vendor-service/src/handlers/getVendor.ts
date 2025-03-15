import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Vendor } from '../aggregates/vendor';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        const vendorId = event.pathParameters?.vendorId;

        if (!vendorId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'vendorId is required',
                }),
            };
        }

        const vendor = new Vendor(ddbDocClient, context);
        await vendor.loadState(vendorId);

        return {
            statusCode: 200,
            body: JSON.stringify(vendor.getDetails()),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            }),
        };
    }
};
