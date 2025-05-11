import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { getDeliveryJob, getPickupJob } from '../../datasources/jobsTables';
import { NotFoundError } from '../../errors/NotFoundError';
import {
    deleteEventGeneratorJob,
    EventGeneratorJobStep,
    EventGeneratorTransferJob,
    EventGeneratorTransitJob,
    getEventGeneratorJobForVehicleWithStatus,
    putEventGeneratorJob,
    updateEventGeneratorJobStatus,
    upsertEventGeneratorTransitJob,
} from '../datasources/eventGeneratorJobTable';
import {
    deleteEventGeneratorVehicle,
    getEventGeneratorVehicleIds,
    putEventGeneratorVehicle,
} from '../datasources/eventGeneratorVehicleTable';
import { putEvents } from '../../datasources/parcelManagementEventBridge';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import {
    createDeliveryJobCompletedEvent,
    createDeliveryJobStartedEvent,
    createPickupJobCompletedEvent,
    createPickupJobStartedEvent,
    createTransferJobCompletedEvent,
    createTransferJobStartedEvent,
} from '../../helpers/jobEventsHelpers';
import { getHour } from '../../helpers/dateHelpers';
import { getWarehouse } from '../../datasources/warehouseTable';
import { Location } from '../../valueObjects/location';
import { createParcelDeliveryCompletedEvent, createParcelPickedUpEvent } from '../../helpers/parcelEventsHelpers';
import { updateVehicleLocation } from '../datasources/tracking';

