import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

interface Buyer {
    email: string;
    parcelsIds: string[];
}

export async function getBuyer(email: string, ddbDocClient: DynamoDBDocumentClient): Promise<Buyer | null> {
    const buyerTable = process.env.BUYER_TABLE;

    if (!buyerTable) {
        throw new Error('Buyer table is not set');
    }

    const params = {
        TableName: buyerTable,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
            ':email': email,
        },
    };

    const data = await ddbDocClient.send(new QueryCommand(params));

    return (data.Items?.[0] as Buyer) || null;
}

export async function addBuyer(email: string, parcelId: string, ddbDocClient: DynamoDBDocumentClient): Promise<void> {
    const buyerTable = process.env.BUYER_TABLE;

    if (!buyerTable) {
        throw new Error('Buyer table is not set');
    }

    const params = {
        TableName: buyerTable,
        Item: {
            email: email,
            parcelsIds: [parcelId],
        },
        ConditionExpression: 'attribute_not_exists(email)',
    };

    await ddbDocClient.send(new PutCommand(params));
}

export async function addParcelToBuyer(
    email: string,
    parcelId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const buyerTable = process.env.BUYER_TABLE;

    if (!buyerTable) {
        throw new Error('Buyer table is not set');
    }

    const updateParams = {
        TableName: buyerTable,
        Key: {
            email: email,
        },
        UpdateExpression: 'SET parcelIds = list_append(if_not_exists(parcelIds, :empty_list), :parcelId)',
        ExpressionAttributeValues: {
            ':parcelId': [parcelId],
            ':empty_list': [],
        },
    };

    await ddbDocClient.send(new UpdateCommand(updateParams));
}

export async function removeParcelFromBuyer(
    email: string,
    parcelId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<void> {
    const buyerTable = process.env.BUYER_TABLE;

    if (!buyerTable) {
        throw new Error('Buyer table is not set');
    }

    const buyer = await getBuyer(email, ddbDocClient);

    if (!buyer) {
        throw new Error('Buyer not found');
    }

    const parcelsIds = buyer.parcelsIds.filter((id) => id !== parcelId);

    const updateParams = {
        TableName: buyerTable,
        Key: {
            email: email,
        },
        UpdateExpression: 'SET parcelIds = :parcelIds',
        ExpressionAttributeValues: {
            ':parcelIds': parcelsIds,
        },
    };
    await ddbDocClient.send(new UpdateCommand(updateParams));
}
