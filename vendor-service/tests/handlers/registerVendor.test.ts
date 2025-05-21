import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../../src/handlers/registerVendor';
import { Vendor } from '../../src/aggregates/vendor';
import { expect, describe, it, jest } from '@jest/globals';

jest.mock('../../src/aggregates/vendor');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Unit test for registerVendor handler', function () {
    const mockContext = {} as Context;

    global.console.error = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('registers a vendor successfully', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'post',
            pathParameters: {},
            body: JSON.stringify({
                name: 'Test Vendor',
                email: 'test@vendor.com',
                location: { longitude: 10, latitude: 10 },
            }),
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

        const mockVendor = {
            register: jest.fn().mockReturnValue(undefined),
            getDetails: jest.fn().mockReturnValue({
                vendorId: '123',
                name: 'Test Vendor',
                email: 'test@vendor.com',
                location: { longitude: 10, latitude: 10 },
            }),
        };
        (Vendor as jest.Mock).mockImplementation(() => mockVendor);

        const result: APIGatewayProxyResult = await handler(event, mockContext);

        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(
            JSON.stringify({
                vendorId: '123',
                name: 'Test Vendor',
                email: 'test@vendor.com',
                location: { longitude: 10, latitude: 10 },
            }),
        );
        expect(mockVendor.register).toHaveBeenCalledWith('Test Vendor', 'test@vendor.com', 10, 10);
    });

    it('returns 400 if name or email is missing', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'post',
            pathParameters: {},
            body: JSON.stringify({ name: 'Test Vendor' }),
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
        expect(result.body).toEqual(JSON.stringify({ message: 'name, email and location are required' }));
    });

    it('returns 500 on internal server error', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'post',
            pathParameters: {},
            body: JSON.stringify({ name: 'Test Vendor', email: 'test@vendor.com' }),
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

        const mockVendor = {
            register: jest.fn().mockImplementation(() => {
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
