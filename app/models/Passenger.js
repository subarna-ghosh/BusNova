const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passengerSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    seatNumber: {
      type: String,
      required: true,
    },
    idProofType: {
      type: String,
      enum: ["aadhaar", "passport", "voter_id", "driving_license"],
    },
    idProofNumber: {
      type: String,
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

const PassengerModel = mongoose.model("Passenger", passengerSchema);
module.exports = PassengerModel;
