const express = require("express");
const { Router } = express;
const axios = require("axios");
// const { isAuth } = require("../middleware/is-auth");
require("dotenv").config();

const routes = Router();

routes.get("/", async (req, res) => {
  try {
    const { name } = req.query;
    const url = "https://api.marasoftpay.live/getbanks";
    const data = `enc_key=${process.env.MSFT_ENC_KEY}`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await axios.post(url, data, { headers });

    let banks = response.data.data.banks;

    if (name) {
      const searchRegex = new RegExp(`^${name}`, "i");
      banks = banks.filter((bank) => searchRegex.test(bank.bank_name));
    }

    res.json(banks);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong", message: error.message });
  }
});

module.exports = routes;
