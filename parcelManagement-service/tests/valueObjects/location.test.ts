import { Location } from '../../src/valueObjects/location';

describe('getLocationBetween', () => {
    it('should return the correct location between two locations', () => {
        const startLocation = new Location(10, 10);

        const endLocation = new Location(20, 20);

        const progress = 0.25;

        const expectedLocation = new Location(12.5, 12.5);

        expect(startLocation.getLocationBetween(endLocation, progress)).toStrictEqual(expectedLocation);
    });
});
