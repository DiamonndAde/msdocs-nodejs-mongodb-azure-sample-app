const cron = require("node-cron");
const { checkRefundStatus } = require("./checkRefund");
const { RefundModel } = require("../models/refund");
const { sendMail } = require("./email");

cron.schedule("0 * * * *", async () => {
  try {
    const pendingRefunds = await RefundModel.find({
      status: "pending",
    }).populate("user");
    for (const refund of pendingRefunds) {
      const user = refund.user;
      const reference = refund.reference;
      const paystackRefunds = await checkRefundStatus(reference);
      const refundData = paystackRefunds.data;
      if (refundData.status === "processed") {
        refund.status = "success";
        await refund.save();
        user.wallet += refund.amount;
        user.totalRefunded += refund.amount;
        await user.save();

        sendMail(
          refund.email,
          "Refund Successful",
          `<h1>Your refund of ${refund.amount} was successful.</h1>`
        );
      } else if (paystackRefund.status === "failed") {
        refund.status = "failed";
        await refund.save();
      }
    }
  } catch (error) {
    console.error(error);
  }
});
