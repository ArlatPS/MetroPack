import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { parseUrl } from '@aws-sdk/url-parser-node';

export async function makeRequest(endpoint: string, method: string, body?: string): Promise<any> {
    const region = process.env.AWS_REGION || 'eu-central-1';

    const url = parseUrl(endpoint);
    const request = new HttpRequest({
        ...url,
        method,
        headers: {
            host: url.hostname,
            'Content-Type': 'application/json',
        },
        body,
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
        throw new Error(`Failed to make request. Status: ${response.statusCode}`);
    }

    return JSON.parse(responseBody);
}
