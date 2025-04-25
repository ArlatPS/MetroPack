export class Location {
    public readonly longitude: number;
    public readonly latitude: number;

    constructor(longitude: number, latitude: number) {
        this.longitude = longitude;
        this.latitude = latitude;
    }

    public getCoordinates(): [number, number] {
        return [this.longitude, this.latitude];
    }
}
