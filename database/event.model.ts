import mongoose, { CallbackWithoutResultAndOptionalError, Document, Model, Schema } from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript interface — describes the shape of a raw Event document.
// Extending Document gives us all Mongoose instance methods and properties.
// ---------------------------------------------------------------------------
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;       // stored as ISO date string after normalisation
  time: string;       // stored in "HH:MM" 24-hour format after normalisation
  mode: "online" | "offline" | "hybrid";
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------
const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Event title is required."],
      trim: true,
    },

    // Slug is derived from the title in the pre-save hook; we still declare
    // it required here so a manually cleared slug causes a validation error.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Event description is required."],
      trim: true,
    },

    overview: {
      type: String,
      required: [true, "Event overview is required."],
      trim: true,
    },

    image: {
      type: String,
      required: [true, "Event image URL is required."],
      trim: true,
    },

    venue: {
      type: String,
      required: [true, "Event venue is required."],
      trim: true,
    },

    location: {
      type: String,
      required: [true, "Event location is required."],
      trim: true,
    },

    date: {
      type: String,
      required: [true, "Event date is required."],
    },

    time: {
      type: String,
      required: [true, "Event time is required."],
    },

    mode: {
      type: String,
      required: [true, "Event mode is required."],
      enum: {
        values: ["online", "offline", "hybrid"],
        message: 'Event mode must be "online", "offline", or "hybrid".',
      },
    },

    audience: {
      type: String,
      required: [true, "Target audience is required."],
      trim: true,
    },

    agenda: {
      type: [String],
      required: [true, "Event agenda is required."],
      validate: {
        validator: (items: string[]) => items.length > 0,
        message: "Agenda must contain at least one item.",
      },
    },

    organizer: {
      type: String,
      required: [true, "Organizer name is required."],
      trim: true,
    },

    tags: {
      type: [String],
      required: [true, "At least one tag is required."],
      validate: {
        validator: (items: string[]) => items.length > 0,
        message: "Tags must contain at least one entry.",
      },
    },
  },
  {
    // Automatically manage `createdAt` and `updatedAt` fields.
    timestamps: true,
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a title string into a URL-friendly slug.
 * e.g. "Hello World! 2026" → "hello-world-2026"
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // strip non-word chars except spaces and hyphens
    .replace(/[\s_]+/g, "-")    // replace whitespace / underscores with hyphens
    .replace(/^-+|-+$/g, "");   // strip leading/trailing hyphens
}

/**
 * Normalises a date string to ISO 8601 format (YYYY-MM-DD).
 * Throws if the value cannot be parsed as a valid date.
 */
function normaliseDate(raw: string): string {
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: "${raw}".`);
  }
  // toISOString() → "2026-01-06T00:00:00.000Z"; we keep only the date portion.
  return parsed.toISOString().split("T")[0];
}

/**
 * Normalises a time string to 24-hour "HH:MM" format.
 * Accepts both 12-hour (e.g. "9:00 AM") and 24-hour input.
 * Throws if the value cannot be parsed.
 */
function normaliseTime(raw: string): string {
  // Build a throwaway Date on an arbitrary day so we can leverage the JS
  // time parser. We only care about the time component.
  const parsed = new Date(`1970-01-01 ${raw}`);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid time value: "${raw}".`);
  }
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mm = String(parsed.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// Pre-save hook
// Handles slug generation + date/time normalisation in one place.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
EventSchema.pre<IEvent>("save", function (this: IEvent, next: any) {
  // Regenerate the slug only when the title changes (or on first save)
  // to avoid unnecessary writes and unintended slug drift.
  if (this.isModified("title")) {
    this.slug = generateSlug(this.title);
  }

  // Normalise date to ISO format on every save so the stored value is always
  // consistent regardless of what the caller passed in.
  if (this.isModified("date")) {
    this.date = normaliseDate(this.date);
  }

  // Normalise time to 24-hour "HH:MM" format.
  if (this.isModified("time")) {
    this.time = normaliseTime(this.time);
  }

  (next as CallbackWithoutResultAndOptionalError)();
});

// ---------------------------------------------------------------------------
// Model
// Guard against model re-registration during Next.js hot reloads.
// ---------------------------------------------------------------------------
const Event: Model<IEvent> =
  mongoose.models.Event ?? mongoose.model<IEvent>("Event", EventSchema);

export default Event;
