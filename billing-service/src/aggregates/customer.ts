import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getOffer } from '../datasources/dynamicPricingService';
import { getAddOrderTransactItem, getOrder, Order } from '../datasources/orderTable';
import { Bill, createBill, getAddOrderToBillTransactItem, getBill } from '../datasources/billTable';

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

        const month = this.getMonth(date);

        const order: Order = {
            orderId,
            date,
            price: offer.price,
            completed: false,
        };

        if (!(await this.getBill(customerId, month))) {
            const bill: Bill = {
                customerId,
                month,
                totalPrice: 0,
                totalPaid: 0,
            };
            await createBill(bill, this.ddbDocClient);
        }

        const addOrderTransactItem = getAddOrderTransactItem(order);
        const updateBillTransactItem = getAddOrderToBillTransactItem(customerId, month, orderId, offer.price);

        await this.ddbDocClient.send(
            new TransactWriteCommand({ TransactItems: [addOrderTransactItem, updateBillTransactItem] }),
        );
    }

    public async markOrderAsCompleted(orderId: string): Promise<void> {}

    public async payBill(customerId: string, month: string, amount: number): Promise<void> {}

    private async getBill(customerId: string, month: string): Promise<Bill | null> {
        return await getBill(customerId, month, this.ddbDocClient);
    }

    private async getOrder(orderId: string): Promise<Order | null> {
        return getOrder(orderId, this.ddbDocClient);
    }

    private getMonth(date: string): string {
        return new Date(date).getFullYear() + '-' + (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    }
}
