import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { VendorModel } from './models';
import { VendorController, RoutingController } from './controllers';
import { vendorRoutes, routingRoutes } from './routes';

const app = express();
app.use(express.json());

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const vendorModel = new VendorModel(ddbDocClient);
const vendorController = new VendorController(vendorModel);

app.use('/', vendorRoutes(vendorController));

const routingController = new RoutingController();
app.use('/routing', routingRoutes(routingController));

const port = 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
