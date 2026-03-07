import "dotenv/config";

export const PORT = Number(process.env.PORT) || 3000;
export const IS_PROD = process.env.NODE_ENV === "production";
export const SIMULATE_PROD = process.env.SIMULATE_PROD === "true";

/**
 * Secret key that grants developer bypass of the multi-tab restriction.
 * Set OWNER_KEY in your .env file (never commit it).
 */
export const OWNER_KEY = process.env.OWNER_KEY ?? "";
