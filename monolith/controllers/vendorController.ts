import { RequestHandler } from 'express';
import { VendorModel } from '../models';

export class VendorController {
    private vendorModel: VendorModel;

    constructor(vendorModel: VendorModel) {
        this.vendorModel = vendorModel;
    }

    public register: RequestHandler = async (req, res) => {
        this.vendorModel.resetState();
        try {
            const { name, email, location } = req.body;
            if (
                typeof name !== 'string' ||
                typeof email !== 'string' ||
                typeof location?.location !== 'string' ||
                typeof location?.latitude !== 'number'
            ) {
                res.status(400).json({ message: 'name and email are required' });
                return;
            }
            await this.vendorModel.register(name, email, location.longitude, location.latitude);
            res.status(200).json(this.vendorModel.getDetails());
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getVendor: RequestHandler = async (req, res) => {
        this.vendorModel.resetState();
        try {
            const { vendorId } = req.params;
            if (!vendorId) {
                res.status(400).json({ message: 'vendorId is required' });
                return;
            }
            await this.vendorModel.loadState(vendorId);
            res.status(200).json(this.vendorModel.getDetails());
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public updateVendor: RequestHandler = async (req, res) => {
        this.vendorModel.resetState();
        try {
            const { vendorId } = req.params;
            const { name, email, location } = req.body;
            if (!vendorId || (!name && !email && !location?.latitude && !location?.longitude)) {
                res.status(400).json({ message: 'vendorId and at least one of name or email are required' });
                return;
            }

            await this.vendorModel.loadState(vendorId);
            await this.vendorModel.changeDetails(name, email, location?.longitude, location?.latitude);
            res.status(200).json(this.vendorModel.getDetails());
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}
