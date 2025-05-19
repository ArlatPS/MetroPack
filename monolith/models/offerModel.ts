import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getCity, updateCityCapacity } from '../datasources/cityTable';
import { getOffer, putOffer } from '../datasources/offerTable';
import { parseDate } from '../helpers/dateHelpers';
import { OfferDetails, OfferWithDetails } from '../datasources/offerTable';

interface PossibleOffer {
    pickupDate: string;
    deliveryDate: string;
    price: number;
}
export class OfferModel {
    private readonly ddbDocClient: DynamoDBDocumentClient;

    constructor(ddbDocClient: DynamoDBDocumentClient) {
        this.ddbDocClient = ddbDocClient;
    }

    public async getOfferById(offerId: string): Promise<OfferWithDetails | null> {
        return getOffer(offerId, this.ddbDocClient);
    }

    public async createOffer(pickupCityCodename: string, deliveryCityCodename: string): Promise<OfferWithDetails[]> {
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

    public async handleOfferAccepted(offerId: string): Promise<void> {
        const offer = await this.getOfferById(offerId);
        if (!offer) throw new Error(`Offer with ID ${offerId} not found`);

        await updateCityCapacity(offer.pickupCityCodename, offer.pickupDate, 'Pickup', 'decrease', this.ddbDocClient);
        await updateCityCapacity(
            offer.deliveryCityCodename,
            offer.deliveryDate,
            'Delivery',
            'decrease',
            this.ddbDocClient,
        );
    }

    public async handleOfferAcceptCancelled(offerId: string): Promise<void> {
        const offer = await this.getOfferById(offerId);
        if (!offer) throw new Error(`Offer with ID ${offerId} not found`);

        await updateCityCapacity(offer.pickupCityCodename, offer.pickupDate, 'Pickup', 'increase', this.ddbDocClient);
        await updateCityCapacity(
            offer.deliveryCityCodename,
            offer.deliveryDate,
            'Delivery',
            'increase',
            this.ddbDocClient,
        );
    }

    private async saveOffer(offerDetails: OfferDetails): Promise<OfferWithDetails> {
        return await putOffer(offerDetails, this.ddbDocClient);
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

        const pickupDates = Object.keys(pickupCity.dates).filter(
            (date) => pickupCity.dates[date].currentPickupCapacity > 0,
        );

        const pickupPrices = pickupDates.reduce((acc, date) => {
            acc[date] = this.calculatePrice(
                pickupCity.dates[date].currentPickupCapacity,
                pickupCity.dates[date].maxPickupCapacity,
                pickupCity.dates[date].multiplier,
                pickupCity.dates[date].basePrice,
            );
            return acc;
        }, {} as Record<string, number>);

        const deliveryDates = Object.keys(deliveryCity.dates).filter(
            (date) => deliveryCity.dates[date].currentDeliveryCapacity > 0,
        );

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

        let priceFactor: number;
        if (ratio >= 0.5) {
            // Price increases as the ratio approaches 0.5
            priceFactor = 1 + (1 - ratio) * multiplier;
        } else if (ratio >= 0.1) {
            const previousStepFactor = 1 + 0.5 * multiplier;
            // Price increases sharply as the ratio approaches 0.1
            priceFactor = (1 - ratio - 0.5) * multiplier * 2 + previousStepFactor;
        } else {
            // Price sharply decreases beyond a ratio of 0.1
            const previousStepFactor = 1 + 0.5 * multiplier + 0.4 * multiplier * 2;

            priceFactor = previousStepFactor - ratio * multiplier * 5;
        }

        return Math.ceil(basePrice * priceFactor * 100) / 100;
    }
}
