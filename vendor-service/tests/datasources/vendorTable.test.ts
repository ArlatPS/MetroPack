import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getVendorEvents, putVendorEvent } from '../../src/datasources/vendorTable';
import { VendorEvent } from '../../src/aggregates/vendor';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

jest.mock('@aws-sdk/lib-dynamodb');

describe('Vendor Table Data Source', () => {
    const mockDdbDocClient = { send: jest.fn() } as unknown as DynamoDBDocumentClient;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('retrieves vendor events successfully', async () => {
        process.env.VENDOR_TABLE = 'VendorTable';
        const vendorId = '123';
        const mockItems = [{ event: JSON.stringify({ detail: { metadata: { name: 'vendorRegistered' } } }) }];
        (mockDdbDocClient.send as jest.Mock).mockResolvedValue({ Items: mockItems });

        const events = await getVendorEvents(vendorId, mockDdbDocClient);

        expect(mockDdbDocClient.send).toHaveBeenCalledWith(expect.any(QueryCommand));
        expect(events).toEqual([{ detail: { metadata: { name: 'vendorRegistered' } } }]);
    });

    it('throws an error if vendor table is not set', async () => {
        delete process.env.VENDOR_TABLE;

        await expect(getVendorEvents('123', mockDdbDocClient)).rejects.toThrow('Vendor table is not set');
    });

    it('throws an error if vendor is not found', async () => {
        process.env.VENDOR_TABLE = 'VendorTable';
        (mockDdbDocClient.send as jest.Mock).mockResolvedValue({ Items: [] });

        await expect(getVendorEvents('123', mockDdbDocClient)).rejects.toThrow('Vendor not found.');
    });

    it('puts vendor event successfully', async () => {
        process.env.VENDOR_TABLE = 'VendorTable';
        const vendorId = '123';
        const eventOrder = 0;
        const event = { detail: { metadata: { name: 'vendorRegistered' } } } as VendorEvent;

        await putVendorEvent(vendorId, eventOrder, event, mockDdbDocClient);

        expect(mockDdbDocClient.send).toHaveBeenCalledWith(expect.any(PutItemCommand));
    });

    it('throws an error if vendor table is not set when putting event', async () => {
        delete process.env.VENDOR_TABLE;
        const event = { detail: { metadata: { name: 'vendorRegistered' } } } as VendorEvent;

        await expect(putVendorEvent('123', 0, event, mockDdbDocClient)).rejects.toThrow('Vendor table is not set');
    });
});
