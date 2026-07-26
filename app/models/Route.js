const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const routeStopSchema = new Schema(
  {
    stopId: {
      type: Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    arrivalOffsetMinutes: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const routeSchema = new Schema(
  {
    originStopId: {
      type: Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },
    destinationStopId: {
      type: Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },
    stops: [routeStopSchema],
    distanceKm: {
      type: Number,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
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

const RouteModel = mongoose.model("Route", routeSchema);
module.exports = RouteModel;
