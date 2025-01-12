const express = require("express");
const { Router } = express;
const { body } = require("express-validator");
const { RefundModel } = require("../models/refund");
const { isAuth } = require("../middleware/is-auth");
const { UserModel } = require("../models/user");
const { PaymentModel } = require("../models/payment");
const { createRefund } = require("../middleware/refund");

const routes = Router();

routes.get("/", isAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.id).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const refunds = await RefundModel.find({ user: req.id }).exec();
    return res.json(refunds);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Sorry, something went wrong :/",
      message: "Error getting refunds",
    });
  }
});

routes.post(
  "/",
  isAuth,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("upload").isString().isLength({ min: 2 }),
    body("reference").isString().isLength({ min: 2 }),
    body("email").isEmail().withMessage("Email must be valid email"),
  ],
  async (req, res) => {
    try {
      const { amount, reference, upload, email, description } = req.body;
      const user = await UserModel.findById(req.id).exec();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const payment = await PaymentModel.findOne({
        reference,
      }).exec();
      if (!payment || payment.user.toString() !== req.id) {
        return res
          .status(400)
          .json({ error: "Payment not found or not made by the user" });
      }
      const refund = await createRefund(
        reference,
        amount,
        req.id,
        upload,
        email,
        description
      );
      return res.json(refund);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Sorry, something went wrong :/",
        message: "Error creating refund",
      });
    }
  }
);

module.exports = routes;
