import type { Database } from "@/lib/database.types";

export type Shop = Database["public"]["Tables"]["shops"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];

export const FREE_PRODUCT_LIMIT = 15;
