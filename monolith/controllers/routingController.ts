import { RequestHandler } from 'express';
import { snapToRoute } from '../datasources/ors';

export class RoutingController {
    constructor() {}

    public snap: RequestHandler = async (req, res) => {
        try {
            const { longitude, latitude } = req.body;
            if (!longitude || !latitude) {
                res.status(400).json({ message: 'longitude and latitude are required' });
                return;
            }

            const location = await snapToRoute({ longitude, latitude });
            res.status(200).json(location);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}
