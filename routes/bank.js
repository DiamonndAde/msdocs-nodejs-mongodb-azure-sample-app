const express = require("express");
const { Router } = express;
const axios = require("axios");
// const { isAuth } = require("../middleware/is-auth");
require("dotenv").config();

const routes = Router();

routes.get("/", async (req, res) => {
  try {
    const { name } = req.query;
    const url = "https://api.paystack.co/bank";
    const headers = {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    };
    const response = await axios.get(url, { headers });

    let banks = response.data.data;
    if (name) {
      const searchRegex = new RegExp(`.*${name.split("").join(".*")}.*`, "i");
      banks = banks.filter((bank) => searchRegex.test(bank.name));
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
