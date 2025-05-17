import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { copyAllCityItemsWithNewDate } from '../datasources/cityTable';
import { getNextWorkingDays } from '../helpers/dateHelpers';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (): Promise<void> => {
    try {
        const date = getNextWorkingDays(4)[3];
        await copyAllCityItemsWithNewDate(date, ddbDocClient);
    } catch (err) {
        console.error('Error generating city capacity:', err);
        throw new Error(`Error generating city capacity: ${err}`);
    }
};
