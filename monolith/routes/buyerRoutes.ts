import { Router } from 'express';
import { BuyerController } from '../controllers';

export function buyerRoutes(controller: BuyerController) {
    const router = Router();
    router.post('/acceptOffer', controller.acceptOffer);
    router.get('/buyer/:email', controller.getBuyer);
    return router;
}
