const axios = require("axios");
require("dotenv").config();

async function marasoftpayVerification(transactionRef) {
  try {
    const data = {
      enc_key: process.env.MSFT_ENC_KEY,
      transaction_ref: transactionRef,
    };

    const options = {
      hostname: "api.marasoftpay.live",
      port: 443,
      path: "/api/checktransaction",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": JSON.stringify(data).length,
      },
    };

    const response = await axios.post(
      `https://${options.hostname}${options.path}`,
      data,
      options
    );
    const { data: responseData } = response;

    if (responseData.status === "true") {
      return responseData;
    } else {
      throw new Error("Transaction verification failed");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = marasoftpayVerification;
