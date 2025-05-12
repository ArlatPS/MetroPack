import { makeRequest } from '../helpers/requestHelpers';

export async function registerParcel(
    pickupDate: string,
    pickupLocation: { longitude: number; latitude: number },
    deliveryDate: string,
    deliveryLocation: { longitude: number; latitude: number },
): Promise<string> {
    const apiId = process.env.PARCEL_MANAGEMENT_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('PARCEL_MANAGEMENT_API_ID environment variable is not set');
    }

    const endpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/prod/parcel/register`;

    try {
        const response = await makeRequest(
            endpoint,
            'POST',
            JSON.stringify({
                pickupDate,
                pickupLocation,
                deliveryDate,
                deliveryLocation,
            }),
        );
        return response.parcelId as string;
    } catch (e) {
        throw new Error('Failed to register parcel: ' + e);
    }
}
