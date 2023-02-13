const express = require("express");
const { Router } = express;
const { body, validationResult } = require("express-validator");
const { PaymentModel } = require("../models/payment");
const { isAuth } = require("../middleware/is-auth");
const { UserModel } = require("../models/user");
const { sendMail } = require("../middleware/email");
const { UploadModel } = require("../models/upload");
const paystackVerification = require("../middleware/paystackVerication");
const fileUploadMiddleware = require("../middleware/multer");
const axios = require("axios");
require("dotenv").config();

const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY);

const routes = Router();

routes.get("/", isAuth, async (req, res) => {
  try {
    const payments = await PaymentModel.find({ user: req.id })
      .sort({ createdAt: -1 })
      .exec();
    return res.json(payments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Sorry, something went wrong :/",
      message: "Error fetching payments",
    });
  }
});

routes.post(
  "/",
  isAuth,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("file").isString().isLength({ min: 2 }),
    body("currency").isString().isLength({ min: 2 }),
    body("reference").isString().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const user = await UserModel.findById(req.id).exec();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const upload = await UploadModel.findById(req.body.file).populate(
        "creator"
      );

      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      const uploader = upload.creator;

      // Verify the authenticity of the payment using Paystack API
      const verification = await paystackVerification(req.body.reference);
      if (!verification.status) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const payment = new PaymentModel({
        amount: req.body.amount,
        currency: req.body.currency,
        reference: req.body.reference,
        paycode: req.body.paycode,
        file: req.body.file,
        email: user.email,
        user: req.id,
      });
      await payment.save();

      upload.fileAmount = payment.amount;
      upload.amountReceived += payment.amount;
      await upload.save();

      user.payments.push(payment);
      await user.save();

      uploader.wallet += payment.amount;
      uploader.totalpayments += payment.amount;
      await uploader.save();

      sendMail(
        user.email,
        "Payment Successful",
        `<h1>Your payment of ${payment.amount} was successful.</h1>`
      );

      sendMail(
        uploader.email,
        "Payment Received",
        `<h1>You received a payment of ${payment.amount} on ${upload.title}, the file ID of ${upload.file}.</h1>`
      );

      return res.json(payment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Sorry, something went wrong :/",
        message: "Error processing payment",
      });
    }
  }
);

routes.post(
  "/student-upload",
  fileUploadMiddleware().array("file", 10),
  isAuth,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("currency").isString().isLength({ min: 2 }),
    body("reference").isString().isLength({ min: 2 }),
    body("title").isString().isLength({ min: 2 }),
    body("description").isString().isLength({ min: 2 }),
    body("deadline").isDate(),
    body("budget").isString().isLength({ min: 2 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await UserModel.findById(req.id).exec();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify the authenticity of the payment using Paystack API
      let verification;
      try {
        verification = await paystackVerification(req.body.reference);
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          error: "Payment verification failed",
          message: error.message,
          errors: error,
        });
      }

      if (!req.files) {
        return res
          .status(400)
          .json({ error: "Please upload one or more files" });
      }

      const upload = req.body;
      upload.creator = req.id;
      upload.file = req.files.map((file) => file.originalname);
      let creator;

      const newUpload = await UploadModel.create(upload);

      creator = user;

      user.uploads.push(newUpload);

      const payment = new PaymentModel({
        amount: req.body.amount,
        currency: req.body.currency,
        reference: req.body.reference,
        paycode: req.body.paycode,
        file: newUpload._id,
        email: user.email,
        user: req.id,
      });
      await payment.save();

      user.totalpayments += payment.amount;
      user.payments.push(payment);
      await user.save();

      sendMail(
        user.email,
        "Payment Successful",
        `<h1>Your payment of ${payment.amount} was successful.</h1>`
      );

      return res.json({ payment, upload: newUpload, creator });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Sorry, something went wrong :/",
        message: "Error processing payment",
      });
    }
  }
);

routes.post("/verify", isAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.id).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { reference } = req.body;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status === "success") {
      return res.json(response);
    } else {
      return res.status(400).json({ message: "Payment failed", response });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Sorry, something went wrong :/",
      message: "Error processing payment",
    });
  }
});

module.exports = routes;
