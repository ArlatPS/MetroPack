import { Context } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

import { NotFoundError } from '../errors/NotFoundError';
import { PrepareDeliveryJobsCommandEvent, PreparePickupJobsCommandEvent } from '../types/jobEvents';
import { Parcel, Warehouse } from './parcel';
import { Location } from '../valueObjects/location';

import { getWarehouse, getWarehousesIds } from '../datasources/warehouseTable';
import {
    getDeleteDeliveryOrderTransactItem,
    getDeletePickupOrderTransactItem,
    getDeliveryOrders,
    getOrderLastKey,
    getPickupOrders,
    putDeliveryOrder,
    putPickupOrder,
} from '../datasources/parcelOrderTables';
import {
    getAvailableVehicles,
    getVehicleCapacityUpdateTransactItem,
    resetVehiclesCapacity,
} from '../datasources/vehicleTable';
import { getOptimizedJobs } from '../datasources/routingService';
import {
    addParcelToTransferJob,
    addTransferJob,
    getAddDeliveryJobTransactItem,
    getAddPickupJobTransactItem,
    getDeliveryJob,
    getPickupJob,
    getTransferJob,
    getTransferJobByConnection,
    Job,
    JobStatus,
    TransferJob,
    updateDeliveryJobStatus,
    updatePickupJobStatus,
    updateTransferJobStatus,
} from '../datasources/jobsTables';
import { putEvents } from '../datasources/parcelManagementEventBridge';

import { getNextNight, getToday } from '../helpers/dateHelpers';
import {
    createDeliveryJobCreatedEvent,
    createPickupJobCreatedEvent,
    createPrepareDeliveryJobsCommand,
    createPreparePickupJobsCommand,
    createTransferJobCreatedEvent,
} from '../helpers/jobEventsHelpers';
import {
    createParcelDeliveredToWarehouseEvent,
    createParcelDeliveryStartedEvent,
    createParcelTransferCompletedEvent,
    createParcelTransferStartedEvent,
} from '../helpers/parcelEventsHelpers';

export class ParcelManagement {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;

    private readonly limit = 50;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public async createPickupJobs(warehouseId: string, date: string): Promise<void> {
        const warehouse = await getWarehouse(warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse ${warehouseId} not found`);
        }

        let init = true;
        let lastPickupOrderKey: getOrderLastKey | undefined;

        while (init || lastPickupOrderKey) {
            init = false;
            const { orders, lastKey } = await getPickupOrders(
                warehouseId,
                date,
                this.limit,
                this.ddbDocClient,
                lastPickupOrderKey,
            );

            if (orders.length === 0) {
                break;
            }

            lastPickupOrderKey = lastKey;

            const availableVehicles = await getAvailableVehicles(warehouseId, 'PICKUP', this.ddbDocClient);

            if (availableVehicles.length === 0) {
                throw new NotFoundError(`No available pickup vehicles for warehouse ${warehouseId}`);
            }

            const { jobs, vehicles } = await getOptimizedJobs(availableVehicles, warehouse, orders);

            const vehicleCapacityUpdateTransactItems = vehicles.map((vehicle) =>
                getVehicleCapacityUpdateTransactItem(vehicle),
            );
            const pickupJobsSaveTransactItems = jobs.map((job) => getAddPickupJobTransactItem(job));
            const pickupOrdersDeleteTransactItems = this.getParcelsFromJobs(jobs).map((parcelId) =>
                getDeletePickupOrderTransactItem(parcelId),
            );

            await this.ddbDocClient.send(
                new TransactWriteCommand({
                    TransactItems: [
                        ...vehicleCapacityUpdateTransactItems,
                        ...pickupJobsSaveTransactItems,
                        ...pickupOrdersDeleteTransactItems,
                    ],
                }),
            );

            await putEvents(jobs.map((job) => createPickupJobCreatedEvent(job, this.context)));
        }
    }

    public async createDeliveryJobs(warehouseId: string, date: string): Promise<void> {
        const warehouse = await getWarehouse(warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse ${warehouseId} not found`);
        }

