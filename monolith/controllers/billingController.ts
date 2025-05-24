import { RequestHandler } from 'express';

import { CustomerModel } from '../models';
import { Month } from '../helpers/dateHelpers';

export class BillingController {
    private customerModel: CustomerModel;

    constructor(customerModel: CustomerModel) {
        this.customerModel = customerModel;
    }

    public getBills: RequestHandler = async (req, res) => {
        try {
            const { vendorId } = req.body;
            if (!vendorId) {
                res.status(400).json({ message: 'Missing vendorId' });
                return;
            }

            const bills = await this.customerModel.getBills(vendorId);
            res.status(200).json({ bills });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getBillDetails: RequestHandler = async (req, res) => {
        try {
            const { vendorId, month } = req.body;
            if (!vendorId || !month) {
                res.status(400).json({ message: 'Missing vendorId or month' });
                return;
            }

            if (!Month.validateMonth(month)) {
                res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });
                return;
            }

            const bill = await this.customerModel.getBillDetails(vendorId, month);
            res.status(200).json({ bill });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public payBill: RequestHandler = async (req, res) => {
        try {
            const { vendorId, month, amount } = req.body;
            if (!vendorId || !month || !amount) {
                res.status(400).json({ message: 'Missing vendorId, month or amount' });
                return;
            }

            if (!Month.validateMonth(month)) {
                res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });
                return;
            }

            await this.customerModel.payBill(vendorId, month, amount);
            res.status(200).json({ message: 'Bill paid successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}
