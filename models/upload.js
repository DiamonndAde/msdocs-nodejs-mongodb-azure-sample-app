const mongoose = require("mongoose");
const { model, Schema, Document, ObjectId } = mongoose;

const UploadSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    file: [
      {
        type: String,
        required: true,
      },
    ],
    solution: [
      {
        type: String,
        required: true,
      },
    ],
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
    solved: {
      type: Boolean,
      default: false,
    },
    picked: {
      type: Boolean,
      default: false,
    },
    pickedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    amountReceived: {
      type: Number,
      default: 0,
    },
    fileAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const UploadModel = model("Upload", UploadSchema);

module.exports = { UploadModel };
