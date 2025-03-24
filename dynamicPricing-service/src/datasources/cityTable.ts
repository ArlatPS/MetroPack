import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getNextWorkingDays } from '../helpers/dateHelpers';

interface City {
    cityCodename: string;
    dates: Record<
        string,
        {
            maxPickupCapacity: number;
            currentPickupCapacity: number;
            maxDeliveryCapacity: number;
            currentDeliveryCapacity: number;
            multiplier: number;
            basePrice: number;
        }
    >;
}

const NUM_OF_DAYS = 3;

export async function getCity(cityCodename: string, ddbDocClient: DynamoDBDocumentClient): Promise<City> {
    const cityTable = process.env.CITY_TABLE;
    if (!cityTable) throw new Error('City table is not set');

    const workingDates = getNextWorkingDays(NUM_OF_DAYS);

    const results = [];
    for (const date of workingDates) {
        const params = {
            TableName: cityTable,
            KeyConditionExpression: 'cityCodename = :c and #d = :d',
            ExpressionAttributeNames: {
                '#d': 'date',
            },
            ExpressionAttributeValues: {
                ':c': cityCodename,
                ':d': date,
            },
        };

        const data = await ddbDocClient.send(new QueryCommand(params));
        results.push(...(data.Items || []));
    }

    return {
        cityCodename,
        dates: results.reduce((acc, item) => {
            acc[item.date] = {
                maxPickupCapacity: item.maxPickupCapacity,
                currentPickupCapacity: item.currentPickupCapacity,
                maxDeliveryCapacity: item.maxDeliveryCapacity,
                currentDeliveryCapacity: item.currentDeliveryCapacity,
                multiplier: item.multiplier,
                basePrice: item.basePrice,
            };
            return acc;
        }, {} as City['dates']),
    } as City;
}
