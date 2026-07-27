const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const roleSchema = new Schema(
  {
    roleName: {
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
const RoleModel = mongoose.model("Role", roleSchema);
module.exports = RoleModel;
