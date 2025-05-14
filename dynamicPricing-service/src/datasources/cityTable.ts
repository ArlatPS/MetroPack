import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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

export async function updateCityCapacity(
    cityCodename: string,
    date: string,
    type: 'Pickup' | 'Delivery',
    operation: 'increase' | 'decrease',
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const cityTable = process.env.CITY_TABLE;
    if (!cityTable) throw new Error('City table is not set');

    const value = operation === 'increase' ? 1 : -1;

    const params = {
        TableName: cityTable,
        Key: {
            cityCodename,
            date,
        },
        UpdateExpression: `SET current${type}Capacity = current${type}Capacity + :val`,
        ExpressionAttributeValues: {
            ':val': value,
        },
    };

    await ddbDocClient.send(new UpdateCommand(params));
}

export async function copyAllCityItemsWithNewDate(
    newDate: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const cityTable = process.env.CITY_TABLE;
    if (!cityTable) throw new Error('City table is not set');

    const scanParams = {
        TableName: cityTable,
        ProjectionExpression: 'cityCodename',
    };

    const cityCodenames = new Set<string>();
    let lastEvaluatedKey;

    do {
        const scanResult = (await ddbDocClient.send(
            new ScanCommand({ ...scanParams, ExclusiveStartKey: lastEvaluatedKey }),
        )) as unknown as { Items: { cityCodename: string }[]; LastEvaluatedKey?: { cityCodename: string } };
        scanResult.Items?.forEach((item) => cityCodenames.add(item.cityCodename));
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    for (const cityCodename of cityCodenames) {
        const queryParams = {
            TableName: cityTable,
            KeyConditionExpression: 'cityCodename = :cityCodename',
            ExpressionAttributeValues: {
                ':cityCodename': cityCodename,
            },
            ScanIndexForward: false,
            Limit: 1,
        };

        const queryResult = await ddbDocClient.send(new QueryCommand(queryParams));
        const latestItem = queryResult.Items?.[0];

        if (!latestItem) continue;

        const newItem = {
            ...latestItem,
            date: newDate,
            currentDeliveryCapacity: latestItem.maxDeliveryCapacity,
            currentPickupCapacity: latestItem.maxPickupCapacity,
            multiplier: Math.round((Math.random() * (2.0 - 0.5) + 0.5) * 10) / 10,
        };

        const putParams = {
            TableName: cityTable,
            Item: newItem,
        };

        await ddbDocClient.send(new PutCommand(putParams));
    }
}
