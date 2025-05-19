import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Location } from '../helpers/locationHelpers';

import {
    deleteEventGeneratorJob,
    EventGeneratorJobStep,
    EventGeneratorTransferJob,
    EventGeneratorTransitJob,
    getEventGeneratorJobForVehicleWithStatus,
    updateEventGeneratorJobStatus,
    upsertEventGeneratorTransitJob,
} from '../datasources/eventGeneratorJobTable';
import { deleteEventGeneratorVehicle, getEventGeneratorVehicleIds } from '../datasources/eventGeneratorVehicleTable';

import { getHour } from '../helpers/dateHelpers';
import { ParcelManagementModel } from './parcelManagementModel';
import { TrackingModel } from './trackingModel';
import { ParcelModel } from './parcelModel';
import { ParcelDeliveredEvent, ParcelPickedUpEvent } from '../types/parcelEvents';

export class EventGeneratorModel {
    private readonly parcelManagementModel: ParcelManagementModel;
    private readonly trackingModel: TrackingModel;
    private readonly parcelModel: ParcelModel;
    private readonly ddbDocClient: DynamoDBDocumentClient;

    constructor(
        parcelManagementModel: ParcelManagementModel,
        trackingModel: TrackingModel,
        parcelModel: ParcelModel,
        ddbDocClient: DynamoDBDocumentClient,
    ) {
        this.parcelManagementModel = parcelManagementModel;
        this.trackingModel = trackingModel;
        this.parcelModel = parcelModel;
        this.ddbDocClient = ddbDocClient;
    }

    public async updateJobs(): Promise<void> {
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

    private async generateEventsForVehicle(vehicleId: string): Promise<void> {
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

    private async generateEventsForJob(job: EventGeneratorTransitJob | EventGeneratorTransferJob): Promise<void> {
        switch (job.type) {
            case 'TRANSFER':
                await this.generateEventsForTransferJob(job);
                break;
            default:
                await this.generateEventsForTransitJob(job);
                break;
        }
    }

    private async generateEventsForTransferJob(job: EventGeneratorTransferJob): Promise<void> {
        if (job.status === 'PENDING' && getHour() > 20) {
            await this.parcelManagementModel.handleTransferJobStarted(
                job.jobId,
                new Date().toISOString(),
                job.sourceWarehouseId,
                job.destinationWarehouseId,
            );
            await updateEventGeneratorJobStatus(job.jobId, 'IN_PROGRESS', this.ddbDocClient);
            // if after 5 am or if after 4 am and dice roll passes
        } else if (getHour() <= 6 && (getHour() >= 5 || (getHour() === 4 && Math.random() > 0.7))) {
            await this.parcelManagementModel.handleTransferJobCompleted(
                job.jobId,
                new Date().toISOString(),
                job.sourceWarehouseId,
                job.destinationWarehouseId,
            );
            await deleteEventGeneratorJob(job.jobId, this.ddbDocClient);
        }
    }

    private async generateEventsForTransitJob(job: EventGeneratorTransitJob): Promise<void> {
        if (job.status === 'PENDING') {
            if (job.type === 'PICKUP') {
                await this.parcelManagementModel.updatePickupJobStatus(job.jobId, 'IN_PROGRESS');
            } else {
                await this.parcelManagementModel.updateDeliveryJobStatus(job.jobId, 'IN_PROGRESS');
                await this.parcelManagementModel.handleDeliveryJobStarted(job.jobId, new Date().toISOString());
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
                        await this.parcelManagementModel.updatePickupJobStatus(job.jobId, 'COMPLETED');
                        await this.parcelManagementModel.handlePickupJobCompleted(job.jobId, new Date().toISOString());
                    } else {
                        await this.parcelManagementModel.updateDeliveryJobStatus(job.jobId, 'COMPLETED');
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
                    const parcelPickedUpEvent: ParcelPickedUpEvent = {
                        detail: {
                            metadata: {
                                name: 'parcelPickedUp',
                            },
                            data: {
                                parcelId: currentStep.parcelId,
                                vehicleId: job.vehicleId,
                                time: new Date().toISOString(),
                                pickupLocation: currentStep.location,
                            },
                        },
                    };

                    this.parcelModel.resetState();
                    await this.parcelModel.loadState(currentStep.parcelId);
                    await this.parcelModel.saveEvent(parcelPickedUpEvent);
                } else {
                    const parcelDeliveredEvent: ParcelDeliveredEvent = {
                        detail: {
                            metadata: {
                                name: 'parcelDelivered',
                            },
                            data: {
                                parcelId: currentStep.parcelId,
                                vehicleId: job.vehicleId,
                                time: new Date().toISOString(),
                                deliveryLocation: currentStep.location,
                            },
                        },
                    };
                    this.parcelModel.resetState();
                    await this.parcelModel.loadState(currentStep.parcelId);
                    await this.parcelModel.saveEvent(parcelDeliveredEvent);
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
        await this.trackingModel.updateVehicleLocation(vehicleId, jobId, location);
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
