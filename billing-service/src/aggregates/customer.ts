import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getOffer } from '../datasources/dynamicPricingService';

interface Bill {
    customerId: string;
    month: string;
    totalPrice: number;
    totalPaid: number;
}

interface BillWithOrders extends Bill {
    orders: Order[];
}

export class Customer {
    private readonly ddbDocClient: DynamoDBDocumentClient;

    constructor(ddbDocClient: DynamoDBDocumentClient) {
        this.ddbDocClient = ddbDocClient;
    }

    public async getBills(customerId: string): Promise<Bill[]> {}

    public async getBillDetails(customerId: string, month: string): Promise<BillWithOrders> {}

    public async addOrder(customerId: string, orderId: string, date: string, offerId: string): Promise<void> {
        const offer = await getOffer(offerId);

        if (!offer) {
            throw new Error(`Offer with ID ${offerId} not found`);
        }

        if (await this.getOrder(orderId)) {
            throw new Error(`Order with ID ${orderId} already exists`);
        }
    }

    public async markOrderAsCompleted(orderId: string): Promise<void> {}

    public async payBill(customerId: string, month: string, amount: number): Promise<void> {}

    private async getOrder(orderId: string): Promise<Order | null> {
        return null;
    }
}
