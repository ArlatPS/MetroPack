import { HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { parseUrl } from '@aws-sdk/url-parser-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

import { Location } from '../../valueObjects/location';

export async function updateVehicleLocation(vehicleId: string, jobId: string, location: Location): Promise<void> {
    const { response } = await makeRequest('vehicle/location', {
        vehicleId,
        jobId,
        location: {
            latitude: location.latitude,
            longitude: location.longitude,
        },
    });

    if (response.statusCode !== 200) {
        throw new Error(`Failed to update vehicle location. Status: ${response.statusCode}`);
    }
}

async function makeRequest(
    endpoint: string,
    body: object,
): Promise<{
    response: HttpResponse;
    responseBody: any;
}> {
    const apiId = process.env.API_GW_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('ROUTING_API_ID environment variable is not set');
    }

    const apiBaseUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/prod`;
    const url = parseUrl(`${apiBaseUrl}/${endpoint}`);

    const request = new HttpRequest({
        ...url,
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            host: url.hostname,
            'Content-Type': 'application/json',
        },
    });

    const signer = new SignatureV4({
        credentials: defaultProvider(),
        region,
        service: 'execute-api',
        sha256: Sha256,
    });

    const signedRequest = await signer.sign(request);
    const { response } = await new NodeHttpHandler().handle(signedRequest as HttpRequest);

    const responseBody = await new Promise<string>((resolve, reject) => {
        let body = '';
        response.body.on('data', (chunk: Buffer) => (body += chunk.toString()));
        response.body.on('end', () => resolve(body));
        response.body.on('error', reject);
    });

    return {
        response,
        responseBody: JSON.parse(responseBody),
    };
}
