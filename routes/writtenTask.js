const express = require("express");
const { Router } = express;
const { body } = require("express-validator");
const { UploadModel } = require("../models/upload");
const { WritingTask } = require("../models/writingTask");
const { WrittenTask } = require("../models/writtenTask");
const { isAuth } = require("../middleware/is-auth");
const { UserModel } = require("../models/user");
const { sendMail } = require("../middleware/email");
const axios = require("axios");

const routes = Router();

routes.get("/", isAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const writtenTasks = await WrittenTask.find()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const totalDocuments = await WrittenTask.countDocuments();
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const nextPage = page + 1 > totalPages ? null : page + 1;
    const previousPage = page - 1 < 1 ? null : page - 1;

    res.json({
      writtenTasks,
      totalPages,
      currentPage: page,
      nextPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      previousPage,
      pageSize,
      totalDocuments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.get("/my-tasks", isAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.id).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const writtenTasks = await WrittenTask.find({
      creator: req.id,
    })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const totalDocuments = await WrittenTask.countDocuments();
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const nextPage = page + 1 > totalPages ? null : page + 1;
    const previousPage = page - 1 < 1 ? null : page - 1;

    res.json({
      writtenTasks,
      totalPages,
      currentPage: page,
      nextPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      previousPage,
      pageSize,
      totalDocuments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.get("/picked-tasks", isAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.id).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const writtenTasks = await WrittenTask.find({
      pickedBy: req.id,
    })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const totalDocuments = await WrittenTask.countDocuments();
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const nextPage = page + 1 > totalPages ? null : page + 1;
    const previousPage = page - 1 < 1 ? null : page - 1;

    res.json({
      writtenTasks,
      totalPages,
      currentPage: page,
      nextPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      previousPage,
      pageSize,
      totalDocuments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.get("/:id", isAuth, async (req, res) => {
  try {
    const writtenTask = await WrittenTask.findById(req.params.id).exec();
    if (!writtenTask) {
      return res.status(404).json({ error: "Written task not found" });
    }
    res.json(writtenTask);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.post(
  "/",
  isAuth,
  [
    body("title").trim().isLength({ min: 5 }),
    body("description").trim().isLength({ min: 5 }),
    body("fileId").trim().isLength({ min: 5 }),
  ],
  async (req, res) => {
    try {
      const upload = await UploadModel.findById(req.body.fileId).populate(
        "creator"
      );
      if (!upload) {
        return res.status(404).json({ error: "File not found" });
      }

      const user = await UserModel.findById(req.id).exec();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const uploader = upload.creator;
      const { reference, fileId, deadline } = req.body;
      const writtenTask = new WrittenTask({
        fileId,
        title: upload.title,
        description: upload.description,
        budget: upload.fileAmount,
        writingFee: upload.fileAmount * 0.5,
        deadline,
        reference,
        creator: req.id,
      });

      await writtenTask.save();

      upload.amountReceived += upload.fileAmount * 0.8;
      await upload.save();

      uploader.wallet += upload.fileAmount * 0.8;
      await uploader.save();

      user.writtenTasks.push(writtenTask);
      await user.save();

      res.status(201).json(writtenTask);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Sorry, something went wrong :/" });
    }
  }
);

routes.post("/verify-code", isAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.id).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { reference } = req.body;
    const writtenTask = await WrittenTask.findOne({
      reference,
    }).populate("pickedBy");

    if (!writtenTask) {
      return res.status(404).json({ error: "Written task not found" });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status === "success") {
      WrittenTask.findOneAndUpdate({ status: "success" });

      user.wallet += writtenTask.writingFee;

      return res.json(response);
    } else {
      WrittenTask.findOneAndUpdate(
        { paycode: reference },
        { status: "failed" }
      );

      return res.status(400).json({
        message: "Payment failed or reference is wrong",
        response,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Sorry, something went wrong :/",
      message: "Error processing checks",
    });
  }
});

routes.post(
  "/pick",
  isAuth,
  [body("id").isString().isLength({ min: 2 })],
  async (req, res) => {
    try {
      const user = await UserModel.findById(req.id).exec();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const upload = await WrittenTask.findById(req.body.id)
        .populate("creator")
        .exec();

      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }
      if (upload.picked) {
        return res.status(400).json({ error: "Upload already picked" });
      }

      const uploader = upload.creator;

      upload.picked = true;
      upload.pickedBy = req.id;
      await upload.save();
      sendMail(
        uploader.email,
        "Written Task Picked",
        `<h1>Your Task of ${upload.title} was picked by ${user.firstName}.</h1>`
      );

      sendMail(
        user.email,
        "Task Picked",
        `<h1>You picked ${upload.title} by ${uploader.firstName}.</h1>`
      );
      return res.status(200).json({ message: "Upload picked successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

module.exports = routes;
