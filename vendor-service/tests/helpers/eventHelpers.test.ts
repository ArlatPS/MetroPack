import { Context } from 'aws-lambda';
import { createVendorRegisteredEvent, createVendorDetailsChangedEvent } from '../../src/helpers/eventHelpers';

jest.mock('crypto', () => {
    return {
        randomUUID: jest.fn(() => '123'),
    };
});

describe('Event Helpers', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    });
    const mockContext = {
        functionName: 'testFunction',
        invokedFunctionArn: 'arn:aws:lambda:eu-central-1:123456789012:function:testFunction',
    } as Context;

    it('creates a vendor registered event', () => {
        const vendorId = '123';
        const name = 'Test Vendor';
        const email = 'test@vendor.com';

        const event = createVendorRegisteredEvent(vendorId, name, email, 10, 10, mockContext);

        expect(event).toEqual({
            version: '1',
            id: '123',
            detailType: 'vendorService.vendorRegistered',
            source: 'testFunction',
            time: '2025-01-01T12:00:00.000Z',
            region: 'eu-central-1',
            resources: ['arn:aws:lambda:eu-central-1:123456789012:function:testFunction'],
            detail: {
                metadata: {
                    domain: 'customerService',
                    subdomain: 'vendor',
                    service: 'vendorService',
                    category: 'domainEvent',
                    type: 'data',
                    name: 'vendorRegistered',
                },
                data: {
                    vendorId,
                    name,
                    email,
                    location: {
                        longitude: 10,
                        latitude: 10,
                    },
                },
            },
        });
    });

    it('creates a vendor details changed event with name and email', () => {
        const vendorId = '123';
        const name = 'Updated Vendor';
        const email = 'updated@vendor.com';

        const event = createVendorDetailsChangedEvent(vendorId, mockContext, name, email);

        expect(event).toEqual({
            version: '1',
            id: '123',
            detailType: 'vendorService.vendorDetailsChanged',
            source: 'testFunction',
            time: '2025-01-01T12:00:00.000Z',
            region: 'eu-central-1',
            resources: ['arn:aws:lambda:eu-central-1:123456789012:function:testFunction'],
            detail: {
                metadata: {
                    domain: 'customerService',
                    subdomain: 'vendor',
                    service: 'vendorService',
                    category: 'domainEvent',
                    type: 'data',
                    name: 'vendorDetailsChanged',
                },
                data: {
                    vendorId,
                    name,
                    email,
                },
            },
        });
    });

    it('creates a vendor details changed event with only name', () => {
        const vendorId = '123';
        const name = 'Updated Vendor';

        const event = createVendorDetailsChangedEvent(vendorId, mockContext, name);

        expect(event.detail.data.vendorId).toBe(vendorId);
        expect(event.detail.data.name).toBe(name);
        expect(event.detail.data.email).toBeUndefined();
        expect(event.detail.metadata.name).toBe('vendorDetailsChanged');
    });

    it('creates a vendor details changed event with only email', () => {
        const vendorId = '123';
        const email = 'updated@vendor.com';

        const event = createVendorDetailsChangedEvent(vendorId, mockContext, undefined, email);

        expect(event.detail.data.vendorId).toBe(vendorId);
        expect(event.detail.data.name).toBeUndefined();
        expect(event.detail.data.email).toBe(email);
        expect(event.detail.metadata.name).toBe('vendorDetailsChanged');
    });
});
