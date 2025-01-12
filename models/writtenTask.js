const mongoose = require("mongoose");
const { model, Schema, Document, ObjectId } = mongoose;

const WrittenTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    fileId: {
      type: String,
      required: true,
    },
    writingFee: {
      type: Number,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    pickedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    picked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "pending",
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const WrittenTask = model("WrittenTask", WrittenTaskSchema);

module.exports = { WrittenTask };
