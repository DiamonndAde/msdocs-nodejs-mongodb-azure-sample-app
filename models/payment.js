const mongoose = require("mongoose");
const { model, Schema, Document, ObjectId } = mongoose;

const PaymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },

    reference: {
      type: String,
      required: true,
    },
    paycode: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const PaymentModel = model("Payment", PaymentSchema);

module.exports = { PaymentModel };
