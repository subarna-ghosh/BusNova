const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const busSchema = new Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    busType: {
      type: String,
      enum: ["seater", "semi_sleeper", "sleeper", "sleeper_ac"],
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
    },
    seatLayoutId: {
      type: Schema.Types.ObjectId,
      ref: "SeatLayout",
    },
    amenities: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
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

const BusModel = mongoose.model("Bus", busSchema);
module.exports = BusModel;
