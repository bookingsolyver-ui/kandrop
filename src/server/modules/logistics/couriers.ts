import type { Vehicle } from "@/shared/logistics/schemas";

export interface Courier {
  id: string;
  name: string;
  /** National number, 9 digits. Fictional (`900 000 1xx`). */
  phone: string;
  vehicle: Vehicle;
  /** Bairros / municípios this courier covers. */
  zones: readonly string[];
}

/**
 * SANDBOX — a fictional courier network, the same for every store. Names and numbers are
 * invented. `Lubango` is deliberately not covered, so "no courier for this zone" can be seen.
 * Replace with the real network's API (availability, live position, proof of delivery).
 */
export const COURIERS: readonly Courier[] = [
  {
    id: "cur_01",
    name: "Domingos Kiala",
    phone: "900000101",
    vehicle: "moto",
    zones: ["Talatona", "Kilamba", "Maianga"],
  },
  {
    id: "cur_02",
    name: "Ernesto Paulo",
    phone: "900000102",
    vehicle: "moto",
    zones: ["Viana", "Cazenga"],
  },
  {
    id: "cur_03",
    name: "Joaquim Bunga",
    phone: "900000103",
    vehicle: "moto",
    zones: ["Maianga", "Cazenga", "Viana"],
  },
  {
    id: "cur_04",
    name: "Manuel Tchissola",
    phone: "900000104",
    vehicle: "car",
    zones: ["Talatona", "Kilamba", "Viana"],
  },
  {
    id: "cur_05",
    name: "Nelson Cambinda",
    phone: "900000105",
    vehicle: "moto",
    zones: ["Talatona", "Maianga", "Viana", "Cazenga", "Kilamba"],
  },
  {
    id: "cur_06",
    name: "Adilson Fortunato",
    phone: "900000106",
    vehicle: "moto",
    zones: ["Benguela", "Lobito"],
  },
  {
    id: "cur_07",
    name: "Sebastião Mário",
    phone: "900000107",
    vehicle: "car",
    zones: ["Benguela", "Lobito"],
  },
  { id: "cur_08", name: "Isaac Catumbela", phone: "900000108", vehicle: "moto", zones: ["Huambo"] },
  { id: "cur_09", name: "Helder Cassoma", phone: "900000109", vehicle: "car", zones: ["Huambo"] },
];

export const courierById = (id: string) => COURIERS.find((c) => c.id === id);
export const couriersFor = (zone: string) => COURIERS.filter((c) => c.zones.includes(zone));

/** How many deliveries a courier carries at once for one store. */
export const COURIER_CAPACITY = 3;
