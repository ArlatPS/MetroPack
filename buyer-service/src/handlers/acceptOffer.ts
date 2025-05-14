import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getOffer } from '../datasources/dynamicPricingService';
import { AcceptOfferSaga } from '../sagas/acceptOfferSaga';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}');

    if (!body.offerId || !body.email || !body.vendorId || !body.pickupLocation || !body.deliveryLocation) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'offerId, email, vendorId, pickupLocation and deliveryLocation are required',
            }),
        };
    }

    try {
        const offer = await getOffer(body.offerId);

        if (!offer) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Offer not found',
                }),
            };
        }

        const acceptOfferSaga = new AcceptOfferSaga(ddbDocClient, context);
        await acceptOfferSaga.execute(offer, body.email, body.vendorId, body.pickupLocation, body.deliveryLocation);
    } catch (err) {
        console.error(err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: err,
            }),
        };
    }

    return {
        statusCode: 200,
        body: 'OK',
    };
};
