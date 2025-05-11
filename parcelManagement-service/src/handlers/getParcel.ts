import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Parcel } from '../aggregates/parcel';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    if (!event.pathParameters || !event.pathParameters.parcelId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing parcelId in parameters' }),
        };
    }

    const parcel = new Parcel(ddbDocClient, context);

    await parcel.loadState(event.pathParameters.parcelId);

    return {
        statusCode: 200,
        body: JSON.stringify(parcel.getDetails()),
    };
};
