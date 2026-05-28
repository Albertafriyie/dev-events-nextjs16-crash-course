import { Schema, model, models, Document, Types } from "mongoose";

// TypeScript interface for Booking document
// createdAt/updatedAt are omitted — Mongoose's timestamps option adds them
// automatically and they are already typed via the Document internals.
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          // RFC 5322 compliant email validation regex
          const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          return emailRegex.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
  },
  {
    timestamps: true, // Auto-generates createdAt and updatedAt
  },
);

// Pre-save hook to validate the referenced event exists before creating a booking.
// - Event model is imported dynamically to avoid circular dependency between sibling model files.
// - Mongoose 8+ removed the next() callback from pre('save') — errors are thrown instead.
BookingSchema.pre("save", async function () {
  const booking = this as IBooking;

  if (booking.isModified("eventId") || booking.isNew) {
    try {
      const Event = (await import("./event.model")).default;
      const eventExists = await Event.findById(booking.eventId).select("_id");

      if (!eventExists) {
        throw new Error(`Event with ID ${booking.eventId} does not exist`);
      }
    } catch (err) {
      // Re-throw if it's already our not-found error, otherwise wrap DB/cast errors.
      if (err instanceof Error && err.message.startsWith("Event with ID")) {
        throw err;
      }
      throw new Error("Invalid event ID format or database error");
    }
  }
});

// Compound index covers eventId-only queries via the leftmost prefix rule,
// making a redundant single-field index on eventId unnecessary.
BookingSchema.index(
  { eventId: 1, createdAt: -1 },
  { name: "idx_event_createdAt" },
);

// Index for user booking lookups by email
BookingSchema.index({ email: 1 }, { sparse: true, name: "idx_email" });

// Unique compound index: enforces one booking per event per email
BookingSchema.index(
  { eventId: 1, email: 1 },
  { unique: true, name: "uniq_event_email" },
);

const Booking = models.Booking || model<IBooking>("Booking", BookingSchema);

export default Booking;
