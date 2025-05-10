import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { getDeliveryJob, getPickupJob, getTransferJob } from '../../datasources/jobsTables';
import { NotFoundError } from '../../errors/NotFoundError';
import { putEventGeneratorJob } from '../datasources/eventGeneratorJobsTable';

export class EventGenerator {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public async processPickupJob(jobId: string): Promise<void> {
        const job = await getPickupJob(jobId, this.ddbDocClient);

        if (!job) {
            throw new NotFoundError(`Pickup job with ID ${jobId} not found`);
        }

        await putEventGeneratorJob(job.jobId, job.vehicleId, 'PENDING', 'PICKUP', this.ddbDocClient, job.steps);
    }

    public async processDeliveryJob(jobId: string): Promise<void> {
        const job = await getDeliveryJob(jobId, this.ddbDocClient);

        if (!job) {
            throw new NotFoundError(`Delivery job with ID ${jobId} not found`);
        }

        await putEventGeneratorJob(job.jobId, job.vehicleId, 'PENDING', 'DELIVERY', this.ddbDocClient, job.steps);
    }

    public async processTransferJob(jobId: string): Promise<void> {
        const job = await getTransferJob(jobId, this.ddbDocClient);

        if (!job) {
            throw new NotFoundError(`Transfer job with ID ${jobId} not found`);
        }

        await putEventGeneratorJob(
            job.jobId,
            job.connection,
            'PENDING',
            'TRANSFER',
            this.ddbDocClient,
            undefined,
            job.sourceWarehouseId,
            job.destinationWarehouseId,
            job.parcelIds,
        );
    }
}
