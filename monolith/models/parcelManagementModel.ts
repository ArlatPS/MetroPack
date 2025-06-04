import { randomUUID } from 'crypto';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

import { NotFoundError } from '../errors/NotFoundError';
import { Warehouse } from '../types/warehouse';
import { Location } from '../helpers/locationHelpers';

import { getWarehouse, getWarehousesIds } from '../datasources/warehouseTable';
import {
    getDeleteDeliveryOrderTransactItem,
    getDeletePickupOrderTransactItem,
    getDeliveryOrders,
    getOrderLastKey,
    getPickupOrders,
    Order,
    putDeliveryOrder,
    putPickupOrder,
} from '../datasources/parcelOrderTables';

import {
    getAvailableVehicles,
    getVehicleCapacityUpdateTransactItem,
    resetVehiclesCapacity,
    Vehicle,
} from '../datasources/vehicleTable';

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

import { createDeliveryJobs, DeliveryJob } from '../datasources/ors';

import { getNextNight, getToday } from '../helpers/dateHelpers';

import {
    ParcelDeliveredToWarehouseEvent,
    ParcelDeliveryStartedEvent,
    ParcelEvent,
    ParcelTransferCompletedEvent,
    ParcelTransferStartedEvent,
} from '../types/parcelEvents';

import { ParcelModel } from './parcelModel';
import { TrackingModel } from './trackingModel';
import { putEventGeneratorJob } from '../datasources/eventGeneratorJobTable';
import { putEventGeneratorVehicle } from '../datasources/eventGeneratorVehicleTable';

export class ParcelManagementModel {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly parcelModel: ParcelModel;
    private readonly trackingModel: TrackingModel;
    private readonly limit = 50;

