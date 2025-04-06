import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

interface Order {
    orderId: string;
    date: string;
    price: number;
    completed: boolean;
}

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

    public async addOrder(customerId: string, orderId: string, date: string, offerId: string): Promise<void> {}

    public async markOrderAsCompleted(orderId: string): Promise<void> {}

    public async payBill(customerId: string, month: string, amount: number): Promise<void> {}
}
