import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getOffer } from '../datasources/dynamicPricingService';
import { getAddOrderTransactItem, getOrder, getOrders, Order, updateOrderStatus } from '../datasources/orderTable';
import {
    Bill,
    createBill,
    getAddOrderToBillTransactItem,
    getBill,
    getBills,
    updateAmountPaid,
} from '../datasources/billTable';
import { Month } from '../valueObjects';

type BillWithOrders = Bill<Order[]>;

export class Customer {
    private readonly ddbDocClient: DynamoDBDocumentClient;

    constructor(ddbDocClient: DynamoDBDocumentClient) {
        this.ddbDocClient = ddbDocClient;
    }

    public async getBills(customerId: string): Promise<Bill[]> {
        return await getBills(customerId, this.ddbDocClient);
    }

    public async getBillDetails(customerId: string, month: string): Promise<BillWithOrders> {
        const bill = await getBill(customerId, month, this.ddbDocClient);

        if (!bill) {
            throw new Error(`Bill for customer ${customerId} in month ${month} not found`);
        }

        const orders = await getOrders(bill.orders, this.ddbDocClient);

        return {
            ...bill,
            orders,
        };
    }

    public async addOrder(customerId: string, orderId: string, date: string, offerId: string): Promise<void> {
        const offer = await getOffer(offerId);

        if (!offer) {
            throw new Error(`Offer with ID ${offerId} not found`);
        }

        if (await this.getOrder(orderId)) {
            throw new Error(`Order with ID ${orderId} already exists`);
        }

        const month = new Month(date).toString();

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
                orders: [],
            };
            await createBill(bill, this.ddbDocClient);
        }

        const addOrderTransactItem = getAddOrderTransactItem(order);
        const updateBillTransactItem = getAddOrderToBillTransactItem(customerId, month, orderId, offer.price);

        await this.ddbDocClient.send(
            new TransactWriteCommand({ TransactItems: [addOrderTransactItem, updateBillTransactItem] }),
        );
    }

    public async markOrderAsCompleted(orderId: string): Promise<void> {
        await updateOrderStatus(orderId, true, this.ddbDocClient);
    }

    public async payBill(customerId: string, month: string, amount: number): Promise<void> {
        const bill = await getBill(customerId, month, this.ddbDocClient);

        if (!bill) {
            throw new Error(`Bill for customer ${customerId} in month ${month} not found`);
        }

        await updateAmountPaid(customerId, month, amount, this.ddbDocClient);
    }

    private async getBill(customerId: string, month: string): Promise<Bill | null> {
        return await getBill(customerId, month, this.ddbDocClient);
    }

    private async getOrder(orderId: string): Promise<Order | null> {
        return getOrder(orderId, this.ddbDocClient);
    }
}
