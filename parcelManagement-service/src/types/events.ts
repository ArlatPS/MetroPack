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
        };
        data: {
            cityCodename: string;
            date: string;
        };
    };
}
