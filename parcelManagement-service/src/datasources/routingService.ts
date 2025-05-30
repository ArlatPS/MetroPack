import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { randomUUID } from 'node:crypto';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { parseUrl } from '@aws-sdk/url-parser-node';

import { Location } from '../valueObjects/location';
import { Vehicle } from './vehicleTable';
import { Warehouse } from '../aggregates/parcel';
import { Order } from './parcelOrderTables';
import { Job } from './jobsTables';

interface JobFromApi {
    vehicleId: string;
    duration: number;
    steps: {
        type: string;
        location: Location;
        arrivalTime: number;
        deliveryId: string;
    }[];
}

export async function getSnap(location: Location): Promise<Location | null> {
    const { response, responseBody } = await makeRequest('snap', {
        latitude: location.latitude,
        longitude: location.longitude,
    });
    if (response.statusCode === 404) {
        return null;
    }

    if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch location. Status: ${response.statusCode}`);
    }

    return responseBody as Location;
}

export async function getOptimizedJobs(
    vehicles: Vehicle[],
    warehouse: Warehouse,
    orders: Order[],
): Promise<{ jobs: Job[]; vehicles: Vehicle[] }> {
    const { response, responseBody } = await makeRequest('createDeliveryJobs', {
        vehicles: vehicles.map((vehicle) => ({ id: vehicle.vehicleId, capacity: vehicle.capacity })),
        warehouse: {
            id: warehouse.warehouseId,
            location: {
                latitude: warehouse.location.latitude,
                longitude: warehouse.location.longitude,
            },
            timeWindow: [0, 8 * 60 * 60],
        },
        deliveries: orders.map((order) => ({
            id: order.parcelId,
            location: {
                latitude: order.location.latitude,
                longitude: order.location.longitude,
            },
        })),
    });

    if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch optimized jobs. Status: ${response.statusCode}`);
    }
    const jobs: Job[] = responseBody.map(
        (job: JobFromApi): Job => ({
            jobId: randomUUID(),
            status: 'PENDING',
            date: orders[0].date,
            warehouseId: warehouse.warehouseId,
            vehicleId: job.vehicleId,
            duration: job.duration,
            steps: job.steps
                .filter((step) => step.type === 'job')
                .map((step) => ({
                    location: new Location(step.location.longitude, step.location.latitude),
                    arrivalTime: step.arrivalTime,
                    parcelId: step.deliveryId,
                })),
        }),
    );

    const updatedVehicles = vehicles.map((vehicle): Vehicle => {
        const job = jobs.find((job) => job.vehicleId === vehicle.vehicleId);
        if (job) {
            return {
                ...vehicle,
                capacity: vehicle.capacity - job.duration,
            };
        }
        return vehicle;
    });

    return { jobs, vehicles: updatedVehicles };
}

async function makeRequest(
    endpoint: string,
    body: object,
): Promise<{
    response: HttpResponse;
    responseBody: any;
}> {
    const apiId = process.env.ROUTING_API_ID;
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
