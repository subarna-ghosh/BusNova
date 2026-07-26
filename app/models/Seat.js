const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const seatSchema = new Schema(
  {
    seatNumber: {
      type: String,
      required: true,
    },
    row: {
      type: Number,
      required: true,
    },
    column: {
      type: Number,
      required: true,
    },
    deck: {
      type: String,
      enum: ["lower", "upper"],
      default: "lower",
    },
    seatType: {
      type: String,
      enum: ["seater", "sleeper"],
      default: "seater",
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isAisle: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const seatLayoutSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    layoutType: {
      type: String,
      enum: ["2x1", "2x2", "sleeper"],
      required: true,
    },
    totalRows: {
      type: Number,
      required: true,
    },
    totalColumns: {
      type: Number,
      required: true,
    },
    seats: [seatSchema],
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

const SeatLayoutModel = mongoose.model("SeatLayout", seatLayoutSchema);
module.exports = SeatLayoutModel;
