import { DynamoDBDocumentClient, PutCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

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
    private readonly ddbDocClient: DynamoDBDocumentClient | undefined;

    constructor(ddbDocClient: DynamoDBDocumentClient) {
        this.ddbDocClient = ddbDocClient;
    }

    public getDetails(): { id: string; email: string; name: string } {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
        };
    }

    public async register(name: string, email: string): Promise<void> {
        const event: VendorRegisteredEvent = {
            metadata: {
                name: 'vendorRegistered',
            },
            data: {
                vendorId: randomUUID(),
                name,
                email,
            },
        };

        const vendorTable = process.env.VENDOR_TABLE;

        if (!vendorTable) {
            throw new Error('Vendor table is not set');
        }

        if (!this.ddbDocClient) {
            throw new Error('DynamoDBDocumentClient not set');
        }

        const params: PutItemCommandInput = {
            TableName: vendorTable,
            Item: {
                vendorId: { S: event.data.vendorId },
                eventOrder: { N: '0' },
                event: { S: JSON.stringify({ detail: event }) },
            },
        };

        await this.ddbDocClient.send(new PutItemCommand(params));

        this.projectEvents([event]);
    }

    public async loadState(vendorId: string): Promise<void> {
        const vendorTable = process.env.VENDOR_TABLE;

        if (!vendorTable) {
            throw new Error('Vendor table is not set');
        }

        const params = {
            TableName: vendorTable,
            KeyConditionExpression: 'vendorId = :vendorId',
            ExpressionAttributeValues: {
                ':vendorId': vendorId,
            },
        };

        if (!this.ddbDocClient) {
            throw new Error('DynamoDBDocumentClient not set');
        }

        const data = await this.ddbDocClient.send(new QueryCommand(params));
        const items = data.Items;

        if (!items || items.length === 0) {
            throw new Error('Vendor not found.');
        }

        const events: VendorEvent[] = items.map((item: any) => JSON.parse(item.event).detail);

        this.projectEvents(events);
    }

    private projectEvents(events: VendorEvent[]): void {
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
