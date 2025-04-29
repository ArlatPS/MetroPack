import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { Location } from '../valueObjects/location';
import { getParcelEvents, putParcelEvent } from '../datasources/parcelTable';
import { gatAvailableWarehouses } from '../datasources/warehouseTable';
import { createParcelRegisteredEvent } from '../helpers/parcelEventsHelpers';
import { NotFoundError } from '../errors/NotFoundError';
import { EventBase } from '../types/events';

export interface Warehouse {
    warehouseId: string;
    location: Location;
    cityCodename: string;
    range?: number;
}

enum ParcelStatus {
    TO_PICKUP = 'TO_PICKUP',
    TRANSIT_TO_WAREHOUSE = 'TRANSIT_TO_WAREHOUSE',
    TO_TRANSFER = 'TO_TRANSFER',
    TRANSFER = 'TRANSIT_BETWEEN_WAREHOUSES',
    IN_WAREHOUSE = 'IN_WAREHOUSE',
    TRANSIT_TO_CUSTOMER = 'TRANSIT_TO_CUSTOMER',
    DELIVERED = 'DELIVERED',
}

interface ParcelEventMetadata {
    domain: 'parcelShipping';
    subdomain: 'parcelManagement';
    service: 'parcelManagementService';
    category: 'domainEvent';
    type: 'data';
}

export interface ParcelRegisteredEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelRegistered';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            time: string;
            pickupDate: string;
            pickupLocation: Location;
            transitWarehouses: Warehouse[];
            deliveryDate: string;
            deliveryLocation: Location;
        };
    };
}

interface ParcelPickedUpEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelPickedUp';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            pickupLocation: Location;
        };
    };
}

interface ParcelDeliveredToWarehouseEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelDeliveredToWarehouse';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            warehouse: Warehouse;
        };
    };
}

interface ParcelTransferStartedEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelTransferStarted';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            fromWarehouse: Warehouse;
            toWarehouse: Warehouse;
        };
    };
}
interface ParcelTransferCompletedEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelTransferCompleted';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            fromWarehouse: Warehouse;
            toWarehouse: Warehouse;
        };
    };
}

interface ParcelDeliveryStartedEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelDeliveryStarted';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            deliveryLocation: Location;
        };
    };
}

interface ParcelDeliveredEvent extends EventBase {
    detail: {
        metadata: {
            name: 'parcelDelivered';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            deliveryLocation: Location;
        };
    };
}

export type ParcelEvent =
    | ParcelRegisteredEvent
    | ParcelPickedUpEvent
    | ParcelDeliveredToWarehouseEvent
    | ParcelTransferStartedEvent
    | ParcelTransferCompletedEvent
    | ParcelDeliveryStartedEvent
    | ParcelDeliveredEvent;

export class Parcel {
    private parcelId = '';
    private pickupDate = '';
    private pickupLocation: Location = new Location(0, 0);
    private deliveryDate = '';
    private deliveryLocation: Location = new Location(0, 0);
    private transitWarehouses: Warehouse[] = [];
    private status: ParcelStatus = ParcelStatus.TO_PICKUP;
    private currentWarehouse?: Warehouse;
    private currentVehicleId?: string;

    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;
    private events: ParcelEvent[] = [];

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public getDetails(): {
        parcelId: string;
        pickupDate: string;
        pickupLocation: Location;
        deliveryDate: string;
        deliveryLocation: Location;
        transitWarehouses: Warehouse[];
        status: ParcelStatus;
        currentWarehouse?: Warehouse;
        currentVehicleId?: string;
    } {
        return {
            parcelId: this.parcelId,
            pickupDate: this.pickupDate,
            pickupLocation: this.pickupLocation,
            deliveryDate: this.deliveryDate,
            deliveryLocation: this.deliveryLocation,
            transitWarehouses: this.transitWarehouses,
            status: this.status,
            currentWarehouse: this.currentWarehouse,
            currentVehicleId: this.currentVehicleId,
        };
    }

    public async loadState(parcelId: string): Promise<void> {
        this.events = await getParcelEvents(parcelId, this.ddbDocClient);

        this.projectEvents();
    }

