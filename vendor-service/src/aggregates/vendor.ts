interface VendorRegisteredEvent {
    metadata: {
        name: 'vendorRegistered';
    };
    data: {
        vendorId: string;
        name: string;
        email: string;
    };
}

interface VendorDetailsChangedEvent {
    metadata: {
        name: 'vendorDetailsChanged';
    };
    data: {
        vendorId: string;
        name?: string;
        email?: string;
    };
}

export type VendorEvent = VendorRegisteredEvent | VendorDetailsChangedEvent;

export class Vendor {
    private id = '';
    private email = '';
    private name = '';

    constructor(events: VendorEvent[]) {
        this.loadState(events);
    }

    public getDetails(): { id: string; email: string; name: string } {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
        };
    }

    private loadState(events: VendorEvent[]): void {
        events.forEach((event) => {
            const handler = this.eventHandlers[event.metadata.name];
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
        console.info('VendorRegistered', JSON.stringify(event.data));
        this.id = event.data.vendorId;
        this.email = event.data.email;
        this.name = event.data.name;
    }

    private applyVendorDetailsChanged(event: VendorDetailsChangedEvent): void {
        if (event.data.email) {
            this.email = event.data.email;
        }
        if (event.data.name) {
            this.name = event.data.name;
        }
    }
}
