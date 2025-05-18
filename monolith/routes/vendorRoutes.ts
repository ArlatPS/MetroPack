import { Router } from 'express';
import { VendorController } from '../controllers';

export function vendorRoutes(controller: VendorController) {
    const router = Router();
    router.post('/vendor', controller.register);
    router.get('/vendor/:vendorId', controller.getVendor);
    router.post('/vendor/update', controller.updateVendor);
    return router;
}
