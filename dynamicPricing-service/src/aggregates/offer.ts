import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { getCity } from '../datasources/cityTable';
import { parseDate } from '../helpers/dateHelpers';

interface PossibleOffer {
    pickupDate: string;
    deliveryDate: string;
    price: number;
}

interface OfferDetails {
    pickupCityCodename: string;
    pickupDate: string;
    deliveryCityCodename: string;
    deliveryDate: string;
    price: number;
}

interface OfferWithDetails extends OfferDetails {
    offerId: string;
}

export class Offer {
    private readonly ddbDocClient: DynamoDBDocumentClient;
    private readonly context: Context;

    constructor(ddbDocClient: DynamoDBDocumentClient, context: Context) {
        this.ddbDocClient = ddbDocClient;
        this.context = context;
    }

    public async createOffer(
        pickupCityCodename: string,
        pickupLatitude: number,
        pickupLongitude: number,
        deliveryCityCodename: string,
        deliveryLatitude: number,
        deliveryLongitude: number,
    ): Promise<OfferWithDetails[]> {
        const bestPossibleOffers = this.getBestPrices(
            await this.getPossibleOffers(pickupCityCodename, deliveryCityCodename),
        );

        return Promise.all(
            bestPossibleOffers.map(async (offer) => {
                const offerDetails = this.createOfferDetails(offer, pickupCityCodename, deliveryCityCodename);
                return await this.saveOffer(offerDetails);
            }),
        );
    }

    private async saveOffer(offerDetails: OfferDetails): Promise<OfferWithDetails> {
        const offerId = Math.random().toString(36).substring(7);
        return {
            offerId,
            ...offerDetails,
        };
    }

    private createOfferDetails(
        possibleOffer: PossibleOffer,
        pickupCityCodename: string,
        deliveryCityCodename: string,
    ): OfferDetails {
        return {
            pickupCityCodename,
            pickupDate: possibleOffer.pickupDate,
            deliveryCityCodename,
            deliveryDate: possibleOffer.deliveryDate,
            price: possibleOffer.price,
        };
    }

    private async getPossibleOffers(
        pickupCityCodename: string,
        deliveryCityCodename: string,
    ): Promise<PossibleOffer[]> {
        const pickupCity = await getCity(pickupCityCodename, this.ddbDocClient);
        const deliveryCity = await getCity(deliveryCityCodename, this.ddbDocClient);

        const pickupDates = Object.keys(pickupCity.dates);

        const pickupPrices = pickupDates.reduce((acc, date) => {
            acc[date] = this.calculatePrice(
                pickupCity.dates[date].currentPickupCapacity,
                pickupCity.dates[date].maxPickupCapacity,
                pickupCity.dates[date].multiplier,
                pickupCity.dates[date].basePrice,
            );
            return acc;
        }, {} as Record<string, number>);

        const deliveryDates = Object.keys(deliveryCity.dates);

        const deliveryPrices = deliveryDates.reduce((acc, date) => {
            acc[date] = this.calculatePrice(
                deliveryCity.dates[date].currentDeliveryCapacity,
                deliveryCity.dates[date].maxDeliveryCapacity,
                deliveryCity.dates[date].multiplier,
                deliveryCity.dates[date].basePrice,
            );
            return acc;
        }, {} as Record<string, number>);

        return pickupDates.reduce((acc, pickupDate) => {
            deliveryDates.forEach((deliveryDate) => {
                if (parseDate(deliveryDate) > parseDate(pickupDate)) {
                    acc.push({
                        pickupDate,
                        deliveryDate,
                        price: pickupPrices[pickupDate] + deliveryPrices[deliveryDate],
                    });
                }
            });
            return acc;
        }, [] as PossibleOffer[]);
    }

    private getBestPrices(possibleOffers: PossibleOffer[]): PossibleOffer[] {
        if (possibleOffers.length === 0) return [];

        const sortedByDeliveryDateAndPrice = [...possibleOffers].sort((a, b) => {
            const deliveryComparison = parseDate(a.deliveryDate).getTime() - parseDate(b.deliveryDate).getTime();
            if (deliveryComparison !== 0) return deliveryComparison;
            return a.price - b.price;
        });

        const fastestOffer = sortedByDeliveryDateAndPrice[0];

        const sortedByPrice = [...possibleOffers].sort((a, b) => a.price - b.price);

        return [fastestOffer, ...sortedByPrice.filter((offer) => offer !== fastestOffer).slice(0, 2)];
    }

    private calculatePrice(
        currentCapacity: number,
        maxCapacity: number,
        multiplier: number,
        basePrice: number,
    ): number {
        const ratio = currentCapacity / maxCapacity;
        const priceFactor = 1 + (1 - ratio) * multiplier;

        return Math.ceil(basePrice * priceFactor * 100) / 100; // TOOD use value type
    }
}
