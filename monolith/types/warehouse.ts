import { Location } from '../helpers/locationHelpers';

export interface Warehouse {
    warehouseId: string;
    location: Location;
    cityCodename: string;
    range?: number;
}
