import { Router } from 'express';
import { ParcelManagementController } from '../controllers';

export function parcelManagementRoutes(controller: ParcelManagementController) {
    const router = Router();
    router.post('/parcel/register', controller.registerParcel);
    router.get('/parcel/:parcelId', controller.getParcel);
    router.get('parcel/location/:parcelId', controller.getParcelLocation);
    router.post('/prepareJobs', controller.prepareJobs);
    router.post('/updateJobs', controller.updateJobs);
    router.post('/resetVehicles', controller.resetVehicles);
    return router;
}
