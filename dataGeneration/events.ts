import { randomUUID } from "crypto";

export function createVendorRegisteredEvent(
  vendorId: string,
  warehouseLocation: {
    longitude: number;
    latitude: number;
  },
  rangeKm: number
) {
  return {
    version: "1",
    id: randomUUID(),
    detailType: "vendorService.vendorRegistered",
    source: "data generation",
    time: new Date().toISOString(),
    region: "eu-central-1",
    resources: ["data generation"],
    detail: {
      metadata: {
        domain: "customerService",
        subdomain: "vendor",
        service: "vendorService",
        category: "domainEvent",
        type: "data",
        name: "vendorRegistered",
      },
      data: {
        vendorId,
        name: "data generation",
        email: "data generation",
        location: getRandomLocationInRange(warehouseLocation, rangeKm),
      },
    },
  };
}

export function createParcelRegisteredEvent(
  parcelId: string,
  pickupDate: string,
  pickupLocation: {
    longitude: number;
    latitude: number;
  },
  transitWarehouses: { cityCodename: string; warehouseId: string }[],
  deliveryDate: string,
  deliveryLocation: {
    longitude: number;
    latitude: number;
  }
) {
  return {
    version: "1",
    id: randomUUID(),
    detailType: "parcelService.parcelRegistered",
    source: "data generation",
    time: new Date().toISOString(),
    region: "eu-central-1",
    resources: ["data generation"],
    detail: {
      metadata: {
        domain: "customerService",
        subdomain: "parcel",
        service: "parcelService",
        category: "domainEvent",
        type: "data",
        name: "parcelRegistered",
      },
      data: {
        parcelId,
        time: new Date().toISOString(),
        pickupDate,
        pickupLocation,
        transitWarehouses,
        deliveryDate,
        deliveryLocation,
      },
    },
  };
}

export function getRandomLocationInRange(
  location: { latitude: number; longitude: number },
  rangeKm: number
): { latitude: number; longitude: number } {
  const { latitude, longitude } = location;

  // Generate random distance and angle
  const distanceKm = Math.random() * rangeKm;
  const angle = Math.random() * 2 * Math.PI;

  // Approximate conversions
  const deltaLat = distanceKm / 111; // 1 deg ≈ 111km
  const deltaLon = distanceKm / (111 * Math.cos((latitude * Math.PI) / 180));

  const offsetLat = deltaLat * Math.sin(angle);
  const offsetLon = deltaLon * Math.cos(angle);

  return {
    latitude: latitude + offsetLat,
    longitude: longitude + offsetLon,
  };
}
