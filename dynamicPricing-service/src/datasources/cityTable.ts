import { BatchGetItemCommand, BatchGetItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getNextWorkingDays } from '../helpers/dateHelpers';

interface City {
    cityCodename: string;
    dates: Record<
        string,
        {
            maxCapacity: number;
            currentCapacity: number;
        }
    >;
}

const NUM_OF_DAYS = 3;

export async function getCity(cityCodename: string, ddbDocClient: DynamoDBDocumentClient) {
    const cityTable = process.env.CITY_TABLE;
    if (!cityTable) throw new Error('City table is not set');

    const workingDates = getNextWorkingDays(NUM_OF_DAYS);
    console.log('Fetching data for dates:', workingDates);

    const results = [];
    for (const date of workingDates) {
        const params = {
            TableName: cityTable,
            KeyConditionExpression: 'cityCodename = :c AND #d = :d',
            ExpressionAttributeNames: {
                '#d': 'date',
            },
            ExpressionAttributeValues: {
                ':c': cityCodename,
                ':d': date,
            },
        };

        const data = await ddbDocClient.send(new QueryCommand(params));
        console.log(`Results for ${date}:`, JSON.stringify(data.Items, null, 2));
        results.push(...(data.Items || []));
    }

    return results.length ? results : null;
}
