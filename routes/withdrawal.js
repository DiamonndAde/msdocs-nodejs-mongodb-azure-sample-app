const express = require("express");
const { Router } = express;
const { isAuth } = require("../middleware/is-auth");
const { UserModel } = require("../models/user");
const { WithdrawalModel } = require("../models/withdrawal");
const { sendMail } = require("../middleware/email");
const axios = require("axios");

require("dotenv").config();

const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY);

const routes = Router();

routes.get("/transfer/:transactionRef", isAuth, async (req, res) => {
  try {
    const { transactionRef } = req.params;
    const today = new Date().toLocaleDateString();
    const startDate = "06-03-2023"; // Replace with your desired static start date
    const response = await axios.post(
      "https://api.marasoftpay.live/account_history/transfers",
      {
        enc_key: `${process.env.MSFT_ENC_KEY}`,
        start_date: startDate,
        end_date: today,
      }
    );

    const transactions = response.data.transactions.filter(
      (transaction) => transaction.transaction_ref === transactionRef
    );

    res.json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message, error: error.response.data });
  }
});

routes.post("/verify", isAuth, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,

      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    if (response.data.status) {
      return res.json(response.data);
    }
  } catch (error) {
    res.status(500).json({
      message: "Invalid account number or bank code",
      error: error.response.data,
      error2: error.message,
    });
  }
});

routes.post("/recipient", isAuth, async (req, res) => {
  try {
    const { type, name, accountNumber, bankCode } = req.body;
    const user = await UserModel.findById(req.id);

    // Update the recipient data in the user model
    user.recipient = {
      type,
      name,
      accountNumber,
      bankCode,
    };

    // Save the changes to the user model
    await user.save();

    res.json({ message: "Recipient data updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

routes.post("/wallet/withdraw", isAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    // Find the user
    const user = await UserModel.findById(req.id).exec();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the wallet has sufficient funds
    if (user.wallet < amount)
      return res.status(400).json({ message: "Insufficient funds" });

    const withdrawal = new WithdrawalModel({
      user: req.id,
      amount,
      status: "queued",
    });

    let recipientData;
    if (req.body.recipient) {
      // Use the recipient data provided in the request body
      recipientData = req.body.recipient;
    } else {
      // Check if recipient data exists in the user model
      if (
        !user.recipient ||
        !user.recipient.accountNumber ||
        !user.recipient.bankCode
      ) {
        return res.status(400).json({ message: "Recipient data not provided" });
      }
      // Use the recipient data from the user model
      recipientData = {
        type: user.recipient.type,
        name: user.recipient.name,
        accountNumber: user.recipient.accountNumber,
        bankCode: user.recipient.bankCode,
      };
    }

    // Initiate the transfer using Marasoftpay API
    const url = "https://developers.marasoftpay.live/createtransfer";
    const data = `amount=${amount}&transactionRef=${withdrawal._id}&account_number=${recipientData.accountNumber}&description=Withdrawal from wallet&currency=NGN&bank_code=${recipientData.bankCode}&enc_key=${process.env.MSFT_ENC_KEY}}`;

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.status !== 200) {
      throw new Error("Failed to initiate transfer");
    }

    // Deduct from the wallet
    user.wallet -= amount;
    user.totalWithdrawn += amount;
    await user.save();

    // Create a withdrawal record
    withdrawal.transferCode = response.data.transferCode;
    withdrawal.createdAt = new Date();

    await withdrawal.save();

    // Send email to the user
    sendMail(
      user.email,
      "Withdrawal Successful",
      `You have successfully withdrawn ${amount} from your wallet.`
    );

    res.json({ message: "Withdrawal successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = routes;
