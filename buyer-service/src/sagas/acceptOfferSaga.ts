import { Context } from 'aws-lambda';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Offer, putOfferAcceptCancelledEvent, putOfferAcceptedEvent } from '../datasources/dynamicPricingService';
import { randomUUID } from 'node:crypto';
import { putOrderCreatedEvent, putOrderCreationCancelledEvent } from '../datasources/billingService';
import { addBuyer, addParcelToBuyer, getBuyer, removeParcelFromBuyer } from '../datasources/buyerTable';
import { registerParcel } from '../datasources/parcelManagementService';

export class AcceptOfferSaga {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;
    private compensatingActions: (() => Promise<void>)[];
    private compensatingActionsFailed = false;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
        this.compensatingActions = [];
    }

    public async execute(
        offer: Offer,
        email: string,
        vendorId: string,
        pickupLocation: { longitude: number; latitude: number },
        deliveryLocation: { longitude: number; latitude: number },
    ): Promise<void> {
        const parcelId = randomUUID();

        try {
            await this.executeStep(
                () => this.sendOfferAcceptedEvent(offer.offerId),
                () => this.sendOfferAcceptCancelledEvent(offer.offerId),
            );

            await this.executeStep(
                () => this.sendOrderCreatedEvent(vendorId, parcelId, offer.offerId),
                () => this.sendOrderCreationCancelledEvent(vendorId, parcelId, offer.offerId),
            );

            await this.executeStep(
                () => this.addParcelToBuyer(email, parcelId),
                () => this.removeParcelFromBuyer(email, parcelId),
            );

            await this.registerParcel(parcelId, offer, pickupLocation, deliveryLocation);
        } catch (error) {
            await this.executeCompensatingActions();

            if (this.compensatingActionsFailed) {
                throw new Error('Compensating actions failed');
            }
        }
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

    private async sendOfferAcceptedEvent(offerId: string): Promise<void> {
        await putOfferAcceptedEvent(offerId, this.context);
        console.log('sent offer accepted event');
    }

    private async sendOfferAcceptCancelledEvent(offerId: string): Promise<void> {
        await putOfferAcceptCancelledEvent(offerId, this.context);
        console.log('sent offer accept cancelled event');
    }

    private async sendOrderCreatedEvent(vendorId: string, orderId: string, offerId: string): Promise<void> {
        await putOrderCreatedEvent(vendorId, orderId, new Date().toISOString(), offerId, this.context);
        console.log('sent order created event');
    }

    private async sendOrderCreationCancelledEvent(vendorId: string, orderId: string, offerId: string): Promise<void> {
        await putOrderCreationCancelledEvent(vendorId, orderId, new Date().toISOString(), offerId, this.context);
        console.log('sent order creation cancelled event');
    }

    private async addParcelToBuyer(email: string, parcelId: string): Promise<void> {
        const buyer = await getBuyer(email, this.ddbDocClient);

        if (!buyer) {
            await addBuyer(email, parcelId, this.ddbDocClient);
        } else {
            await addParcelToBuyer(email, parcelId, this.ddbDocClient);
        }
        console.log('added parcel to buyer');
    }

    private async removeParcelFromBuyer(email: string, parcelId: string): Promise<void> {
        await removeParcelFromBuyer(email, parcelId, this.ddbDocClient);
        console.log('removed parcel from buyer');
    }

    private async registerParcel(
        parcelId: string,
        offer: Offer,
        pickupLocation: { longitude: number; latitude: number },
        deliveryLocation: { longitude: number; latitude: number },
    ): Promise<void> {
        await registerParcel(parcelId, offer.pickupDate, pickupLocation, offer.deliveryDate, deliveryLocation);
        console.log('registered parcel');
    }
}
