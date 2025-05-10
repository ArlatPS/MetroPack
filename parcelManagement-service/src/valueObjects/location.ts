export class Location {
    public readonly longitude: number;
    public readonly latitude: number;
    public readonly id?: string;
    public readonly range?: number;

    constructor(longitude: number, latitude: number, id?: string, range?: number) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.id = id;
        this.range = range;
    }

    public getCoordinates(): [number, number] {
        return [this.longitude, this.latitude];
    }

    public getLocation(): Location {
        return new Location(this.longitude, this.latitude);
    }

    public getClosestLocation(locations: Location[]): Location | null {
        if (locations.length === 0) {
            return null;
        }

        let closestLocation: Location | null = null;
        let closestDistance = Infinity;
        locations.forEach((location) => {
            const distance = this.getDistance(location);

            if (location.range && distance > location.range) {
                return;
            }

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

    public getLocationBetween(location: Location, progress: number): Location {
        const lon = parseFloat((this.longitude + (location.longitude - this.longitude) * progress).toFixed(7));
        const lat = parseFloat((this.latitude + (location.latitude - this.latitude) * progress).toFixed(7));
        return new Location(lon, lat);
    }
}
