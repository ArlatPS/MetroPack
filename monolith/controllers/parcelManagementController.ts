import { RequestHandler } from 'express';

import { ParcelModel, ParcelManagementModel, TrackingModel, EventGeneratorModel } from '../models';
import { NotFoundError } from '../errors/NotFoundError';

export class ParcelManagementController {
    private parcelModel: ParcelModel;
    private parcelManagementModel: ParcelManagementModel;
    private trackingModel: TrackingModel;
    private eventGeneratorModel: EventGeneratorModel;

    constructor(
        parcelModel: ParcelModel,
        parcelManagementModel: ParcelManagementModel,
        trackingModel: TrackingModel,
        eventGeneratorModel: EventGeneratorModel,
    ) {
        this.parcelModel = parcelModel;
        this.parcelManagementModel = parcelManagementModel;
        this.trackingModel = trackingModel;
        this.eventGeneratorModel = eventGeneratorModel;
    }

    public registerParcel: RequestHandler = async (req, res) => {
        this.parcelModel.resetState();
        try {
            const { pickupLocation, deliveryLocation, pickupDate, deliveryDate, parcelId } = req.body;

            if (!pickupLocation || !deliveryLocation || !pickupDate || !deliveryDate) {
                res.status(400).json({ message: 'missing required fields' });
                return;
            }

            await this.parcelModel.register(pickupDate, pickupLocation, deliveryDate, deliveryLocation, parcelId);
            const parcel = this.parcelModel.getDetails();
            await this.parcelManagementModel.createPickupOrder(
                parcel.parcelId,
                parcel.transitWarehouses[0].warehouseId,
                parcel.pickupDate,
                parcel.pickupLocation,
                parcel.transitWarehouses[0],
            );

            res.status(200).json(parcel);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getParcel: RequestHandler = async (req, res) => {
        this.parcelModel.resetState();
        try {
            const { parcelId } = req.params;

            if (!parcelId) {
                res.status(400).json({ message: 'Missing parcelId' });
                return;
            }

            await this.parcelModel.loadState(parcelId);

            res.status(200).json(this.parcelModel.getDetails());
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public getParcelLocation: RequestHandler = async (req, res) => {
        try {
            const { parcelId } = req.params;
            if (!parcelId) {
                res.status(400).json({ message: 'Missing parcelId' });
                return;
            }

            const location = await this.trackingModel.getParcelLocation(parcelId);
            res.status(200).json(location);
        } catch (err) {
            if (err instanceof NotFoundError) {
                res.status(404).json({ message: 'Parcel not found' });
                return;
            }
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public prepareJobs: RequestHandler = async (req, res) => {
        try {
            await this.parcelManagementModel.prepareJobs();
            res.status(200).json({ message: 'Jobs prepared successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    public updateJobs: RequestHandler = async (req, res) => {
        try {
            await this.eventGeneratorModel.updateJobs();
            res.status(200).json({ message: 'Jobs updated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}
