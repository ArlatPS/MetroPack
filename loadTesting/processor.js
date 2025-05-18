const { randomUUID } = require('node:crypto');
const cities = [
    {
        cityCodename: 'pl_kraków',
        location: {
            latitude: 50.0708704,
            longitude: 19.9432021,
        },
        range: 25,
    },
    {
        cityCodename: 'pl_warszawa',
        location: {
            latitude: 52.214508,
            longitude: 20.953986,
        },
        range: 25,
    },
    {
        cityCodename: 'pl_wrocław',
        location: {
            latitude: 51.097363,
            longitude: 17.044714,
        },
        range: 20,
    },
    {
        cityCodename: 'pl_gdańsk',
        location: {
            latitude: 54.358753,
            longitude: 18.642961,
        },
        range: 15,
    },
];

function getRandomLocationInRange(cityCodename) {
    const city = cities.find((c) => c.cityCodename === cityCodename);

    const { latitude, longitude } = city.location;
    const rangeKm = city.range;

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

function randomCity() {
    return cities[Math.floor(Math.random() * cities.length)];
}

function randomEmail() {
    const user = Math.random().toString(36).substring(2, 10);
    return `${user}@example.com`;
}

function generateOfferRequest(req, userContext, events, done) {
    userContext.vars.pickupCityCodename = randomCity().cityCodename;
    userContext.vars.deliveryCityCodename = randomCity().cityCodename;
    done();
}

function extractOfferId(req, res, context, events, done) {
    try {
        const body = JSON.parse(res.body);
        if (Array.isArray(body) && body.length > 0 && body[0].offerId) {
            context.vars.offerId = body[0].offerId;
        } else {
            console.warn('No offerId found in response');
        }
    } catch (e) {
        console.error('Failed to parse offer response:', e);
    }
    done();
}

function generateAcceptOfferRequest(req, userContext, events, done) {
    userContext.vars.email = randomEmail();
    userContext.vars.vendorId = randomUUID();
    const pickupLocation = getRandomLocationInRange(userContext.vars.pickupCityCodename);
    const deliveryLocation = getRandomLocationInRange(userContext.vars.deliveryCityCodename);
    userContext.vars.pickupLocationLongitude = pickupLocation.longitude;
    userContext.vars.pickupLocationLatitude = pickupLocation.latitude;
    userContext.vars.deliveryLocationLongitude = deliveryLocation.longitude;
    userContext.vars.deliveryLocationLatitude = deliveryLocation.latitude;
    done();
}

function extractParcelId(req, res, context, events, done) {
    try {
        const body = JSON.parse(res.body);
        if (body.parcelId) {
            context.vars.parcelId = body.parcelId;
        } else {
            console.warn('No parcelId found in response');
        }
    } catch (e) {
        console.error('Failed to parse parcel response:', e);
    }
    done();
}

function extractBillMonth(req, res, context, events, done) {
    try {
        const body = JSON.parse(res.body);
        if (Array.isArray(body.bills) && body.bills.length > 0 && body.bills[0].month) {
            context.vars.month = body.bills[0].month;
        } else {
            console.warn('No month found in response');
        }
    } catch (e) {
        console.error('Failed to parse bills response:', e);
    }
    done();
}

module.exports = {
    generateOfferRequest,
    extractOfferId,
    generateAcceptOfferRequest,
    extractParcelId,
    extractBillMonth,
};
