import mongoose, { Document, Model, Schema, Types } from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript interface
// ---------------------------------------------------------------------------
export interface IBooking extends Document {
  eventId: Types.ObjectId;  // references the Event collection
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Email validation regex
// RFC-5321-aligned pattern; intentionally simple and dependency-free.
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------
const BookingSchema = new Schema<IBooking>(
  {
    // Reference to an Event document; stored as an ObjectId in MongoDB.
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "eventId is required."],
      // Index speeds up lookups like "all bookings for event X".
      index: true,
    },

    email: {
      type: String,
      required: [true, "Email address is required."],
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => EMAIL_REGEX.test(value),
        message: (props: { value: string }) =>
          `"${props.value}" is not a valid email address.`,
      },
    },
  },
  {
    // Automatically manage `createdAt` and `updatedAt` fields.
    timestamps: true,
  }
);

// ---------------------------------------------------------------------------
// Pre-save hook — verify the referenced Event exists
// This guard prevents orphaned bookings when the caller passes an ID for
// a non-existent (or deleted) event.
// ---------------------------------------------------------------------------
BookingSchema.pre<IBooking>("save", async function (next) {
  // Only re-validate when the eventId field is being set or changed.
  if (!this.isModified("eventId")) {
    return next();
  }

  // Lazy-require to avoid a circular import: booking → event → (nothing)
  // Using mongoose.model() instead of a direct import keeps models decoupled.
  const Event = mongoose.model("Event");
  const eventExists = await Event.exists({ _id: this.eventId });

  if (!eventExists) {
    return next(
      new Error(`Event with id "${this.eventId}" does not exist.`)
    );
  }

  next();
});

// ---------------------------------------------------------------------------
// Model
// Guard against model re-registration during Next.js hot reloads.
// ---------------------------------------------------------------------------
const Booking: Model<IBooking> =
  mongoose.models.Booking ??
  mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
