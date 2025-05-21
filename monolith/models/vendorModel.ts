import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

import { getVendorEvents, putVendorEvent } from '../datasources/vendorTable';

interface VendorRegisteredEvent {
    detail: {
        metadata: {
            name: 'vendorRegistered';
        };
        data: {
            vendorId: string;
            name: string;
            email: string;
            location: {
                longitude: number;
                latitude: number;
            };
        };
    };
}

interface VendorDetailsChangedEvent {
    detail: {
        metadata: {
            name: 'vendorDetailsChanged';
        };
        data: {
            vendorId: string;
            name?: string;
            email?: string;
            location?: {
                longitude: number;
                latitude: number;
            };
        };
    };
}

export type VendorEvent = VendorRegisteredEvent | VendorDetailsChangedEvent;

export class VendorModel {
    private vendorId = '';
    private email = '';
    private name = '';
    private location = {
        longitude: 0,
        latitude: 0,
    };
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private events: VendorEvent[] = [];

    constructor(ddbDocClient: DynamoDBDocumentClient) {
        this.ddbDocClient = ddbDocClient;
    }

    public getDetails(): {
        vendorId: string;
        email: string;
        name: string;
        location: { longitude: number; latitude: number };
    } {
        return {
            vendorId: this.vendorId,
            email: this.email,
            name: this.name,
            location: this.location,
        };
    }

    public async register(name: string, email: string, longitude: number, latitude: number): Promise<void> {
        const vendorId = randomUUID();
        const event: VendorRegisteredEvent = {
            detail: {
                metadata: {
                    name: 'vendorRegistered',
                },
                data: {
                    vendorId,
                    name,
                    email,
                    location: {
                        longitude,
                        latitude,
                    },
                },
            },
        };

        await putVendorEvent(vendorId, 0, event, this.ddbDocClient);

        this.projectEvents([event]);
    }

    public async loadState(vendorId: string): Promise<void> {
        const events = await getVendorEvents(vendorId, this.ddbDocClient);

        this.events = events;

        this.projectEvents(events);
    }

    public async changeDetails(name: string, email: string, longitude?: number, latitude?: number): Promise<void> {
        if (!this.vendorId) {
            throw new Error('Vendor state is not loaded');
        }

        const location = longitude && latitude ? { longitude, latitude } : undefined;

        const event: VendorDetailsChangedEvent = {
            detail: {
                metadata: {
                    name: 'vendorDetailsChanged',
                },
                data: {
                    vendorId: this.vendorId,
                    name,
                    email,
                    location,
                },
            },
        };

        await putVendorEvent(this.vendorId, this.events.length, event, this.ddbDocClient);

        this.projectEvents([event]);
    }

    public resetState(): void {
        this.vendorId = '';
        this.email = '';
        this.name = '';
        this.events = [];
        this.location = {
            longitude: 0,
            latitude: 0,
        };
    }

    private projectEvents(events: VendorEvent[]): void {
        events.forEach((event) => {
            const handler = this.eventHandlers[event.detail.metadata.name];
            if (handler) {
                handler.call(this, event);
            }
        });
    }

    private eventHandlers: { [key: string]: (event: VendorEvent) => void } = {
        vendorRegistered: (event: VendorEvent) => this.applyVendorRegistered(event as VendorRegisteredEvent),
        vendorDetailsChanged: (event: VendorEvent) =>
            this.applyVendorDetailsChanged(event as VendorDetailsChangedEvent),
    };

    private applyVendorRegistered(event: VendorRegisteredEvent): void {
        this.vendorId = event.detail.data.vendorId;
        this.email = event.detail.data.email;
        this.name = event.detail.data.name;
        this.location = event.detail.data.location;
    }

    private applyVendorDetailsChanged(event: VendorDetailsChangedEvent): void {
        if (event.detail.data.email) {
            this.email = event.detail.data.email;
        }
        if (event.detail.data.name) {
            this.name = event.detail.data.name;
        }

        if (event.detail.data.location) {
            this.location = event.detail.data.location;
        }
    }
}
