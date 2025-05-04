import { Context } from 'aws-lambda';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getWarehouse } from '../datasources/warehouseTable';
import { NotFoundError } from '../errors/NotFoundError';
import {
    getDeletePickupOrderTransactItem,
    getPickupOrders,
    putDeliveryOrder,
    putPickupOrder,
} from '../datasources/parcelOrderTables';
import { getAvailableVehicles, getVehicleCapacityUpdateTransactItem } from '../datasources/vehicleTable';
import { getOptimizedJobs } from '../datasources/routingService';
import {
    addTransferJob,
    getAddPickupJobTransactItem,
    getPickupJobByParcelId,
    getTransferJobByParcelId,
    Job,
    JobStatus,
    TransferJob,
    updatePickupJobStatusByParcelId,
    updateTransferJobStatus,
} from '../datasources/jobsTables';
import { Parcel, ParcelStatus, Warehouse } from './parcel';
import { Location } from '../valueObjects/location';
import { randomUUID } from 'node:crypto';
import { getNextNight } from '../helpers/dateHelpers';
import { putEvent } from '../datasources/parcelManagementEventBridge';
import { createTransferJobCreatedEvent } from '../helpers/jobEventsHelpers';

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

    public async handleParcelDeliveredToWarehouse(parcelId: string, warehouseId: string): Promise<void> {
        const parcel = new Parcel(this.ddbDocClient, this.context);
        await parcel.loadState(parcelId);
        const parcelData = parcel.getDetails();

        const pickupJob = await getPickupJobByParcelId(parcelId, this.ddbDocClient);
        const transferJob = await getTransferJobByParcelId(parcelId, this.ddbDocClient);

        if (parcelData.status === ParcelStatus.TRANSIT_TO_WAREHOUSE && pickupJob) {
            await this.updatePickupJobStatusByParcelId(parcelId, 'COMPLETED');
        } else if (parcelData.status === ParcelStatus.TRANSFER && transferJob) {
            await updateTransferJobStatus(transferJob.jobId, 'COMPLETED', this.ddbDocClient);
        } else {
            // if the parcel status is lagging behind job statuses, check transferJob then pickupJob
            if (transferJob) {
                await updateTransferJobStatus(transferJob.jobId, 'COMPLETED', this.ddbDocClient);
            } else if (pickupJob) {
                await this.updatePickupJobStatusByParcelId(parcelId, 'COMPLETED');
            } else {
                throw new Error('Invalid parcel status and no job found');
            }
        }

        const lastWarehouse = parcelData.transitWarehouses[parcelData.transitWarehouses.length - 1];

        if (warehouseId === lastWarehouse.warehouseId) {
            await this.createDeliveryOrder(
                parcelId,
                warehouseId,
                parcelData.deliveryDate,
                parcelData.deliveryLocation,
                lastWarehouse,
            );
        } else {
            const nextWarehouse =
                parcelData.transitWarehouses[
                    parcelData.transitWarehouses.findIndex((warehouse) => warehouse.warehouseId === warehouseId) + 1
                ];
            await this.createTransferJob(warehouseId, nextWarehouse.warehouseId);
        }
    }

    public async createPickupOrder(
        parcelId: string,
        warehouseId: string,
        date: string,
        location: Location,
        warehouse: Warehouse,
    ): Promise<void> {
        await putPickupOrder(
            {
                parcelId,
                warehouseId,
                date,
                location,
                warehouse,
            },
            this.ddbDocClient,
        );
    }

    private async createDeliveryOrder(
        parcelId: string,
        warehouseId: string,
        date: string,
        location: Location,
        warehouse: Warehouse,
    ): Promise<void> {
        await putDeliveryOrder(
            {
                parcelId,
                warehouseId,
                date,
                location,
                warehouse,
            },
            this.ddbDocClient,
        );
    }

    private async createTransferJob(sourceWarehouseId: string, destinationWarehouseId: string): Promise<void> {
        const job: TransferJob = {
            jobId: randomUUID(),
            status: 'PENDING',
            date: getNextNight(),
            sourceWarehouseId,
            destinationWarehouseId,
        };

        await addTransferJob(job, this.ddbDocClient);
        await putEvent('transferJobCreated', createTransferJobCreatedEvent(job, this.context).detail);
    }
}