export class EventGenerator {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly eventBridgeClient: EventBridgeClient;
    private readonly context: Context;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context, eventBridgeClient: EventBridgeClient) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
        this.eventBridgeClient = eventBridgeClient;
    }

    public async generateEvents(): Promise<void> {
        let lastVehicleKey: string | undefined;
        let init = true;

        while (init || lastVehicleKey) {
            init = false;

            const { vehicleIds, lastKey } = await getEventGeneratorVehicleIds(this.ddbDocClient, lastVehicleKey);

            if (vehicleIds.length === 0) {
                break;
            }

            lastVehicleKey = lastKey;

            for (const vehicleId of vehicleIds) {
                await this.generateEventsForVehicle(vehicleId);
            }
        }
    }

    public async generateEventsForVehicle(vehicleId: string): Promise<void> {
        const inProgressJobs = await getEventGeneratorJobForVehicleWithStatus(
            vehicleId,
            'IN_PROGRESS',
            this.ddbDocClient,
        );

        if (inProgressJobs.length === 0) {
            const pendingJobs = await getEventGeneratorJobForVehicleWithStatus(vehicleId, 'PENDING', this.ddbDocClient);
            if (pendingJobs.length === 0) {
                await deleteEventGeneratorVehicle(vehicleId, this.ddbDocClient);
                return;
            }
            await this.generateEventsForJob(pendingJobs[0]);
        } else if (inProgressJobs.length === 1) {
            await this.generateEventsForJob(inProgressJobs[0]);
        } else {
            throw new Error(`Multiple in-progress jobs found for vehicle ${vehicleId}`);
        }
    }

    public async generateEventsForJob(job: EventGeneratorTransitJob | EventGeneratorTransferJob): Promise<void> {
        switch (job.type) {
            case 'TRANSFER':
                await this.generateEventsForTransferJob(job);
                break;
            default:
                await this.generateEventsForTransitJob(job);
                break;
        }
    }

    public async generateEventsForTransferJob(job: EventGeneratorTransferJob): Promise<void> {
        if (job.status === 'PENDING' && getHour() > 20) {
            await putEvents(
                [
                    createTransferJobStartedEvent(
                        job.jobId,
                        job.sourceWarehouseId,
                        job.destinationWarehouseId,
                        this.context,
                    ),
                ],
                'eventGeneratorService',
                this.eventBridgeClient,
            );
            await updateEventGeneratorJobStatus(job.jobId, 'IN_PROGRESS', this.ddbDocClient);
            // if after 5 am or if after 4 am and dice roll passes
        } else if (getHour() <= 6 && (getHour() >= 5 || (getHour() === 4 && Math.random() > 0.7))) {
            await putEvents(
                [
                    createTransferJobCompletedEvent(
                        job.jobId,
                        job.sourceWarehouseId,
                        job.destinationWarehouseId,
                        this.context,
                    ),
                ],
                'eventGeneratorService',
                this.eventBridgeClient,
            );
            await deleteEventGeneratorJob(job.jobId, this.ddbDocClient);
        }
    }

    public async generateEventsForTransitJob(job: EventGeneratorTransitJob): Promise<void> {
        if (job.status === 'PENDING') {
            if (job.type === 'PICKUP') {
                await putEvents(
                    [createPickupJobStartedEvent(job.jobId, job.vehicleId, job.warehouseId, this.context)],
                    'eventGeneratorService',
                    this.eventBridgeClient,
                );
            } else {
                await putEvents(
                    [createDeliveryJobStartedEvent(job.jobId, job.vehicleId, job.warehouseId, this.context)],
                    'eventGeneratorService',
                    this.eventBridgeClient,
                );
            }
            await upsertEventGeneratorTransitJob(
                { ...job, status: 'IN_PROGRESS', started: Date.now() / 1000 },
                this.ddbDocClient,
            );
        } else {
            const lastDoneStepIndex = this.getLastDoneIndex(job.steps);
            // if no steps are done, last step wast departure from warehouse
            const lastDoneStep = job.steps[lastDoneStepIndex] || {
                location: job.location,
                arrivalTime: 0,
                parcelId: '',
            };
            const currentStep = job.steps[lastDoneStepIndex + 1] || job.steps[0];
            const isLastStepDone = lastDoneStepIndex === job.steps.length - 1;

            const started = job.started as number;
            const now = Date.now() / 1000;
            const timeElapsed = now - started;

            if (isLastStepDone) {
                if (now - started > job.duration) {
                    // job completed
                    if (job.type === 'PICKUP') {
                        await putEvents(
                            [createPickupJobCompletedEvent(job.jobId, job.vehicleId, job.warehouseId, this.context)],
                            'eventGeneratorService',
                            this.eventBridgeClient,
                        );
                    } else {
                        await putEvents(
                            [createDeliveryJobCompletedEvent(job.jobId, job.vehicleId, job.warehouseId, this.context)],
                            'eventGeneratorService',
                            this.eventBridgeClient,
                        );
                    }
                    await deleteEventGeneratorJob(job.jobId, this.ddbDocClient);
                    await this.updateVehicleLocation(job.vehicleId, job.jobId, job.location);
                    return;
                }
                // job not completed yet
                const timeElapsedSinceLastDoneStep = now - (started + lastDoneStep.arrivalTime);
                const progress = timeElapsedSinceLastDoneStep / (job.duration - lastDoneStep.arrivalTime);
                const lastDoneStepLocation = new Location(
                    lastDoneStep.location.longitude,
                    lastDoneStep.location.latitude,
                );
                const endLocation = new Location(job.location.longitude, job.location.latitude);
                const location = lastDoneStepLocation.getLocationBetween(endLocation, progress);
                await this.updateVehicleLocation(job.vehicleId, job.jobId, location);
                return;
            }

            if (timeElapsed > currentStep.arrivalTime) {
                // pickup/delivery made now
                if (job.type === 'PICKUP') {
                    await putEvents(
                        [
                            createParcelPickedUpEvent(
                                currentStep.parcelId,
                                job.vehicleId,
                                currentStep.location,
                                this.context,
                            ),
                        ],
                        'eventGeneratorService',
                        this.eventBridgeClient,
                    );
                } else {
                    await putEvents(
                        [
                            createParcelDeliveryCompletedEvent(
                                currentStep.parcelId,
                                job.vehicleId,
                                currentStep.location,
                                this.context,
                            ),
                        ],
                        'eventGeneratorService',
                        this.eventBridgeClient,
                    );
                }

                const location = new Location(currentStep.location.longitude, currentStep.location.latitude);
                await this.updateVehicleLocation(job.vehicleId, job.jobId, location);

                await upsertEventGeneratorTransitJob(
                    {
                        ...job,
                        steps: job.steps.map((step) => {
                            if (step.parcelId === currentStep.parcelId) {
                                return { ...step, done: true };
                            }
                            return step;
                        }),
                    },
                    this.ddbDocClient,
                );
            } else if (job.type === 'DELIVERY') {
                // delivery in progress - upate vehicle location
                const timeElapsedSinceLastDoneStep = now - (started + lastDoneStep.arrivalTime);
                const progress = timeElapsedSinceLastDoneStep / (currentStep.arrivalTime - lastDoneStep.arrivalTime);
                const lastDoneStepLocation = new Location(
                    lastDoneStep.location.longitude,
                    lastDoneStep.location.latitude,
                );
                const currentStepLocation = new Location(currentStep.location.longitude, currentStep.location.latitude);
                const location = lastDoneStepLocation.getLocationBetween(currentStepLocation, progress);

                // update Location
                await this.updateVehicleLocation(job.vehicleId, job.jobId, location);
            }
        }
    }

    private async updateVehicleLocation(vehicleId: string, jobId: string, location: Location): Promise<void> {
        await updateVehicleLocation(vehicleId, jobId, location);
    }

    public async processPickupJob(jobId: string): Promise<void> {
        const job = await getPickupJob(jobId, this.ddbDocClient);

        if (!job) {
            throw new NotFoundError(`Pickup job with ID ${jobId} not found`);
        }

        const warehouse = await getWarehouse(job.warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse with ID ${job.warehouseId} not found`);
        }

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

    public async processDeliveryJob(jobId: string): Promise<void> {
        const job = await getDeliveryJob(jobId, this.ddbDocClient);

        if (!job) {
            throw new NotFoundError(`Delivery job with ID ${jobId} not found`);
        }

        const warehouse = await getWarehouse(job.warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse with ID ${job.warehouseId} not found`);
        }

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

    public async processTransferJob(
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

    private getLastDoneIndex(array: EventGeneratorJobStep[]): number {
        for (let i = array.length - 1; i >= 0; i--) {
            if (array[i].done) {
                return i;
            }
        }
        return -1;
    }
}
