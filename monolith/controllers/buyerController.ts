import { RequestHandler } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { AcceptOfferSagaModel } from '../models';
import { getBuyer } from '../datasources/buyerTable';

export class BuyerController {
    private acceptOfferSagaModel: AcceptOfferSagaModel;
    private ddbDocClient: DynamoDBClient;

    constructor(acceptOfferSagaModel: AcceptOfferSagaModel, ddbDocClient: DynamoDBClient) {
        this.acceptOfferSagaModel = acceptOfferSagaModel;
        this.ddbDocClient = ddbDocClient;
    }

    public acceptOffer: RequestHandler = async (req, res) => {
        const { offerId, email, vendorId, pickupLocation, deliveryLocation } = req.body;

        if (!offerId || !email || !vendorId || !pickupLocation || !deliveryLocation) {
            res.status(400).json({
                message: 'offerId, email, vendorId, pickupLocation and deliveryLocation are required',
            });
            return;
        }

        try {
            const parcelId = await this.acceptOfferSagaModel.execute(
                offerId,
                email,
                vendorId,
                pickupLocation,
                deliveryLocation,
            );
            res.status(200).json({ parcelId });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getBuyer: RequestHandler = async (req, res) => {
        const { email } = req.params;

        if (!email) {
            res.status(400).json({ message: 'Email in path is required' });
            return;
        }

        try {
            const buyer = await getBuyer(email, this.ddbDocClient);
            if (!buyer) {
                res.status(404).json({ message: 'Buyer not found' });
                return;
            }
            res.status(200).json(buyer);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}
