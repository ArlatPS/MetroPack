import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getWarehouse } from '../datasources/warehouseTable';
import { NotFoundError } from '../errors/NotFoundError';
import {
    getPutVehicleLocationTransactItem,
    getVehicleLocation,
    updateVehicleLocation,
} from '../datasources/vehicleLocationTable';
import { getParcelLocation, getPutParcelLocationTransactItem } from '../datasources/parcelLocationTable';
import { Location } from '../valueObjects/location';

export class Tracking {
    private readonly ddbDocClient: DynamoDBDocumentClient;

    constructor(ddbDocClient: DynamoDBDocumentClient) {
        this.ddbDocClient = ddbDocClient;
    }

    public async prepareJobTracking(
        jobId: string,
        parcels: string[],
        vehicleId: string,
        warehouseId: string,
    ): Promise<void> {
        const warehouse = await getWarehouse(warehouseId, this.ddbDocClient);

        if (!warehouse) {
            throw new NotFoundError(`Warehouse with ID ${warehouseId} not found`);
        }

        const putVehicleLocationTransactItem = getPutVehicleLocationTransactItem(vehicleId, jobId, warehouse.location);

        const puParcelLocationTransactItems = parcels.map((parcelId) =>
            getPutParcelLocationTransactItem(parcelId, vehicleId, jobId),
        );

        await this.ddbDocClient.send(
            new TransactWriteCommand({
                TransactItems: [putVehicleLocationTransactItem, ...puParcelLocationTransactItems],
            }),
        );
    }

    public async updateVehicleLocation(vehicleId: string, jobId: string, location: Location): Promise<void> {
        await updateVehicleLocation(vehicleId, jobId, location, this.ddbDocClient);
    }

    public async getParcelLocation(
        parcelId: string,
    ): Promise<{ vehicleId: string; jobId: string; location: Location }> {
        const parcelLocation = await getParcelLocation(parcelId, this.ddbDocClient);

        if (!parcelLocation) {
            throw new NotFoundError(`Parcel with ID ${parcelId} not found`);
        }

        const vehicleLocation = await getVehicleLocation(
            parcelLocation.vehicleId,
            parcelLocation.jobId,
            this.ddbDocClient,
        );

        if (!vehicleLocation) {
            throw new NotFoundError(`Vehicle with ID ${parcelLocation.vehicleId} not found`);
        }

        return {
            vehicleId: parcelLocation.vehicleId,
            jobId: parcelLocation.jobId,
            location: vehicleLocation,
        };
    }
}
