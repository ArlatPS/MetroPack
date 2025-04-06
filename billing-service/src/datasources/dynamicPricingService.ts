import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { parseUrl } from '@aws-sdk/url-parser-node';

interface Offer {
    offerId: string;
    pickupCityCodename: string;
    pickupDate: string;
    deliveryCityCodename: string;
    deliveryDate: string;
    price: number;
}

export async function getOffer(offerId: string): Promise<Offer | null> {
    const apiId = process.env.DYNAMIC_PRICING_API_ID;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!apiId) {
        throw new Error('DYNAMIC_PRICING_API_ID environment variable is not set');
    }

    const apiBaseUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/prod`;
    const endpoint = `${apiBaseUrl}/getOffer/${offerId}`;

    const url = parseUrl(endpoint);
    const request = new HttpRequest({
        ...url,
        method: 'GET',
        headers: {
            host: url.hostname,
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

    if (response.statusCode !== 200) {
        console.error(`Failed to fetch offer. Status: ${response.statusCode}`);
        throw new Error(`Failed to fetch offer. Status: ${response.statusCode}`);
    }

    console.log(responseBody);

    return JSON.parse(responseBody);
}
