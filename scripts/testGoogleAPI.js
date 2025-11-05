// scripts/testGoogleAPI.js
require('dotenv').config();
const axios = require('axios');

const testGoogleAPI = async () => {
    const GOOGLE_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;

    console.log('🔑 API Key:', GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 15)}...` : 'NOT FOUND');

    if (!GOOGLE_API_KEY) {
        console.error('❌ GOOGLE_ROUTES_API_KEY not found in .env file!');
        process.exit(1);
    }

    const requestBody = {
        origin: {
            address: "Berlin, Germany"
        },
        destination: {
            address: "Paris, France"
        },
        travelMode: 'DRIVE',
        extraComputations: ['TOLLS'],
        routeModifiers: {
            vehicleInfo: {
                emissionType: 'GASOLINE'
            }
        }
    };

    console.log('\n📤 Testing Google Routes API...');
    console.log('Request:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await axios.post(
            'https://routes.googleapis.com/directions/v2:computeRoutes',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo'
                }
            }
        );

        console.log('\n✅ SUCCESS!');
        console.log('Status:', response.status);
        console.log('Routes found:', response.data.routes?.length);

        if (response.data.routes?.[0]) {
            const route = response.data.routes[0];
            console.log('\nRoute Info:');
            console.log('- Distance:', route.distanceMeters / 1000, 'km');
            console.log('- Duration:', route.duration);
            console.log('- Toll Info:', JSON.stringify(route.travelAdvisory?.tollInfo, null, 2));
        }

    } catch (error) {
        console.error('\n❌ ERROR!');
        console.error('Status:', error.response?.status);
        console.error('Error:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.status === 403) {
            console.error('\n🔒 API Key issue:');
            console.error('- Check if Routes API is enabled');
            console.error('- Check if API key is valid');
            console.error('- Check API key restrictions');
        }

        if (error.response?.status === 404) {
            console.error('\n🔍 Check the API endpoint URL');
            console.error('Should be: https://routes.googleapis.com/directions/v2:computeRoutes');
        }
    }

    process.exit(0);
};

testGoogleAPI();