import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';
import { createVendorDetailsChangedEvent, createVendorRegisteredEvent } from '../helpers/eventHelpers';
import { Context } from 'aws-lambda';

interface VendorEventMetadata {
    domain: 'customerService';
    subdomain: 'vendor';
    service: 'vendorService';
    category: 'domainEvent';
    type: 'data';
}

interface VendorEventBase {
    version: '1';
    id: string;
    detailType: string;
    source: string;
    time: string;
    region: string;
    resources: string[];
}

export interface VendorRegisteredEvent extends VendorEventBase {
    detail: {
        metadata: {
            name: 'vendorRegistered';
        } & VendorEventMetadata;
        data: {
            vendorId: string;
            name: string;
            email: string;
        };
    };
}

export interface VendorDetailsChangedEvent extends VendorEventBase {
    detail: {
        metadata: {
            name: 'vendorDetailsChanged';
        } & VendorEventMetadata;
        data: {
            vendorId: string;
            name?: string;
            email?: string;
        };
    };
}

export type VendorEvent = VendorRegisteredEvent | VendorDetailsChangedEvent;

export class Vendor {
    private id = '';
    private email = '';
    private name = '';
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;
    private events: VendorEvent[] = [];

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public getDetails(): { id: string; email: string; name: string } {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
        };
    }

    public async register(name: string, email: string): Promise<void> {
        const vendorId = randomUUID();
        const event = createVendorRegisteredEvent(vendorId, name, email, this.context);

        const vendorTable = process.env.VENDOR_TABLE;

        if (!vendorTable) {
            throw new Error('Vendor table is not set');
        }

        const params: PutItemCommandInput = {
            TableName: vendorTable,
            Item: {
                vendorId: { S: vendorId },
                eventOrder: { N: '0' },
                event: { S: JSON.stringify(event) },
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

        const data = await this.ddbDocClient.send(new QueryCommand(params));
        const items = data.Items;

        if (!items || items.length === 0) {
            throw new Error('Vendor not found.');
        }

        const events: VendorEvent[] = items.map((item) => JSON.parse(item.event));

        this.events = events;

        this.projectEvents(events);
    }

    public async changeDetails(name: string, email: string): Promise<void> {
        const event = createVendorDetailsChangedEvent(this.id, this.context, name, email);

        const vendorTable = process.env.VENDOR_TABLE;

        if (!vendorTable) {
            throw new Error('Vendor table is not set');
        }

        const eventOrder = this.events.length;

        const params: PutItemCommandInput = {
            TableName: vendorTable,
            Item: {
                vendorId: { S: this.id },
                eventOrder: { N: eventOrder.toString() },
                event: { S: JSON.stringify(event) },
            },
        };

        await this.ddbDocClient.send(new PutItemCommand(params));

        this.projectEvents([event]);
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
        this.id = event.detail.data.vendorId;
        this.email = event.detail.data.email;
        this.name = event.detail.data.name;
    }

    private applyVendorDetailsChanged(event: VendorDetailsChangedEvent): void {
        if (event.detail.data.email) {
            this.email = event.detail.data.email;
        }
        if (event.detail.data.name) {
            this.name = event.detail.data.name;
        }
    }
}
