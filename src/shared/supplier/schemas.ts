import { z } from "zod";

/** The 18 provinces of Angola, for the warehouse address. */
export const PROVINCES = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cubango", "Cuanza Norte", "Cuanza Sul", "Cunene",
  "Huambo", "Huíla", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire",
] as const;

const digits = (s: string) => s.replace(/[\s.-]/g, "");

/** Sign-up of a supplier company. Messages are translation keys (`Supplier.validation`). */
export const supplierRegisterSchema = z.object({
  companyName: z.string().trim().min(3, "company_required").max(120, "company_required"),
  nif: z.string().transform(digits).pipe(z.string().regex(/^\d{10}$/, "nif_invalid")),
  phone: z.string().transform(digits).pipe(z.string().regex(/^9\d{8}$/, "phone_invalid")),
  email: z.string().trim().toLowerCase().pipe(z.email("email_invalid")),
  province: z.enum(PROVINCES, "province_required"),
  municipality: z.string().trim().min(2, "municipality_required").max(80, "municipality_required"),
  password: z.string().min(10, "password_short").max(128, "password_short"),
});
export type SupplierRegisterInput = z.input<typeof supplierRegisterSchema>;

export const addProductSchema = z.object({
  title: z.string().trim().min(5, "title_required").max(140, "title_required"),
  category: z.enum(["beauty", "toys", "fashion", "home", "jewelry", "health", "tech", "pets"], "category_required"),
  description: z.string().trim().min(20, "description_short").max(1500, "description_short"),
  weightKg: z.coerce.number().positive("weight_invalid").max(100, "weight_invalid"),
  costPrice: z.coerce.number().int().positive("price_invalid").max(10_000_000, "price_invalid"),
  suggestedPrice: z.coerce.number().int().positive("price_invalid").max(10_000_000, "price_invalid"),
  stock: z.coerce.number().int().min(0, "stock_invalid").max(1_000_000, "stock_invalid"),
});
