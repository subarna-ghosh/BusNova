const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passengerSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    title: {
      type: String,
      enum: ["Mr", "Ms", "Mrs"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
    },
    seatNumber: {
      type: String,
      required: true,
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

const Passenger = mongoose.model("Passenger", passengerSchema);
module.exports = Passenger;
