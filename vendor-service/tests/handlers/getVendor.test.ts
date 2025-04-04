import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../../src/handlers/getVendor';
import { Vendor } from '../../src/aggregates/vendor';
import { expect, describe, it, jest } from '@jest/globals';

jest.mock('../../src/aggregates/vendor');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Unit test for getVendor handler', function () {
    const mockContext = {} as Context;

    global.console.error = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns vendor details successfully', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'get',
            pathParameters: { vendorId: '123' },
            body: '',
            headers: {},
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: {},
            path: '/vendor/123',
            queryStringParameters: {},
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        const mockVendor = {
            loadState: jest.fn().mockReturnValue(undefined),
            getDetails: jest.fn().mockReturnValue({ vendorId: '123', name: 'Test Vendor', email: 'test@vendor.com' }),
        };
        (Vendor as jest.Mock).mockImplementation(() => mockVendor);

        const result: APIGatewayProxyResult = await handler(event, mockContext);

        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify({ vendorId: '123', name: 'Test Vendor', email: 'test@vendor.com' }));
        expect(mockVendor.loadState).toHaveBeenCalledWith('123');
    });

    it('returns 400 if vendorId is missing', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'get',
            pathParameters: {},
            body: '',
            headers: {},
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: {},
            path: '/vendor',
            queryStringParameters: {},
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        const result: APIGatewayProxyResult = await handler(event, mockContext);

        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify({ message: 'vendorId is required' }));
    });

    it('returns 500 on internal server error', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'get',
            pathParameters: { vendorId: '123' },
            body: '',
            headers: {},
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: {},
            path: '/vendor/123',
            queryStringParameters: {},
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        const mockVendor = {
            loadState: jest.fn().mockImplementation(() => {
                throw new Error('Internal server error');
            }),
            getDetails: jest.fn(),
        };
        (Vendor as jest.Mock).mockImplementation(() => mockVendor);

        const result: APIGatewayProxyResult = await handler(event, mockContext);

        expect(result.statusCode).toEqual(500);
        expect(result.body).toEqual(JSON.stringify({ message: 'Internal server error' }));
    });
});
