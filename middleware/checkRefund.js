const axios = require("axios");

module.exports.checkRefundStatus = async (reference) => {
  try {
    const { data } = await axios.get(`https://api.paystack.co/refund`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      params: {
        transaction: reference,
      },
    });
    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Error checking refund status");
  }
};
