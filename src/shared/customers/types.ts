/** One customer of the store, built from its real orders. Plain and serialisable; money in minor units. */
export interface CustomerRow {
  /** The national phone number: the identity of a customer (orders carry no account). */
  phone: string;
  name: string;
  email: string | null;
  city: string;
  province: string;
  /** Orders placed, cancelled ones excluded. */
  orders: number;
  /** Sum of the customer's payment-verified, non-cancelled orders. */
  spent: number;
  /** Epoch ms of the most recent order. */
  lastOrderAt: number;
}
