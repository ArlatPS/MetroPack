import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('initiated');
    try {
        const response = await axios.post(
            'https://api.openrouteservice.org/optimization',
            {
                jobs: [
                    {
                        id: 1,
                        service: 60,
                        delivery: [1],
                        location: [1.98465, 48.70329],
                        skills: [1],
                        time_windows: [[32400, 36000]],
                    },
                    { id: 2, service: 60, delivery: [1], location: [2.03655, 48.61128], skills: [1] },
                    { id: 3, service: 60, delivery: [1], location: [2.39719, 49.07611], skills: [2] },
                    { id: 4, service: 60, delivery: [1], location: [2.41808, 49.22619], skills: [2] },
                    { id: 5, service: 60, delivery: [1], location: [2.28325, 48.5958], skills: [14] },
                    { id: 6, service: 60, delivery: [1], location: [2.89857, 48.90736], skills: [14] },
                    { id: 7, service: 60, delivery: [1], location: [2.41608, 49.22619], skills: [2] },
                    { id: 8, service: 60, delivery: [1], location: [2.28525, 48.5958], skills: [14] },
                    { id: 9, service: 60, delivery: [1], location: [2.89457, 48.90736], skills: [14] },
                    { id: 10, service: 60, delivery: [1], location: [2.46808, 49.22619], skills: [2] },
                    { id: 11, service: 60, delivery: [1], location: [2.23325, 48.5958], skills: [14] },
                    { id: 12, service: 60, delivery: [1], location: [2.89357, 48.90736], skills: [14] },
                ],
                vehicles: [
                    {
                        id: 1,
                        profile: 'driving-car',
                        start: [2.35044, 48.71764],
                        end: [2.35044, 48.71764],
                        capacity: [4],
                        skills: [1, 14],
                        time_window: [28800, 43200],
                    },
                    {
                        id: 2,
                        profile: 'driving-car',
                        start: [2.35044, 48.71764],
                        end: [2.35044, 48.71764],
                        capacity: [4],
                        skills: [2, 14],
                        time_window: [28800, 43200],
                    },
                ],
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
            statusCode: 200,
            body: JSON.stringify(response.data),
        };
    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({
                message: 'Failed to process the request',
                error: error.message,
            }),
        };
    }
};
