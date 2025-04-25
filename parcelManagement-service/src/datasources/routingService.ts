import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { parseUrl } from '@aws-sdk/url-parser-node';
import { Location } from '../valueObjects/location';

export async function getSnap(location: Location): Promise<Location | null> {
    const apiId = process.env.ROUTING_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('ROUTING_API_ID environment variable is not set');
    }

    const apiBaseUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/Prod`;
    const endpoint = `${apiBaseUrl}/snap`;

    const url = parseUrl(endpoint);
    const request = new HttpRequest({
        ...url,
        method: 'POST',
        body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
        }),
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

    if (response.statusCode === 404) {
        return null;
    }

    if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch location. Status: ${response.statusCode}`);
    }

    return JSON.parse(responseBody) as Location;
}
