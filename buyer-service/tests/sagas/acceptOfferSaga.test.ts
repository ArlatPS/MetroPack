import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { AcceptOfferSaga } from '../../src/sagas/acceptOfferSaga';
import { Offer } from '../../src/datasources/dynamicPricingService';
import * as dynamicPricingService from '../../src/datasources/dynamicPricingService';
import * as billingService from '../../src/datasources/billingService';
import * as buyerTable from '../../src/datasources/buyerTable';
import * as parcelManagementService from '../../src/datasources/parcelManagementService';

jest.mock('../../src/datasources/dynamicPricingService');
jest.mock('../../src/datasources/billingService');
jest.mock('../../src/datasources/buyerTable');
jest.mock('../../src/datasources/parcelManagementService');

const mockDynamoDBClient = {} as DynamoDBDocumentClient;
const mockContext = {} as Context;

describe('AcceptOfferSaga', () => {
    let saga: AcceptOfferSaga;

    const offer: Offer = {
        offerId: 'offer123',
        pickupDate: '2025-05-16',
        deliveryDate: '2025-05-17',
        pickupCityCodename: 'pickupCity',
        deliveryCityCodename: 'deliveryCity',
        price: 20,
    };

    beforeEach(() => {
        saga = new AcceptOfferSaga(mockDynamoDBClient, mockContext);
        jest.clearAllMocks();
    });

    it('executes all steps successfully', async () => {
        const email = 'test@example.com';
        const vendorId = 'vendor123';
        const pickupLocation = { longitude: 10, latitude: 20 };
        const deliveryLocation = { longitude: 30, latitude: 40 };

        await saga.execute(offer, email, vendorId, pickupLocation, deliveryLocation);

        expect(dynamicPricingService.putOfferAcceptedEvent).toHaveBeenCalledWith('offer123', mockContext);
        expect(billingService.putOrderCreatedEvent).toHaveBeenCalled();
        expect(buyerTable.addBuyer).toHaveBeenCalled();
        expect(parcelManagementService.registerParcel).toHaveBeenCalled();
    });

    it('executes compensating actions on failure', async () => {
        const email = 'test@example.com';
        const vendorId = 'vendor123';
        const pickupLocation = { longitude: 10, latitude: 20 };
        const deliveryLocation = { longitude: 30, latitude: 40 };

        jest.spyOn(billingService, 'putOrderCreatedEvent').mockRejectedValue(new Error('Step failed'));

        await saga.execute(offer, email, vendorId, pickupLocation, deliveryLocation);

        expect(dynamicPricingService.putOfferAcceptCancelledEvent).toHaveBeenCalledWith('offer123', mockContext);
    });
});
