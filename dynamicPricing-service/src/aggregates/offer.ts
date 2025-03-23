import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { getCity } from '../datasources/cityTable';

export class Offer {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public async createOffer(
        pickupCityCodename: string,
        pickupLatitude: number,
        pickupLongitude: number,
        deliveryCityCodename: string,
        deliveryLatitude: number,
        deliveryLongitude: number,
    ): Promise<void> {
        await getCity(pickupCityCodename, this.ddbDocClient);
    }
}
