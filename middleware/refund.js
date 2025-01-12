const { UserModel } = require("../models/user");
const { RefundModel } = require("../models/refund");
const axios = require("axios");

module.exports.createRefund = async (
  reference,
  amount,
  userId,
  upload,
  email,
  description
) => {
  try {
    const user = await UserModel.findById(userId).exec();
    if (!user) {
      throw new Error("User not found");
    }
    const refund = new RefundModel({
      user,
      upload,
      email,
      reference,
      description,
      amount,
      status: "pending",
    });
    await refund.save();
    user.refunds.push(refund);
    await user.save();
    await axios.post(
      `https://api.paystack.co/refund`,
      {
        transaction: reference,
        amount: amount,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return refund;
  } catch (error) {
    console.error(error);
    const errorMessage =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : error;
    throw new Error(errorMessage);
  }
};
