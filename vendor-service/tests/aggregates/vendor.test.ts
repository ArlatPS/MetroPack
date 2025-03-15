import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { Vendor } from '../../src/aggregates/vendor';
import { createVendorDetailsChangedEvent, createVendorRegisteredEvent } from '../../src/helpers/eventHelpers';
import { getVendorEvents, putVendorEvent } from '../../src/datasources/vendorTable';

jest.mock('../../src/helpers/eventHelpers');
jest.mock('../../src/datasources/vendorTable');
jest.mock('crypto', () => {
    return {
        randomUUID: jest.fn(() => '123'),
    };
});

const mockDdbDocClient = {} as DynamoDBDocumentClient;
const mockContext = {} as Context;

describe('Vendor', () => {
    let vendor: Vendor;

    beforeEach(() => {
        vendor = new Vendor(mockDdbDocClient, mockContext);
    });

    it('registers a new vendor', async () => {
        const name = 'Test Vendor';
        const email = 'test@vendor.com';
        const event = { detail: { metadata: { name: 'vendorRegistered' }, data: { vendorId: '123', name, email } } };

        (createVendorRegisteredEvent as jest.Mock).mockReturnValue(event);
        (putVendorEvent as jest.Mock).mockResolvedValue(undefined);

        await vendor.register(name, email);

        expect(putVendorEvent).toHaveBeenCalledWith('123', 0, event, mockDdbDocClient);
        expect(vendor.getDetails()).toEqual({ vendorId: '123', name, email });
    });

    it('loads vendor state', async () => {
        const events = [
            {
                detail: {
                    metadata: { name: 'vendorRegistered' },
                    data: { vendorId: '123', name: 'Test Vendor', email: 'test@vendor.com' },
                },
            },
            {
                detail: {
                    metadata: { name: 'vendorDetailsChanged' },
                    data: { vendorId: '123', name: 'Updated Vendor', email: 'updated@vendor.com' },
                },
            },
        ];

        (getVendorEvents as jest.Mock).mockResolvedValue(events);

        await vendor.loadState('123');

        expect(getVendorEvents).toHaveBeenCalledWith('123', mockDdbDocClient);
        expect(vendor.getDetails()).toEqual({ vendorId: '123', name: 'Updated Vendor', email: 'updated@vendor.com' });
    });

    it('changes vendor details', async () => {
        const initialEvent = {
            detail: {
                metadata: { name: 'vendorRegistered' },
                data: { vendorId: '123', name: 'Test Vendor', email: 'test@vendor.com' },
            },
        };
        const changeEvent = {
            detail: {
                metadata: { name: 'vendorDetailsChanged' },
                data: { vendorId: '123', name: 'Updated Vendor', email: 'updated@vendor.com' },
            },
        };

        (createVendorDetailsChangedEvent as jest.Mock).mockReturnValue(changeEvent);
        (putVendorEvent as jest.Mock).mockResolvedValue(undefined);
        (getVendorEvents as jest.Mock).mockResolvedValue([initialEvent]);

        await vendor.loadState('123');
        await vendor.changeDetails('Updated Vendor', 'updated@vendor.com');

        expect(putVendorEvent).toHaveBeenCalledWith('123', 1, changeEvent, mockDdbDocClient);
        expect(vendor.getDetails()).toEqual({ vendorId: '123', name: 'Updated Vendor', email: 'updated@vendor.com' });
    });

    it('handles missing vendorId in changeDetails', async () => {
        await expect(vendor.changeDetails('Updated Vendor', 'updated@vendor.com')).rejects.toThrow(
            'Vendor state is not loaded',
        );
    });

    it('handles missing vendorId in loadState', async () => {
        (getVendorEvents as jest.Mock).mockResolvedValue([]);

        await vendor.loadState('123');

        expect(vendor.getDetails()).toEqual({ vendorId: '', name: '', email: '' });
    });
});