        let init = true;
        let lastDeliveryOrderKey: getOrderLastKey | undefined;

        while (init || lastDeliveryOrderKey) {
            init = false;

            const { orders, lastKey } = await getDeliveryOrders(
                warehouseId,
                date,
                this.limit,
                this.ddbDocClient,
                lastDeliveryOrderKey,
            );

            if (orders.length === 0) {
                break;
            }

            lastDeliveryOrderKey = lastKey;

            const availableVehicles = await getAvailableVehicles(warehouseId, 'DELIVERY', this.ddbDocClient);

            if (availableVehicles.length === 0) {
                throw new NotFoundError(`No available delivery vehicles for warehouse ${warehouseId}`);
            }

            const { jobs, vehicles } = await getOptimizedJobs(availableVehicles, warehouse, orders);

            const vehicleCapacityUpdateTransactItems = vehicles.map((vehicle) =>
                getVehicleCapacityUpdateTransactItem(vehicle),
            );

            const deliveryJobsSaveTransactItems = jobs.map((job) => getAddDeliveryJobTransactItem(job));
            const deliveryOrdersDeleteTransactItems = this.getParcelsFromJobs(jobs).map((parcelId) =>
                getDeleteDeliveryOrderTransactItem(parcelId),
            );

            await this.ddbDocClient.send(
                new TransactWriteCommand({
                    TransactItems: [
                        ...vehicleCapacityUpdateTransactItems,
                        ...deliveryJobsSaveTransactItems,
                        ...deliveryOrdersDeleteTransactItems,
                    ],
                }),
            );

            await putEvents(jobs.map((job) => createDeliveryJobCreatedEvent(job, this.context)));
        }
    }

    public async updatePickupJobStatus(pickupJobId: string, status: JobStatus): Promise<void> {
        await updatePickupJobStatus(pickupJobId, status, this.ddbDocClient);
    }

    public async updateDeliveryJobStatus(deliveryJobId: string, status: JobStatus): Promise<void> {
        await updateDeliveryJobStatus(deliveryJobId, status, this.ddbDocClient);
    }

    public async handleParcelDeliveredToWarehouse(parcelId: string, warehouseId: string): Promise<void> {
        const parcel = new Parcel(this.ddbDocClient, this.context);
        await parcel.loadState(parcelId);
        const parcelData = parcel.getDetails();

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
            await this.addParcelToTransferJob(parcelId, warehouseId, nextWarehouse.warehouseId);
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

    public async handleTransferJobStarted(
        jobId: string,
        time: string,
        sourceWarehouseId: string,
        destinationWarehouseId: string,
    ): Promise<void> {
        const { transferJob, sourceWarehouse, destinationWarehouse } = await this.getTransferJobAndWarehouses(
            jobId,
            sourceWarehouseId,
            destinationWarehouseId,
        );

        await updateTransferJobStatus(jobId, 'IN_PROGRESS', this.ddbDocClient);

        const parcelTransferStartedEvents = transferJob.parcelIds.map((parcelId) =>
            createParcelTransferStartedEvent(parcelId, time, sourceWarehouse, destinationWarehouse, this.context),
        );

        await putEvents(parcelTransferStartedEvents);
    }

    public async handleTransferJobCompleted(
        jobId: string,
        time: string,
        sourceWarehouseId: string,
        destinationWarehouseId: string,
    ): Promise<void> {
        const { transferJob, sourceWarehouse, destinationWarehouse } = await this.getTransferJobAndWarehouses(
            jobId,
            sourceWarehouseId,
            destinationWarehouseId,
        );

        await updateTransferJobStatus(jobId, 'COMPLETED', this.ddbDocClient);

        const parcelTransferCompletedEvents = transferJob.parcelIds.map((parcelId) =>
            createParcelTransferCompletedEvent(parcelId, time, sourceWarehouse, destinationWarehouse, this.context),
        );

        await putEvents(parcelTransferCompletedEvents);
    }

    public async handleDeliveryJobStarted(jobId: string, time: string): Promise<void> {
        const deliveryJob = await getDeliveryJob(jobId, this.ddbDocClient);

        if (!deliveryJob) {
            throw new NotFoundError(`Delivery job ${jobId} not found`);
        }

        const deliveryJobStartedEvents = deliveryJob.steps.map(({ parcelId, location }) =>
            createParcelDeliveryStartedEvent(parcelId, deliveryJob.vehicleId, time, location, this.context),
        );

        await putEvents(deliveryJobStartedEvents);
    }

    public async handlePickupJobCompleted(jobId: string, time: string): Promise<void> {
        const pickupJob = await getPickupJob(jobId, this.ddbDocClient);

        if (!pickupJob) {
            throw new NotFoundError(`Pickup job ${jobId} not found`);
        }

        const warehouse = await getWarehouse(pickupJob.warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse ${pickupJob.warehouseId} not found`);
        }

        const parcelDeliveredToWarehouseEvents = pickupJob.steps.map(({ parcelId }) =>
            createParcelDeliveredToWarehouseEvent(parcelId, pickupJob.vehicleId, time, warehouse, this.context),
        );

        await putEvents(parcelDeliveredToWarehouseEvents);
    }

    public async resetVehicles(): Promise<void> {
        await resetVehiclesCapacity(this.ddbDocClient);
    }

    public async generateJobCommands(): Promise<void> {
        const warehouses = await getWarehousesIds(this.ddbDocClient);

        const date = getToday();

        const events = warehouses.reduce((acc, warehouseId) => {
            acc.push(createPreparePickupJobsCommand(warehouseId, date, this.context));
            acc.push(createPrepareDeliveryJobsCommand(warehouseId, date, this.context));
            return acc;
        }, [] as (PreparePickupJobsCommandEvent | PrepareDeliveryJobsCommandEvent)[]);

        await putEvents(events);
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

    private async addParcelToTransferJob(
        parcelId: string,
        sourceWarehouseId: string,
        destinationWarehouseId: string,
    ): Promise<void> {
        const date = getNextNight();
        const connection = `${sourceWarehouseId}-${destinationWarehouseId}`;
        const transferJob = await getTransferJobByConnection(connection, date, this.ddbDocClient);

        if (transferJob) {
            await addParcelToTransferJob(parcelId, transferJob.jobId, this.ddbDocClient);
        } else {
            const job: TransferJob = {
                jobId: randomUUID(),
                status: 'PENDING',
                date,
                sourceWarehouseId,
                destinationWarehouseId,
                parcelIds: [parcelId],
                connection,
            };

            await addTransferJob(job, this.ddbDocClient);
            await putEvents([createTransferJobCreatedEvent(job, this.context)]);
        }
    }

    private async getTransferJobAndWarehouses(
        jobId: string,
        sourceWarehouseId: string,
        destinationWarehouseId: string,
    ): Promise<{ transferJob: TransferJob; sourceWarehouse: Warehouse; destinationWarehouse: Warehouse }> {
        const transferJob = await getTransferJob(jobId, this.ddbDocClient);
        if (!transferJob) {
            throw new NotFoundError(`Transfer job ${jobId} not found`);
        }

        const sourceWarehouse = await getWarehouse(sourceWarehouseId, this.ddbDocClient);
        const destinationWarehouse = await getWarehouse(destinationWarehouseId, this.ddbDocClient);
        if (!sourceWarehouse || !destinationWarehouse) {
            throw new NotFoundError(`Source or destination warehouse not found`);
        }

        return { transferJob, sourceWarehouse, destinationWarehouse };
    }

    private getParcelsFromJobs(jobs: Job[]): string[] {
        return jobs.reduce((acc, job) => {
            job.steps.forEach((step) => {
                if (step.parcelId) {
                    acc.push(step.parcelId);
                }
            });
            return acc;
        }, [] as string[]);
    }
}
