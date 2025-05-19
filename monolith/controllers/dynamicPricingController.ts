import { RequestHandler } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { OfferModel } from '../models';
import { getNextWorkingDays } from '../helpers/dateHelpers';
import { copyAllCityItemsWithNewDate } from '../datasources/cityTable';

export class DynamicPricingController {
    private offerModel: OfferModel;
    private ddbDocClient: DynamoDBClient;

    constructor(offerModel: OfferModel, ddbDocClient: DynamoDBClient) {
        this.offerModel = offerModel;
        this.ddbDocClient = ddbDocClient;
    }

    public createOffer: RequestHandler = async (req, res) => {
        try {
            const { pickupCityCodename, deliveryCityCodename } = req.body;
            if (!pickupCityCodename || !deliveryCityCodename) {
                res.status(400).json({ message: 'pickupCityCodename and deliveryCityCodename are required' });
                return;
            }

            const offers = await this.offerModel.createOffer(pickupCityCodename, deliveryCityCodename);
            res.status(200).json(offers);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public generateCityCapacity: RequestHandler = async (req, res) => {
        try {
            const date = getNextWorkingDays(4)[3];

            await copyAllCityItemsWithNewDate(date, this.ddbDocClient);

            res.status(200).json({ message: 'City capacity generated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}
