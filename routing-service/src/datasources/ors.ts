import axios from 'axios';
import { intToUuid, uuidToInt } from '../helpers/id';

export interface Vehicle {
    id: string;
    capacity: number;
}

export interface Warehouse {
    id: string;
    location: Location;
    timeWindow: [number, number];
}

export interface Delivery {
    id: string;
    location: Location;
}

interface Location {
    longitude: number;
    latitude: number;
}

interface Step {
    type: 'start' | 'job' | 'end';
    location: Location;
    arrivalTime: number;
    deliveryId?: string;
}

interface DeliveryJob {
    steps: Step[];
    vehicleId: string;
    duration: number;
}

interface RouteFromOrs {
    vehicle: number;
    duration: number;
    steps: {
        type: 'start' | 'job' | 'end';
        location: [number, number];
        arrival: number;
        id?: number;
    }[];
}

export async function createDeliveryJobs(
    vehicles: Vehicle[],
    warehouse: Warehouse,
    deliveries: Delivery[],
): Promise<DeliveryJob[]> {
    const uuidMap = new Map<number, string>();

    const response = await axios.post<{ routes: RouteFromOrs[] }>(
        'https://api.openrouteservice.org/optimization',
        {
            jobs: deliveries.map((delivery: Delivery) => {
                const id = uuidToInt(delivery.id);
                uuidMap.set(id, delivery.id);
                return {
                    id,
                    service: 0,
                    delivery: [1],
                    skills: [1],
                    location: [delivery.location.longitude, delivery.location.latitude],
                    time_windows: [warehouse.timeWindow],
                };
            }),
            vehicles: vehicles.map((vehicle: Vehicle) => {
                const id = uuidToInt(vehicle.id);
                uuidMap.set(id, vehicle.id);
                return {
                    id,
                    profile: 'driving-car',
                    skills: [1],
                    start: [warehouse.location.longitude, warehouse.location.latitude],
                    end: [warehouse.location.longitude, warehouse.location.latitude],
                    capacity: [100000],
                    time_window: [0, vehicle.capacity],
                };
            }),
        },
        {
            headers: {
                Accept: 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                Authorization: process.env.ORS_API_KEY,
                'Content-Type': 'application/json; charset=utf-8',
            },
            timeout: 10000,
        },
    );

    const optimizedRoutes = response.data.routes;

    return optimizedRoutes.map((route: RouteFromOrs) => {
        const steps = route.steps.map((step) => ({
            type: step.type,
            location: {
                longitude: step.location[0],
                latitude: step.location[1],
            },
            arrivalTime: step.arrival,
            deliveryId: step.id ? intToUuid(step.id, uuidMap) || '' : undefined,
        }));

        return {
            vehicleId: intToUuid(route.vehicle, uuidMap) || '',
            duration: route.duration,
            steps,
        };
    });
}

export async function snapToRoute(location: Location): Promise<Location> {
    const response = await axios.post<{ locations: { location: [number, number] }[] }>(
        'https://api.openrouteservice.org/v2/snap/driving-car',
        {
            locations: [[location.longitude, location.latitude]],
            radius: 500,
        },
        {
            headers: {
                Accept: 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                Authorization: process.env.ORS_API_KEY,
                'Content-Type': 'application/json; charset=utf-8',
            },
            timeout: 10000,
        },
    );

    return {
        longitude: response.data.locations[0].location[0],
        latitude: response.data.locations[0].location[1],
    };
}