    constructor(parcelModel: ParcelModel, trackingModel: TrackingModel, ddbDocClient: DynamoDBDocumentClient) {
        this.parcelModel = parcelModel;
        this.trackingModel = trackingModel;
        this.ddbDocClient = ddbDocClient;
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

            const { jobs, vehicles } = await this.getOptimizedJobs(availableVehicles, warehouse, orders);

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

            for (const job of jobs) {
                await this.processPickupJob(job, warehouse);
            }
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

            const { jobs, vehicles } = await this.getOptimizedJobs(availableVehicles, warehouse, orders);

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

            for (const job of jobs) {
                await this.processDeliveryJob(job, warehouse);
                await this.trackingModel.prepareJobTracking(
                    job.jobId,
                    job.steps.map((step) => step.parcelId),
                    job.vehicleId,
                    warehouseId,
                );
            }
        }
    }

    public async updatePickupJobStatus(pickupJobId: string, status: JobStatus): Promise<void> {
        await updatePickupJobStatus(pickupJobId, status, this.ddbDocClient);
    }

    public async updateDeliveryJobStatus(deliveryJobId: string, status: JobStatus): Promise<void> {
        await updateDeliveryJobStatus(deliveryJobId, status, this.ddbDocClient);
    }

    public async handleParcelDeliveredToWarehouse(parcelId: string, warehouseId: string): Promise<void> {
        this.parcelModel.resetState();
        await this.parcelModel.loadState(parcelId);
        const parcelData = this.parcelModel.getDetails();

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

        const parcelTransferStartedEvents = transferJob.parcelIds.map(
            (parcelId): ParcelTransferStartedEvent => ({
                detail: {
                    metadata: {
                        name: 'parcelTransferStarted',
                    },
                    data: {
                        parcelId,
                        time,
                        sourceWarehouse,
                        destinationWarehouse,
                    },
                },
            }),
        );

        await this.saveParcelEvents(parcelTransferStartedEvents);
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

        const parcelTransferCompletedEvents = transferJob.parcelIds.map(
            (parcelId): ParcelTransferCompletedEvent => ({
                detail: {
                    metadata: {
                        name: 'parcelTransferCompleted',
                    },
                    data: {
                        parcelId,
                        time,
                        sourceWarehouse,
                        destinationWarehouse,
                    },
                },
            }),
        );

        await this.saveParcelEvents(parcelTransferCompletedEvents);

        for (const event of parcelTransferCompletedEvents) {
            await this.handleParcelDeliveredToWarehouse(
                event.detail.data.parcelId,
                event.detail.data.destinationWarehouse.warehouseId,
            );
        }
    }

    public async handleDeliveryJobStarted(jobId: string, time: string): Promise<void> {
        const deliveryJob = await getDeliveryJob(jobId, this.ddbDocClient);

        if (!deliveryJob) {
            throw new NotFoundError(`Delivery job ${jobId} not found`);
        }

        const parcelDeliveryStartedEvents = deliveryJob.steps.map(
            ({ parcelId, location }): ParcelDeliveryStartedEvent => ({
                detail: {
                    metadata: {
                        name: 'parcelDeliveryStarted',
                    },
                    data: {
                        parcelId,
                        vehicleId: deliveryJob.vehicleId,
                        time,
                        deliveryLocation: location,
                    },
                },
            }),
        );

        await this.saveParcelEvents(parcelDeliveryStartedEvents);
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

        const parcelDeliveredToWarehouseEvents = pickupJob.steps.map(
            ({ parcelId }): ParcelDeliveredToWarehouseEvent => ({
                detail: {
                    metadata: {
                        name: 'parcelDeliveredToWarehouse',
                    },
                    data: {
                        parcelId,
                        vehicleId: pickupJob.vehicleId,
                        time,
                        warehouse,
                    },
                },
            }),
        );

        await this.saveParcelEvents(parcelDeliveredToWarehouseEvents);
        for (const event of parcelDeliveredToWarehouseEvents) {
            await this.handleParcelDeliveredToWarehouse(
                event.detail.data.parcelId,
                event.detail.data.warehouse.warehouseId,
            );
        }
    }

    public async resetVehicles(): Promise<void> {
        await resetVehiclesCapacity(this.ddbDocClient);
    }

    public async prepareJobs(): Promise<void> {
        const warehousesIds = await getWarehousesIds(this.ddbDocClient);

        const date = getToday();

        for (const warehouseId of warehousesIds) {
            await this.createPickupJobs(warehouseId, date);
            await this.createDeliveryJobs(warehouseId, date);
        }
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

            await this.processTransferJob(job.jobId, sourceWarehouseId, destinationWarehouseId);
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

    private async saveParcelEvents(events: ParcelEvent[]): Promise<void> {
        for (const event of events) {
            this.parcelModel.resetState();
            await this.parcelModel.loadState(event.detail.data.parcelId);
            await this.parcelModel.saveEvent(event);
        }
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

    private async getOptimizedJobs(
        vehicles: Vehicle[],
        warehouse: Warehouse,
        orders: Order[],
    ): Promise<{ jobs: Job[]; vehicles: Vehicle[] }> {
        const deliveryJobs = await createDeliveryJobs(
            vehicles.map((vehicle) => ({ id: vehicle.vehicleId, capacity: vehicle.capacity })),
            {
                id: warehouse.warehouseId,
                location: {
                    latitude: warehouse.location.latitude,
                    longitude: warehouse.location.longitude,
                },
                timeWindow: [0, 8 * 60 * 60],
            },
            orders.map((order) => ({
                id: order.parcelId,
                location: {
                    latitude: order.location.latitude,
                    longitude: order.location.longitude,
                },
            })),
        );

        const jobs: Job[] = deliveryJobs.map(
            (job: DeliveryJob): Job => ({
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
                        parcelId: step.deliveryId as string,
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

    private async processPickupJob(job: Job, warehouse: Warehouse): Promise<void> {
        await putEventGeneratorJob(
            job.jobId,
            job.vehicleId,
            'PENDING',
            'PICKUP',
            this.ddbDocClient,
            job.warehouseId,
            job.steps,
            warehouse.location,
            job.duration,
        );
        await putEventGeneratorVehicle(job.vehicleId, this.ddbDocClient);
    }

    private async processDeliveryJob(job: Job, warehouse: Warehouse): Promise<void> {
        await putEventGeneratorJob(
            job.jobId,
            job.vehicleId,
            'PENDING',
            'DELIVERY',
            this.ddbDocClient,
            job.warehouseId,
            job.steps,
            warehouse.location,
            job.duration,
        );
        await putEventGeneratorVehicle(job.vehicleId, this.ddbDocClient);
    }

    private async processTransferJob(
        jobId: string,
        sourceWarehouseId: string,
        destinationWarehouseId: string,
    ): Promise<void> {
        const connection = `${sourceWarehouseId}-${destinationWarehouseId}`;

        await putEventGeneratorJob(
            jobId,
            connection,
            'PENDING',
            'TRANSFER',
            this.ddbDocClient,
            undefined,
            undefined,
            undefined,
            undefined,
            sourceWarehouseId,
            destinationWarehouseId,
        );
        await putEventGeneratorVehicle(connection, this.ddbDocClient);
    }
}
