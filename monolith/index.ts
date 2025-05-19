import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { VendorModel, OfferModel, CustomerModel } from './models';
import { VendorController, RoutingController, DynamicPricingController, BillingController } from './controllers';
import { vendorRoutes, routingRoutes, dynamicPricingRoutes, billingRoutes } from './routes';

const app = express();
app.use(express.json());

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const vendorModel = new VendorModel(ddbDocClient);
const vendorController = new VendorController(vendorModel);
app.use('/', vendorRoutes(vendorController));

const routingController = new RoutingController();
app.use('/', routingRoutes(routingController));

const offerModel = new OfferModel(ddbDocClient);
const dynamicPricingController = new DynamicPricingController(offerModel, ddbDocClient);
app.use('/', dynamicPricingRoutes(dynamicPricingController));

const customerModel = new CustomerModel(ddbDocClient);
const billingController = new BillingController(customerModel);
app.use('/', billingRoutes(billingController));

const port = 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
