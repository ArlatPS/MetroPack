import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { putItem } from "./dynamoDbDatasource";
import { randomUUID } from "node:crypto";
import { getNextWorkingDays } from "./dates";
import { createVendorRegisteredEvent } from "./vendorEvent";

const WAREHOUSE_TABLE = "MonolithWarehouseTable";
const VEHICLE_TABLE = "MonolithVehicleTable";
const CITY_TABLE = "MonolithCityTable";
const VENDOR_TABLE = "VendorTable";

const VEHICLE_CAPACITY = 80;

async function sleep(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const warehouses = [
  {
    warehouse: {
      warehouseId: randomUUID(),
      status: "AVAILABLE",
      cityCodename: "pl_kraków",
      location: {
        latitude: 50.0708704,
        longitude: 19.9432021,
      },
      range: 25,
    },
    pickupVehicles: 40,
    deliveryVehicles: 40,
    basePrice: 5,
    vendors: [
      "8fd7eee0-4d40-4535-a48a-22dc817f9260",
      "7ae6b4f8-8460-4301-949d-b54b67c623cc",
      "a064c8f7-b78d-4510-909d-ce362ccffde6",
      "3004f960-2b68-46d7-ba34-5fcabb1800bf",
      "fb73d219-1f9a-48ac-9a41-4bd8abebdf9e",
      "41936818-e2ff-4f02-af76-b49a3d11678a",
      "9f7a82fc-ff0c-4aaa-a7f0-63ed62e9095e",
      "b7b83663-e470-4e76-8274-69fefa706a93",
      "6264ddfc-164c-4576-befa-1b12e5a0852b",
      "969f66db-c665-492b-969a-2bf2e2bdb6c1",
    ],
  },
  {
    warehouse: {
      warehouseId: randomUUID(),
      status: "AVAILABLE",
      cityCodename: "pl_warszawa",
      location: {
        latitude: 52.214508,
        longitude: 20.953986,
      },
      range: 25,
    },
    pickupVehicles: 40,
    deliveryVehicles: 40,
    basePrice: 5,
    vendors: [
      "9bc73806-b738-4684-b457-4b9ff1643a91",
      "c21c4199-8a2d-4e2e-a33b-219dddb5a815",
      "0e8ec717-0a04-40e7-a8e8-cc8b5afb797c",
      "e3af5cca-c6dd-4c0b-ab04-b4b7f14e7f1d",
      "8c2ddb86-87e0-449a-a875-19a54a38bccb",
      "63cb589a-9065-4899-8aee-5af0df697cf2",
      "9996eeff-8d1f-436f-987b-b937eb2f4990",
      "9de6bd03-b280-456a-ad4c-f64709793344",
      "dcde4753-9bf8-4bbc-833e-54789f9e6352",
      "b4467a76-f068-4ca9-bc90-8861a5f886dc",
    ],
  },
  {
    warehouse: {
      warehouseId: randomUUID(),
      status: "AVAILABLE",
      cityCodename: "pl_wrocław",
      location: {
        latitude: 51.097363,
        longitude: 17.044714,
      },
      range: 20,
    },
    pickupVehicles: 20,
    deliveryVehicles: 20,
    basePrice: 7,
    vendors: [
      "b4467a76-f068-4ca9-bc90-8861a5f886dc",
      "fe6f5679-e47a-4bdd-a075-cc2f4d3f790f",
      "2e0a2103-4daf-4052-a311-f1e1fbdf0b5f",
      "917c9b4c-1856-4fbd-9663-8da6df517ac0",
      "f3926cc1-cc4c-4b4e-ab84-6ecbd33dc3e9",
      "0fb01c75-5a9c-4c17-8759-f5bc75fa97ca",
      "4f8e58fb-f952-48a5-a471-7f28465fde05",
      "7e743d1d-37c0-4e0a-ae36-294e6398c21f",
      "37dd8fb2-a323-4b7b-b246-53b8968fa449",
      "52788472-d600-412b-92db-ebce0bc0a661",
    ],
  },
  {
    warehouse: {
      warehouseId: randomUUID(),
      status: "AVAILABLE",
      cityCodename: "pl_gdańsk",
      location: {
        latitude: 54.358753,
        longitude: 18.642961,
      },
      range: 15,
    },
    pickupVehicles: 10,
    deliveryVehicles: 10,
    basePrice: 10,
    vendors: [
      "8ea4638a-eade-4732-8e52-52c7ccdacbb4",
      "f64b326a-8433-4c07-a989-14db7652d46e",
      "318bcffb-c7ba-4e56-a94b-11a04e5deac0",
      "a795663a-a46a-4804-961e-0133961a982f",
      "edf7b04e-b4af-4f07-a31c-928c273913e3",
      "41d9d3d2-22af-4f9d-afaf-d9e1593de106",
      "3197012b-ca91-4b31-ab8f-6f714eb431e5",
      "047bd0ad-35ff-4053-bc31-50e134d5dc29",
      "0024da28-228e-4025-8bd5-dcb65805c733",
      "4e49b2e7-9f13-4027-8b68-f52f6a422ed3",
    ],
  },
];

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

async function main(): Promise<void> {
  for (const warehouse of warehouses) {
    await putItem(warehouse.warehouse, WAREHOUSE_TABLE, ddbDocClient);
    console.log("Warehouse created:", warehouse.warehouse);

    for (let i = 0; i < warehouse.pickupVehicles; i++) {
      await putItem(
        {
          capacity: 28800,
          vehicleId: randomUUID(),
          type: "PICKUP",
          warehouseId: warehouse.warehouse.warehouseId,
        },
        VEHICLE_TABLE,
        ddbDocClient
      );
      console.log("Pickup vehicle created:", i);
      await sleep();
    }
    for (let i = 0; i < warehouse.deliveryVehicles; i++) {
      await putItem(
        {
          capacity: 28800,
          vehicleId: randomUUID(),
          type: "DELIVERY",
          warehouseId: warehouse.warehouse.warehouseId,
        },
        VEHICLE_TABLE,
        ddbDocClient
      );
      console.log("Delivery vehicle created:", i);
      await sleep();
    }
    for (const date of getNextWorkingDays(3)) {
      await putItem(
        {
          cityCodename: warehouse.warehouse.cityCodename,
          date,
          maxPickupCapacity: warehouse.pickupVehicles * VEHICLE_CAPACITY,
          currentPickupCapacity: warehouse.pickupVehicles * VEHICLE_CAPACITY,
          maxDeliveryCapacity: warehouse.deliveryVehicles * VEHICLE_CAPACITY,
          currentDeliveryCapacity:
            warehouse.deliveryVehicles * VEHICLE_CAPACITY,
          multiplier: Math.round((Math.random() * (2.0 - 0.5) + 0.5) * 10) / 10,
          basePrice: warehouse.basePrice,
        },
        CITY_TABLE,
        ddbDocClient
      );
      console.log("City capacity created:", date);
      await sleep();
    }

    for (const vendorId of warehouse.vendors) {
      await putItem(
        {
          vendorId,
          eventOrder: 0,
          event: JSON.stringify(
            createVendorRegisteredEvent(
              vendorId,
              warehouse.warehouse.location,
              warehouse.warehouse.range
            )
          ),
        },
        VENDOR_TABLE,
        ddbDocClient
      );
      console.log("Vendor created:", vendorId);
      await sleep();
    }
  }
}

main().then(() => {
  console.log("Data generation completed");
});
