import { Context } from 'aws-lambda';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getWarehouse, getWarehousesIds } from '../datasources/warehouseTable';
import { NotFoundError } from '../errors/NotFoundError';
import {
    getDeleteDeliveryOrderTransactItem,
    getDeletePickupOrderTransactItem,
    getDeliveryOrders,
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
    getTransferJob,
    getTransferJobByConnection,
    Job,
    JobStatus,
    TransferJob,
    updateDeliveryJobStatus,
    updatePickupJobStatus,
    updateTransferJobStatus,
} from '../datasources/jobsTables';
import { Parcel, Warehouse } from './parcel';
import { Location } from '../valueObjects/location';
import { randomUUID } from 'node:crypto';
import { getNextNight, getToday } from '../helpers/dateHelpers';
import { putEvent, putEvents } from '../datasources/parcelManagementEventBridge';
import {
    createPrepareDeliveryJobsCommand,
    createPreparePickupJobsCommand,
    createTransferJobCreatedEvent,
} from '../helpers/jobEventsHelpers';
import {
    createParcelDeliveryStartedEvent,
    createParcelTransferCompletedEvent,
    createParcelTransferStartedEvent,
} from '../helpers/parcelEventsHelpers';
import { PrepareDeliveryJobsCommandEvent, PreparePickupJobsCommandEvent } from '../types/jobEvents';

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

        return jobs;
    }

    public async createDeliveryJobs(warehouseId: string, date: string): Promise<Job[]> {
        const warehouse = await getWarehouse(warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse ${warehouseId} not found`);
        }

        const deliveryOrders = await getDeliveryOrders(warehouseId, date, this.limit, this.ddbDocClient);

        const availableVehicles = await getAvailableVehicles(warehouseId, 'DELIVERY', this.ddbDocClient);

        const { jobs, vehicles } = await getOptimizedJobs(availableVehicles, warehouse, deliveryOrders);

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

        return jobs;
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

        // const pickupJob = pickupJobId ? await getPickupJob(parcelId, this.ddbDocClient) : null;
        // const transferJob = transferJobId? await getTransferJobb(transferJobId, this.ddbDocClient) : null;
        //
        // if (parcelData.status === ParcelStatus.TRANSIT_TO_WAREHOUSE && pickupJob) {
        //     await this.updatePickupJobStatusByParcelId(parcelId, 'COMPLETED');
        // } else if (parcelData.status === ParcelStatus.TRANSFER && transferJob) {
        //     await updateTransferJobStatus(transferJob.jobId, 'COMPLETED', this.ddbDocClient);
        // } else {
        //     // when the parcel status is lagging behind job statuses, check transferJob then pickupJob
        //     if (transferJob) {
        //         await updateTransferJobStatus(transferJob.jobId, 'COMPLETED', this.ddbDocClient);
        //     } else if (pickupJob) {
        //         await this.updatePickupJobStatus(pickupJob.jobId, 'COMPLETED');
        //     } else {
        //         throw new Error('Invalid parcel status and no job found');
        //     }
        // }

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
            await putEvent('transferJobCreated', createTransferJobCreatedEvent(job, this.context).detail);
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
