import { Router } from 'express';
import { BillingController } from '../controllers';

export function billingRoutes(controller: BillingController) {
    const router = Router();
    router.post('/bills', controller.getBills);
    router.post('/bill', controller.getBillDetails);
    router.post('/payBill', controller.payBill);
    return router;
}
