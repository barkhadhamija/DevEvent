import mongoose, { Mongoose } from "mongoose";

// ---------------------------------------------------------------------------
// Environment validation
// Fail fast at startup if the required env variable is missing, rather than
// letting the app crash at the first database call.
// ---------------------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in your .env file."
  );
}

// ---------------------------------------------------------------------------
// Connection cache type
// We store both the resolved Mongoose instance (conn) and the in-flight
// Promise (promise) so that concurrent calls during a single cold-start
// share the same connection attempt instead of opening multiple sockets.
// ---------------------------------------------------------------------------
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// ---------------------------------------------------------------------------
// Global cache
// In Next.js development mode, the module cache is cleared on every hot
// reload, which would otherwise create a new Mongoose connection on each
// reload.  Storing the cache on the Node.js `global` object persists it
// across hot reloads.
// ---------------------------------------------------------------------------
declare global {
  // `var` is intentional here: only `var` declarations merge into the
  // NodeJS.Global interface.
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

// Initialise the cache on first module load.
const cached: MongooseCache = (global._mongooseCache ??= {
  conn: null,
  promise: null,
});

// ---------------------------------------------------------------------------
// connectToDatabase
// ---------------------------------------------------------------------------
/**
 * Returns a cached Mongoose connection, or creates a new one if none exists.
 *
 * Usage:
 * ```ts
 * import { connectToDatabase } from "@/lib/mongodb";
 *
 * const db = await connectToDatabase();
 * ```
 *
 * @returns {Promise<Mongoose>} The active Mongoose connection instance.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Return the existing connection immediately if one is available.
  if (cached.conn) {
    return cached.conn;
  }

  // If no connection attempt is in flight yet, start one.
  if (!cached.promise) {
    const connectionOptions: mongoose.ConnectOptions = {
      // Disable Mongoose's internal command buffering so that operations fail
      // immediately if the connection is lost, rather than queuing silently.
      bufferCommands: false,
    };

    // MONGODB_URI is guaranteed to be a string here because of the guard
    // at the top of the module; we use the non-null assertion to inform
    // TypeScript of that fact without resorting to `any`.
    cached.promise = mongoose.connect(MONGODB_URI!, connectionOptions);
  }

  // Await the shared promise.  If it rejects, clear it so the next call
  // can retry rather than receiving the same rejected promise forever.
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
