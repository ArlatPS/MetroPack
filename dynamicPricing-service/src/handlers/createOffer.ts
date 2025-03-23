import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
// import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
// import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
//
// const client = new DynamoDBClient({});
// const ddbDocClient = DynamoDBDocumentClient.from(client);

interface CreateOfferRequest {
    version: string;
    buyer: {
        id: string;
        city: string;
        location: {
            latitude: string;
            longitude: string;
        };
    };
    vendor: {
        id: string;
        city: string;
        location: {
            latitude: string;
            longitude: string;
        };
    };
}
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        if (!validateRequest(body)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Invalid request body',
                }),
            };
        }

        const pickupFactor = calculatePriceFactor(10, 100, 1.2);
        const deliveryFactor = calculatePriceFactor(80, 100, 1.6);

        const basePrice = 10;

        return {
            statusCode: 200,
            body: JSON.stringify({ price: basePrice * pickupFactor * deliveryFactor }),
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

function calculatePriceFactor(currentAvailable: number, maxAvailable: number, multiplier: number): number {
    const ratio = currentAvailable / maxAvailable;
    return 1 + (1 - ratio) * multiplier;
}

function validateRequest(body: any): body is CreateOfferRequest {
    return (
        typeof body.version === 'string' &&
        typeof body.buyer === 'object' &&
        typeof body.buyer.id === 'string' &&
        typeof body.buyer.city === 'string' &&
        typeof body.buyer.location === 'object' &&
        typeof body.buyer.location.latitude === 'string' &&
        typeof body.buyer.location.longitude === 'string' &&
        typeof body.vendor === 'object' &&
        typeof body.vendor.id === 'string' &&
        typeof body.vendor.city === 'string' &&
        typeof body.vendor.location === 'object' &&
        typeof body.vendor.location.latitude === 'string' &&
        typeof body.vendor.location.longitude === 'string'
    );
}
