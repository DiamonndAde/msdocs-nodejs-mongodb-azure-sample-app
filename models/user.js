const mongoose = require("mongoose");
const { model, Schema, Document, ObjectId } = mongoose;

const UserSchema = new Schema(
  {
    user: {
      type: String,
      required: true,
    },
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralDownLinks: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
    },
    recipient: {
      type: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      accountNumber: {
        type: String,
        required: true,
      },
      bankCode: {
        type: String,
        required: true,
      },
    },
    recipientCode: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    matriculationNumber: {
      type: String,
      required: true,
    },
    profile: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
    },
    recipientId: {
      type: String,
      default: null,
    },
    uploads: [
      {
        type: Schema.Types.ObjectId,
        ref: "Upload",
      },
    ],
    writtingTasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "WritingTask",
      },
    ],
    pickedUploads: [
      {
        type: Schema.Types.ObjectId,
        ref: "Upload",
      },
    ],
    payments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
    refunds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Refund",
      },
    ],
    totalRefunded: {
      type: Number,
      default: 0,
    },
    writtenTasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "WrittenTask",
      },
    ],
    wallet: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    totalPayments: {
      type: Number,
      default: 0,
    },
    withdrawals: [
      {
        type: Schema.Types.ObjectId,
        ref: "Withdrawal",
      },
    ],
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date || null,
    },
  },
  { timestamps: true }
);

const UserModel = model("User", UserSchema);

module.exports = { UserModel };
