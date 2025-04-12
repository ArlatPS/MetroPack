import axios from 'axios';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Context } from 'node:vm';

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const vroomUrl = process.env.VROOM_URL; // Ensure this is set in the Lambda environment variables

    try {
        // Parse the input from the event
        const requestData = JSON.parse(event.body || '{}');

        // Make a POST request to the vroom service
        const response = await axios.post(`${vroomUrl}`, requestData);

        // Return the response from vroom
        return {
            statusCode: 200,
            body: JSON.stringify(response.data),
        };
    } catch (error) {
        console.error('Error calling vroom service:', error);

        // Return an error response
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error calling vroom service',
                error: error,
            }),
        };
    }
};
