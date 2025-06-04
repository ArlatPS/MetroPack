import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

import { addBuyer, addParcelToBuyer, getBuyer, removeParcelFromBuyer } from '../datasources/buyerTable';
import { OfferModel } from './offerModel';
import { CustomerModel } from './customerModel';
import { OfferWithDetails } from '../datasources/offerTable';
import { ParcelModel } from './parcelModel';
import { ParcelManagementModel } from './parcelManagementModel';

import { Location } from '../helpers/locationHelpers';

export class AcceptOfferSagaModel {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly offerModel: OfferModel;
    private readonly customerModel: CustomerModel;
    private readonly parcelModel: ParcelModel;
    private readonly parcelManagementModel: ParcelManagementModel;

    private compensatingActions: (() => Promise<void>)[];
    private compensatingActionsFailed = false;

    constructor(
        offerModel: OfferModel,
        customerModel: CustomerModel,
        parcelModel: ParcelModel,
        parcelManagementModel: ParcelManagementModel,
        ddbDocClient: DynamoDBDocumentClient,
    ) {
        this.offerModel = offerModel;
        this.customerModel = customerModel;
        this.parcelModel = parcelModel;
        this.parcelManagementModel = parcelManagementModel;
        this.ddbDocClient = ddbDocClient;
        this.compensatingActions = [];
    }

    public async execute(
        offerId: string,
        email: string,
        vendorId: string,
        pickupLocation: { longitude: number; latitude: number },
        deliveryLocation: { longitude: number; latitude: number },
    ): Promise<string> {
        const parcelId = randomUUID();

        const offer = await this.offerModel.getOfferById(offerId);

        if (!offer) {
            throw new Error('Offer not found');
        }

        try {
            await this.executeStep(
                () => this.acceptOffer(offer),
                () => this.cancelAcceptOffer(offer),
            );

            await this.executeStep(
                () => this.orderCreated(vendorId, parcelId, offer),
                () => this.orderCreationCancelled(vendorId, parcelId),
            );

            await this.executeStep(
                () => this.addParcelToBuyer(email, parcelId),
                () => this.removeParcelFromBuyer(email, parcelId),
            );

            await this.registerParcel(parcelId, offer, pickupLocation, deliveryLocation);

            return parcelId;
        } catch (error) {
            await this.executeCompensatingActions();

            if (this.compensatingActionsFailed) {
                throw new Error('Compensating actions failed');
            }
            throw new Error(`Saga execution failed: ${error}`);
        }
    }

    public resetState(): void {
        this.compensatingActions = [];
        this.compensatingActionsFailed = false;
    }

    private async executeStep(step: () => Promise<void>, compensatingAction: () => Promise<void>): Promise<void> {
        try {
            await step();
            this.compensatingActions.push(compensatingAction);
        } catch (error) {
            console.error('Error executing step:', error);
            throw new Error(`Error executing step: ${error}`);
        }
    }

    private async executeCompensatingActions(): Promise<void> {
        for (const action of this.compensatingActions.reverse()) {
            try {
                await action();
            } catch (error) {
                console.error('Error executing compensating action:', error);
                this.compensatingActionsFailed = true;
            }
        }
        this.compensatingActions = [];
    }

    private async acceptOffer(offer: OfferWithDetails): Promise<void> {
        await this.offerModel.handleOfferAccepted(offer);
    }

    private async cancelAcceptOffer(offer: OfferWithDetails): Promise<void> {
        await this.offerModel.handleOfferAcceptCancelled(offer);
    }

    private async orderCreated(vendorId: string, orderId: string, offer: OfferWithDetails): Promise<void> {
        await this.customerModel.addOrder(vendorId, orderId, new Date().toISOString(), offer);
    }

    private async orderCreationCancelled(vendorId: string, orderId: string): Promise<void> {
        await this.customerModel.removeOrder(vendorId, orderId);
    }

    private async addParcelToBuyer(email: string, parcelId: string): Promise<void> {
        const buyer = await getBuyer(email, this.ddbDocClient);

        if (!buyer) {
            await addBuyer(email, parcelId, this.ddbDocClient);
        } else {
            await addParcelToBuyer(email, parcelId, this.ddbDocClient);
        }
    }

    private async removeParcelFromBuyer(email: string, parcelId: string): Promise<void> {
        await removeParcelFromBuyer(email, parcelId, this.ddbDocClient);
    }

    private async registerParcel(
        parcelId: string,
        offer: OfferWithDetails,
        pickupLocation: { longitude: number; latitude: number },
        deliveryLocation: { longitude: number; latitude: number },
    ): Promise<void> {
        this.parcelModel.resetState();
        await this.parcelModel.register(
            offer.pickupDate,
            new Location(pickupLocation.longitude, pickupLocation.latitude),
            offer.deliveryDate,
            new Location(deliveryLocation.longitude, deliveryLocation.latitude),
            parcelId,
        );
        const parcel = this.parcelModel.getDetails();
        await this.parcelManagementModel.createPickupOrder(
            parcel.parcelId,
            parcel.transitWarehouses[0].warehouseId,
            parcel.pickupDate,
            parcel.pickupLocation,
            parcel.transitWarehouses[0],
        );
    }
}