    // choice between method and execute commands
    public async register(
        pickupDate: string,
        pickupLocation: Location,
        deliveryDate: string,
        deliveryLocation: Location,
    ): Promise<void> {
        const warehouses = await gatAvailableWarehouses(this.ddbDocClient);
        if (warehouses.length === 0) {
            throw new Error('No available warehouses');
        }
        const warehouseLocations = warehouses.map(
            (warehouse) =>
                new Location(
                    warehouse.location.longitude,
                    warehouse.location.latitude,
                    warehouse.warehouseId,
                    warehouse.range,
                ),
        );

        const pickupWarehouseLocation = pickupLocation.getClosestLocation(warehouseLocations);

        if (!pickupWarehouseLocation) {
            throw new NotFoundError('No available warehouse for pickup');
        }

        const deliveryWarehouseLocation = deliveryLocation.getClosestLocation(warehouseLocations);

        if (!deliveryWarehouseLocation) {
            throw new NotFoundError('No available warehouse for delivery');
        }
        const transitWarehouses: Warehouse[] = [];

        if (pickupWarehouseLocation.equals(deliveryWarehouseLocation)) {
            const warehouse = warehouses.find((warehouse) => {
                return warehouse.warehouseId === pickupWarehouseLocation.id;
            });
            transitWarehouses.push(warehouse as Warehouse);
        } else {
            const pickupWarehouse = warehouses.find((warehouse) => {
                return warehouse.warehouseId === pickupWarehouseLocation.id;
            });
            const deliveryWarehouse = warehouses.find((warehouse) => {
                return warehouse.warehouseId === deliveryWarehouseLocation.id;
            });
            transitWarehouses.push(pickupWarehouse as Warehouse, deliveryWarehouse as Warehouse);
        }

        await this.saveAndEmitEvent(
            createParcelRegisteredEvent(
                pickupDate,
                pickupLocation,
                deliveryDate,
                deliveryLocation,
                transitWarehouses,
                this.context,
            ),
        );
    }

    public async saveEvent(event: ParcelEvent): Promise<void> {
        const parcelId = event.detail.data.parcelId;
        const eventIndex = this.events.length;

        this.validateEvent(event);

        await putParcelEvent(parcelId, eventIndex, event, this.ddbDocClient);

        this.projectEvent(event);
        this.events.push(event);
    }

    private async saveAndEmitEvent(event: ParcelRegisteredEvent): Promise<void> {
        const parcelId = event.detail.data.parcelId;
        const eventIndex = this.events.length;

        await putParcelEvent(parcelId, eventIndex, event, this.ddbDocClient);

        this.projectEvent(event);
        this.events.push(event);
    }

    private projectEvents(): void {
        this.events.forEach((event) => {
            this.projectEvent(event);
        });
    }

    private projectEvent(event: ParcelEvent): void {
        const handler = this.eventHandlers[event.detail.metadata.name];
        if (handler) {
            handler.call(this, event);
        }
    }

    private eventHandlers: { [key: string]: (event: ParcelEvent) => void } = {
        parcelRegistered: (event: ParcelEvent) => this.applyParcelRegisteredEvent(event as ParcelRegisteredEvent),
        parcelPickedUp: (event: ParcelEvent) => this.applyParcelPickedUpEvent(event as ParcelPickedUpEvent),
        parcelDeliveredToWarehouse: (event: ParcelEvent) =>
            this.applyParcelDeliveredToWarehouseEvent(event as ParcelDeliveredToWarehouseEvent),
        parcelTransferStarted: (event: ParcelEvent) =>
            this.applyParcelTransferStartedEvent(event as ParcelTransferStartedEvent),
        parcelTransferCompleted: (event: ParcelEvent) =>
            this.applyParcelTransferCompletedEvent(event as ParcelTransferCompletedEvent),
        parcelDeliveryStarted: (event: ParcelEvent) =>
            this.applyParcelDeliveryStartedEvent(event as ParcelDeliveryStartedEvent),
        parcelDelivered: () => this.applyParcelDeliveredEvent(),
    };

