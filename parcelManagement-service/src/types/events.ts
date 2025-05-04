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
