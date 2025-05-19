import { Router } from 'express';
import { DynamicPricingController } from '../controllers';

export function dynamicPricingRoutes(controller: DynamicPricingController) {
    const router = Router();
    router.post('/createOffer', controller.createOffer);
    router.post('/generateCityCapacity', controller.generateCityCapacity);
    return router;
}
