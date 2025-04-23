import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: JSON.stringify(
                await createDeliveryJobs(
                    [
                        { id: 1, capacity: 20 },
                        { id: 2, capacity: 20 },
                        { id: 3, capacity: 20 },
                    ],
                    {
                        id: 1,
                        location: {
                            longitude: 19.928709,
                            latitude: 50.050259,
                        },
                        timeWindow: [0, 5000],
                    },
                    Array.from({ length: 50 }, (_, i) => {
                        return {
                            id: i,
                            location: {
                                longitude: Number((19.928709 + Math.random() * 0.1).toFixed(5)),
                                latitude: Number((50.050259 + Math.random() * 0.1).toFixed(5)),
                            },
                        };
                    }),
                ),
            ),
        };
    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({
                message: 'Failed to process the request',
                error,
            }),
        };
    }
};

interface Vehicle {
    id: string;
    capacity: number;
}

interface Warehouse {
    id: string;
    location: Location;
    timeWindow: [number, number];
}

interface Delivery {
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
    vehicle: string;
    duration: number;
    steps: {
        type: 'start' | 'job' | 'end';
        location: [number, number];
        arrival: number;
        id?: string;
    }[];
}

async function createDeliveryJobs(
    vehicles: Vehicle[],
    warehouse: Warehouse,
    deliveries: Delivery[],
): Promise<DeliveryJob[]> {
    const response = await axios.post<{ routes: RouteFromOrs[] }>(
        'https://api.openrouteservice.org/optimization',
        {
            jobs: deliveries.map((delivery: Delivery) => ({
                id: delivery.id,
                service: 60,
                delivery: [1],
                skills: [1],
                location: [delivery.location.longitude, delivery.location.latitude],
                time_windows: [warehouse.timeWindow],
            })),
            vehicles: vehicles.map((vehicle: Vehicle) => ({
                id: vehicle.id,
                profile: 'driving-car',
                skills: [1],
                start: [warehouse.location.longitude, warehouse.location.latitude],
                end: [warehouse.location.longitude, warehouse.location.latitude],
                capacity: [vehicle.capacity],
                time_window: warehouse.timeWindow,
            })),
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
            deliveryId: step.id,
        }));

        return {
            vehicleId: route.vehicle,
            duration: route.duration,
            steps,
        };
    });
}
