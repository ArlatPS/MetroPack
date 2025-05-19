import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { putItem } from "./dynamoDbDatasource";
import { randomUUID } from "node:crypto";
import { getNextWorkingDays } from "./dates";

const WAREHOUSE_TABLE = "WarehouseTable";
const VEHICLE_TABLE = "VehicleTable";
const CITY_TABLE = "MonolithCityTable";

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
  },
];

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

async function main(): Promise<void> {
  for (const warehouse of warehouses) {
    // await putItem(warehouse.warehouse, WAREHOUSE_TABLE, ddbDocClient);
    // console.log("Warehouse created:", warehouse.warehouse);
    //
    // for (let i = 0; i < warehouse.pickupVehicles; i++) {
    //   await putItem(
    //     {
    //       capacity: 28800,
    //       vehicleId: randomUUID(),
    //       type: "PICKUP",
    //       warehouseId: warehouse.warehouse.warehouseId,
    //     },
    //     VEHICLE_TABLE,
    //     ddbDocClient
    //   );
    //   console.log("Pickup vehicle created:", i);
    //   await sleep();
    // }
    // for (let i = 0; i < warehouse.deliveryVehicles; i++) {
    //   await putItem(
    //     {
    //       capacity: 28800,
    //       vehicleId: randomUUID(),
    //       type: "DELIVERY",
    //       warehouseId: warehouse.warehouse.warehouseId,
    //     },
    //     VEHICLE_TABLE,
    //     ddbDocClient
    //   );
    //   console.log("Delivery vehicle created:", i);
    //   await sleep();
    // }
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
  }
}

main().then(() => {
  console.log("Data generation completed");
});
