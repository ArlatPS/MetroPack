import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { EventGenerator } from '../aggregates/eventGenerator';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const handler = async (event: object, context: Context): Promise<void> => {
    const eventGenerator = new EventGenerator(ddbDocClient, context, eventBridgeClient);
    try {
        await eventGenerator.generateEvents();
    } catch (err) {
        console.error('Error generating events:', err);
        throw new Error(`Error generating events: ${err}`);
    }
};
