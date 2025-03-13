import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Vendor, VendorEvent } from '../aggregates/vendor';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const vendorTable = process.env.VENDOR_TABLE;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!vendorTable) {
            throw new Error('Vendor table is not set');
        }

        const vendorId = event.pathParameters?.vendorId;

        if (!vendorId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'vendorId is required',
                }),
            };
        }

        const params = {
            TableName: vendorTable,
            KeyConditionExpression: 'vendorId = :vendorId',
            ExpressionAttributeValues: {
                ':vendorId': vendorId,
            },
        };

        const data = await ddbDocClient.send(new QueryCommand(params));
        const items = data.Items;

        if (!items || items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Vendor not found',
                }),
            };
        }

        const events: VendorEvent[] = items.map((item: any) => JSON.parse(item.event).detail);

        const vendor = new Vendor(events);

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
