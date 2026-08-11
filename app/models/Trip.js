const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tripSchema = new Schema(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    busId: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departureAt: {
      type: Date,
      required: true,
    },
    arrivalAt: {
      type: Date,
      required: true,
    },

    // Normal seat fare
    baseFare: {
      type: Number,
      required: true,
      min: 0,
    },

    // Premium seat fare
    premiumFare: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    availableSeats: {
      type: Number,
      required: true,
    },
    bookedSeatNumbers: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: [
        "scheduled",
        "boarding",
        "departed",
        "completed",
        "delayed",
        "cancelled",
      ],
      default: "scheduled",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const TripModel = mongoose.model("Trip", tripSchema);
module.exports = TripModel;
