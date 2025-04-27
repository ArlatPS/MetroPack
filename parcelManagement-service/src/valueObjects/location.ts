export class Location {
    public readonly longitude: number;
    public readonly latitude: number;
    public readonly id?: string;

    constructor(longitude: number, latitude: number, id?: string) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.id = id;
    }

    public getCoordinates(): [number, number] {
        return [this.longitude, this.latitude];
    }

    public getClosestLocation(locations: Location[], maxDistance: number): Location | null {
        if (locations.length === 0) {
            return null;
        }

        let closestLocation: Location | null = null;
        let closestDistance = maxDistance;
        locations.forEach((location) => {
            const distance = this.getDistance(location);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestLocation = location;
            }
        });

        return closestLocation;
    }

    public getDistance(location: Location): number {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = this.degreesToRadians(location.latitude - this.latitude);
        const dLon = this.degreesToRadians(location.longitude - this.longitude);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.degreesToRadians(this.latitude)) *
                Math.cos(this.degreesToRadians(location.latitude)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    private degreesToRadians(degrees: number): number {
        return (degrees * Math.PI) / 180;
    }

    public equals(location: Location): boolean {
        return this.longitude === location.longitude && this.latitude === location.latitude && this.id === location.id;
    }
}
