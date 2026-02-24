/**
 * database/index.ts
 *
 * Single entry-point for all database models.
 * Import from here instead of reaching into individual model files:
 *
 *   import { Event, Booking } from "@/database";
 */

export { default as Event } from "./event.model";
export { default as Booking } from "./booking.model";

// Re-export the TypeScript interfaces so callers can type their variables
// without needing to import directly from the model files.
export type { IEvent } from "./event.model";
export type { IBooking } from "./booking.model";