    private applyParcelRegisteredEvent(event: ParcelRegisteredEvent): void {
        this.parcelId = event.detail.data.parcelId;
        this.pickupDate = event.detail.data.pickupDate;
        this.pickupLocation = event.detail.data.pickupLocation;
        this.deliveryDate = event.detail.data.deliveryDate;
        this.deliveryLocation = event.detail.data.deliveryLocation;
        this.transitWarehouses = event.detail.data.transitWarehouses;
        this.status = ParcelStatus.TO_PICKUP;
    }

    private applyParcelPickedUpEvent(event: ParcelPickedUpEvent): void {
        this.currentVehicleId = event.detail.data.vehicleId;
        this.status = ParcelStatus.TRANSIT_TO_WAREHOUSE;
    }

    private applyParcelDeliveredToWarehouseEvent(event: ParcelDeliveredToWarehouseEvent): void {
        this.currentVehicleId = undefined;
        this.currentWarehouse = event.detail.data.warehouse;

        this.defineStateAfterDeliveryToWarehouse();
    }

    private applyParcelTransferStartedEvent(event: ParcelTransferStartedEvent): void {
        this.currentVehicleId = event.detail.data.vehicleId;
        this.currentWarehouse = undefined;
        this.status = ParcelStatus.TRANSFER;
    }

    private applyParcelTransferCompletedEvent(event: ParcelTransferCompletedEvent): void {
        this.currentVehicleId = undefined;
        this.currentWarehouse = event.detail.data.toWarehouse;

        this.defineStateAfterDeliveryToWarehouse();
    }

    private applyParcelDeliveryStartedEvent(event: ParcelDeliveryStartedEvent): void {
        this.currentVehicleId = event.detail.data.vehicleId;
        this.currentWarehouse = undefined;
        this.status = ParcelStatus.TRANSIT_TO_CUSTOMER;
    }

    private applyParcelDeliveredEvent(): void {
        this.currentVehicleId = undefined;
        this.currentWarehouse = undefined;
        this.status = ParcelStatus.DELIVERED;
    }

    private defineStateAfterDeliveryToWarehouse(): void {
        if (
            this.currentWarehouse?.warehouseId === this.transitWarehouses[this.transitWarehouses.length - 1].warehouseId
        ) {
            this.status = ParcelStatus.IN_WAREHOUSE;
        } else {
            this.status = ParcelStatus.TO_TRANSFER;
        }
    }

    private validateEvent(event: ParcelEvent): void {
        switch (event.detail.metadata.name) {
            case 'parcelPickedUp':
                if (this.status !== ParcelStatus.TO_PICKUP) {
                    throw new Error('Invalid state for parcelPickedUp event');
                }
                break;
            case 'parcelDeliveredToWarehouse':
                if (this.status !== ParcelStatus.TRANSIT_TO_WAREHOUSE) {
                    throw new Error('Invalid state for parcelDeliveredToWarehouse event');
                }
                break;
            case 'parcelTransferStarted':
                if (this.status !== ParcelStatus.TO_TRANSFER) {
                    throw new Error('Invalid state for parcelTransferStarted event');
                }
                break;
            case 'parcelTransferCompleted':
                if (this.status !== ParcelStatus.TRANSFER) {
                    throw new Error('Invalid state for parcelTransferCompleted event');
                }
                break;
            case 'parcelDeliveryStarted':
                if (
                    this.status !== ParcelStatus.IN_WAREHOUSE ||
                    this.currentWarehouse?.warehouseId !==
                        this.transitWarehouses[this.transitWarehouses.length - 1].warehouseId
                ) {
                    throw new Error('Invalid state for parcelDeliveryStarted event');
                }
                break;
            case 'parcelDelivered':
                if (this.status !== ParcelStatus.TRANSIT_TO_CUSTOMER) {
                    throw new Error('Invalid state for parcelDelivered event');
                }
                break;
            default:
                throw new Error(`Unknown event type: ${event.detail.metadata.name}`);
        }
    }
}
