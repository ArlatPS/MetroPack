import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

import {
    getAddOrderTransactItem,
    getOrder,
    getOrders,
    getRemoveOrderTransactItem,
    Order,
} from '../datasources/orderTable';
import {
    Bill,
    createBill,
    getAddOrderToBillTransactItem,
    getBill,
    getBills,
    getRemoveOrderFromBillTransactItem,
    updateAmountPaid,
} from '../datasources/billTable';
import { Month } from '../helpers/dateHelpers';
import { OfferWithDetails } from '../datasources/offerTable';

type BillWithOrders = Bill<Order[]>;

export class CustomerModel {
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

    public async addOrder(customerId: string, orderId: string, date: string, offer: OfferWithDetails): Promise<void> {
        if (await this.getOrder(orderId)) {
            throw new Error(`Order with ID ${orderId} already exists`);
        }

        const month = new Month(date).toString();

        const order: Order = {
            orderId,
            date,
            price: offer.price,
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

    public async removeOrder(customerId: string, orderId: string): Promise<void> {
        const order = await getOrder(orderId, this.ddbDocClient);

        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        const month = new Month(order.date).toString();

        const bill = await getBill(customerId, month, this.ddbDocClient);

        if (!bill) {
            throw new Error(`Bill for customer ${customerId} in month ${month} not found`);
        }

        const removeOrderTransactItem = getRemoveOrderTransactItem(orderId);
        const updateBillTransactItem = getRemoveOrderFromBillTransactItem(
            customerId,
            month,
            order.price,
            bill.orders.filter((id) => id !== orderId),
        );

        await this.ddbDocClient.send(
            new TransactWriteCommand({ TransactItems: [removeOrderTransactItem, updateBillTransactItem] }),
        );
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
