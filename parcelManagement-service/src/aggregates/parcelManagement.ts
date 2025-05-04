import { Context } from 'aws-lambda';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getWarehouse } from '../datasources/warehouseTable';
import { NotFoundError } from '../errors/NotFoundError';
import { getDeletePickupOrderTransactItem, getPickupOrders } from '../datasources/parcelOrderTables';
import { getAvailableVehicles, getVehicleCapacityUpdateTransactItem } from '../datasources/vehicleTable';
import { getOptimizedJobs } from '../datasources/routingService';
import {
    getAddPickupJobTransactItem,
    Job,
    JobStatus,
    updatePickupJobStatusByParcelId,
} from '../datasources/jobsTables';

export class ParcelManagement {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;

    private readonly limit = 50;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public async createPickupJobs(warehouseId: string, date: string): Promise<Job[]> {
        const warehouse = await getWarehouse(warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse ${warehouseId} not found`);
        }
        const pickupOrders = await getPickupOrders(warehouseId, date, this.limit, this.ddbDocClient);

        const availableVehicles = await getAvailableVehicles(warehouseId, 'PICKUP', this.ddbDocClient);

        const { jobs, vehicles } = await getOptimizedJobs(availableVehicles, warehouse, pickupOrders);

        const vehicleCapacityUpdateTransactItems = vehicles.map((vehicle) =>
            getVehicleCapacityUpdateTransactItem(vehicle),
        );
        const pickupJobsSaveTransactItems = jobs.map((job) => getAddPickupJobTransactItem(job));
        const pickupOrdersDeleteTransactItems = jobs
            .reduce((acc, job) => {
                job.steps.forEach((step) => {
                    if (step.parcelId) {
                        acc.push(step.parcelId);
                    }
                });
                return acc;
            }, [] as string[])
            .map((parcelId) => getDeletePickupOrderTransactItem(parcelId));

        await this.ddbDocClient.send(
            new TransactWriteCommand({
                TransactItems: [
                    ...vehicleCapacityUpdateTransactItems,
                    ...pickupJobsSaveTransactItems,
                    ...pickupOrdersDeleteTransactItems,
                ],
            }),
        );

        return jobs;
    }

    public async updatePickupJobStatusByParcelId(parcelId: string, status: JobStatus): Promise<void> {
        await updatePickupJobStatusByParcelId(parcelId, status, this.ddbDocClient);
    }
}
