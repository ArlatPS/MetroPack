import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { Location } from '../valueObjects/location';
import { getParcelEvents } from '../datasources/parcelTable';

interface Warehouse {
    id: string;
    location: Location;
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

interface ParcelEventBase {
    version: '1';
    id: string;
    detailType: string;
    source: string;
    time: string;
    region: string;
    resources: string[];
}

interface ParcelRegisteredEvent extends ParcelEventBase {
    detail: {
        metadata: {
            name: 'parcelRegistered';
        } & ParcelEventMetadata;
        data: {
            parcelId: string;
            time: string;
            pickupLocation: Location;
            transitWarehouses: Warehouse[];
            deliveryLocation: Location;
        };
    };
}

interface ParcelPickedUpEvent extends ParcelEventBase {
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

interface ParcelDeliveredToWarehouseEvent extends ParcelEventBase {
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

interface ParcelTransferStartedEvent extends ParcelEventBase {
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
interface ParcelTransferCompletedEvent extends ParcelEventBase {
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

interface ParcelDeliveryStartedEvent extends ParcelEventBase {
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

interface ParcelDeliveredEvent extends ParcelEventBase {
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
    private parcelId: string = '';
    private pickupLocation: Location = new Location(0, 0);
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
        pickupLocation: Location;
        deliveryLocation: Location;
        transitWarehouses: Warehouse[];
        status: ParcelStatus;
        currentWarehouse?: Warehouse;
        currentVehicleId?: string;
    } {
        return {
            parcelId: this.parcelId,
            pickupLocation: this.pickupLocation,
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

    private projectEvents(): void {
        this.events.forEach((event) => {
            const handler = this.eventHandlers[event.detail.metadata.name];
            if (handler) {
                handler.call(this, event);
            }
        });
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
        this.pickupLocation = event.detail.data.pickupLocation;
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
        if (this.currentWarehouse?.id === this.transitWarehouses[this.transitWarehouses.length - 1].id) {
            this.status = ParcelStatus.IN_WAREHOUSE;
        } else {
            this.status = ParcelStatus.TO_TRANSFER;
        }
    }
}
