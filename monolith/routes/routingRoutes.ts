import { Router } from 'express';
import { RoutingController } from '../controllers';

export function routingRoutes(controller: RoutingController) {
    const router = Router();
    router.post('/snap', controller.snap);
    return router;
}
