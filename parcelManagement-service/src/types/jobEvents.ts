export interface EventBase {
    version: '1';
    id: string;
    detailType: string;
    source: string;
    time: string;
    region: string;
    resources: string[];
}

export interface PreparePickupJobsCommandEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'command';
            name: 'preparePickupJobs';
        };
        data: {
            warehouseId: string;
            date: string;
        };
    };
}

export interface PrepareDeliveryJobsCommandEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'command';
            name: 'prepareDeliveryJobs';
        };
        data: {
            warehouseId: string;
            date: string;
        };
    };
}

export interface PickupJobCreatedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'pickupJobCreated';
        };
        data: {
            jobId: string;
            vehicleId: string;
            warehouseId: string;
            duration: number;
            date: string;
            status: 'PENDING';
        };
    };
}

export interface DeliveryJobCreatedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'deliveryJobCreated';
        };
        data: {
            jobId: string;
            vehicleId: string;
            warehouseId: string;
            duration: number;
            date: string;
            status: 'PENDING';
        };
    };
}

export interface TransferJobCreatedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'transferJobCreated';
        };
        data: {
            jobId: string;
            sourceWarehouseId: string;
            destinationWarehouseId: string;
            date: string;
            status: 'PENDING';
        };
    };
}

export interface PickupJobStartedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'pickupJobStarted';
        };
        data: {
            jobId: string;
            vehicleId: string;
            warehouseId: string;
            time: string;
        };
    };
}

export interface PickupJobCompletedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'pickupJobCompleted';
        };
        data: {
            jobId: string;
            vehicleId: string;
            warehouseId: string;
            time: string;
        };
    };
}

export interface TransferJobStartedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'transferJobStarted';
        };
        data: {
            jobId: string;
            sourceWarehouseId: string;
            destinationWarehouseId: string;
            time: string;
        };
    };
}

export interface TransferJobCompletedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'transferJobCompleted';
        };
        data: {
            jobId: string;
            sourceWarehouseId: string;
            destinationWarehouseId: string;
            time: string;
        };
    };
}

export interface DeliveryJobStartedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'deliveryJobStarted';
        };
        data: {
            jobId: string;
            vehicleId: string;
            warehouseId: string;
            time: string;
        };
    };
}

export interface DeliveryJobCompletedEvent extends EventBase {
    detail: {
        metadata: {
            domain: 'parcelShipping';
            subdomain: 'parcelManagement';
            service: 'parcelManagementService';
            category: 'domainEvent';
            type: 'event';
            name: 'deliveryJobCompleted';
        };
        data: {
            jobId: string;
            vehicleId: string;
            warehouseId: string;
            time: string;
        };
    };
}
