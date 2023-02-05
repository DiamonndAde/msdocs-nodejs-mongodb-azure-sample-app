const axios = require("axios");

async function paystackVerification(reference) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { data } = response;

    if (data.status) {
      return data;
    } else {
      throw new Error("Transaction verification failed");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = paystackVerification;
