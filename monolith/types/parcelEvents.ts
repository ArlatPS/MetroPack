import { Location } from '../helpers/locationHelpers';
import { Warehouse } from './warehouse';

export enum ParcelStatus {
    TO_PICKUP = 'TO_PICKUP',
    TRANSIT_TO_WAREHOUSE = 'TRANSIT_TO_WAREHOUSE',
    TO_TRANSFER = 'TO_TRANSFER',
    TRANSFER = 'TRANSFER',
    IN_WAREHOUSE = 'IN_WAREHOUSE',
    TRANSIT_TO_CUSTOMER = 'TRANSIT_TO_CUSTOMER',
    DELIVERED = 'DELIVERED',
}

export interface ParcelRegisteredEvent {
    detail: {
        metadata: {
            name: 'parcelRegistered';
        };
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

export interface ParcelPickedUpEvent {
    detail: {
        metadata: {
            name: 'parcelPickedUp';
        };
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            pickupLocation: Location;
        };
    };
}

export interface ParcelDeliveredToWarehouseEvent {
    detail: {
        metadata: {
            name: 'parcelDeliveredToWarehouse';
        };
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            warehouse: Warehouse;
        };
    };
}

export interface ParcelTransferStartedEvent {
    detail: {
        metadata: {
            name: 'parcelTransferStarted';
        };
        data: {
            parcelId: string;
            time: string;
            sourceWarehouse: Warehouse;
            destinationWarehouse: Warehouse;
        };
    };
}
export interface ParcelTransferCompletedEvent {
    detail: {
        metadata: {
            name: 'parcelTransferCompleted';
        };
        data: {
            parcelId: string;
            time: string;
            sourceWarehouse: Warehouse;
            destinationWarehouse: Warehouse;
        };
    };
}

export interface ParcelDeliveryStartedEvent {
    detail: {
        metadata: {
            name: 'parcelDeliveryStarted';
        };
        data: {
            parcelId: string;
            vehicleId: string;
            time: string;
            deliveryLocation: Location;
        };
    };
}

export interface ParcelDeliveredEvent {
    detail: {
        metadata: {
            name: 'parcelDelivered';
        };
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
