const express = require("express");
const { Router } = express;
const { body } = require("express-validator");
const { UploadModel } = require("../models/upload");
const { isAuth } = require("../middleware/is-auth");
const { UserModel } = require("../models/user");
const fileUploadMiddleware = require("../middleware/multer");

const routes = Router();

routes.get("/", isAuth, async (req, res) => {
  try {
    const department = req.query.department;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    let query = UploadModel.find();

    if (department) {
      query = query.where({ department });
    }

    const uploads = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const totalDocuments = await UploadModel.countDocuments(
      department ? { department } : {}
    );
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const nextPage = page + 1 > totalPages ? null : page + 1;
    const previousPage = page - 1 < 1 ? null : page - 1;

    res.json({
      uploads,
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

routes.get("/my-uploads", isAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.id).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const uploads = await UploadModel.find({
      creator: req.id,
    })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const totalDocuments = await UploadModel.countDocuments({
      creator: req.id,
    });
    const totalPages = Math.ceil(totalDocuments / pageSize);

    const nextPage = page + 1 > totalPages ? null : page + 1;
    const previousPage = page - 1 < 1 ? null : page - 1;

    res.json({
      uploads,
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

routes.get("/solvers", isAuth, async (req, res) => {
  try {
    const solverUsers = await UserModel.find({
      user: "solver",
    }).exec();

    if (!solverUsers) {
      return res.status(404).json({ error: "Solver not found" });
    }
    const solverIds = solverUsers.map((user) => user._id);
    const uploads = await UploadModel.find({ creator: { $in: solverIds } });
    res.json(uploads);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Sorry, something went wrong :/" }, error.message);
  }
});

routes.get("/clients", isAuth, async (req, res) => {
  try {
    const clientUsers = await UserModel.find({ user: "client" });

    if (!clientUsers) {
      return res.status(404).json({ error: "Client not found" });
    }
    const clientIds = clientUsers.map((user) => user._id);

    const uploads = await UploadModel.find({ creator: { $in: clientIds } });
    res.json(uploads);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Sorry, something went wrong :/" }, error.message);
  }
});

routes.get("/:id", isAuth, async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id).exec();
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }
    return res.json(upload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.get("/upload/:id/solution", isAuth, async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    if (!upload.solved) {
      return res
        .status(400)
        .json({ error: "Solution not found for this upload." });
    }

    res.set("Content-Type", "application/pdf");
    res.send(upload.solution);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.post(
  "/",
  fileUploadMiddleware().array("file", 10),
  isAuth,
  [
    body("title").isString().isLength({ min: 2 }),
    body("description").isString().isLength({ min: 2 }),
    body("deadline").isDate(),
    body("budget").isString().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
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

      const user = await UserModel.findById(req.id).exec();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      creator = user;
      user.uploads.push(newUpload);
      await user.save();
      return res.status(201).json({ upload: newUpload, creator });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ errors: "Sorry, something went wrong :/", error });
    }
  }
);

routes.post("/upload/:id/solution", isAuth, async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    if (upload.pickedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "You are not authorized to post a solution for this upload.",
      });
    }

    upload.solution = req.body.solution;
    upload.status = "submitted";
    await upload.save();

    res.json({ message: "Solution posted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.patch("/:id", isAuth, async (req, res) => {
  try {
    const post = await UploadModel.findById(req.params.id).exec();
    if (!post) {
      return res.status(404).json({ error: "Upload not found" });
    }
    if (post.creator.toString() !== req.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const upload = await UploadModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).exec();
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }
    return res.json(upload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.patch("/upload/:id/confirm-solution", isAuth, async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    if (upload.solved) {
      return res
        .status(400)
        .json({ error: "Solution already confirmed for this upload." });
    }

    const solver = await UserModel.findById(upload.pickedBy);

    if (!solver) {
      return res.status(404).json({ error: "Solver not found." });
    }

    // Confirm the solution and update the upload and solver
    upload.solved = true;
    upload.status = "accepted";

    solver.wallet += upload.fileAmount * 0.8;

    await upload.save();
    await solver.save();

    return res.json({ message: "Solution confirmed successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.patch("/upload/:id/reject-solution", isAuth, async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    if (upload.solved) {
      return res
        .status(400)
        .json({ error: "Solution already confirmed for this upload." });
    }

    const solver = await UserModel.findById(upload.pickedBy);

    if (!solver) {
      return res.status(404).json({ error: "Solver not found." });
    }

    // Reject the solution and update the upload and solver
    upload.solved = false;
    upload.status = "rejected";

    await upload.save();
    await solver.save();

    return res.json({ message: "Solution rejected successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

routes.delete("/:id", isAuth, async (req, res) => {
  try {
    const post = await UploadModel.findById(req.params.id).exec();
    if (!post) {
      return res.status(404).json({ error: "Upload not found" });
    }
    if (post.creator.toString() !== req.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const upload = await UploadModel.findByIdAndDelete(req.params.id).exec();
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    const user = await UserModel.findByIdAndUpdate(
      req.id,
      { $pull: { uploads: req.params.id } },
      { new: true }
    ).exec();

    return res.json(upload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

module.exports = routes;
