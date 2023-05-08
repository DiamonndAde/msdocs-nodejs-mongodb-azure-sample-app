const express = require("express");
const { Router } = express;
const { body } = require("express-validator");
const { UploadModel } = require("../models/upload");
const { isAuth } = require("../middleware/is-auth");
const { UserModel } = require("../models/user");
const fileUploadMiddleware = require("../middleware/multer");
const fs = require("fs");
const JSZip = require("jszip");
const path = require("path");
const { uploads } = require("../utils/cloudinary");

const archiver = require("archiver");

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

routes.get("/:id/solution", isAuth, async (req, res) => {
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

routes.get("/:id/download", async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    const files = upload.files;
    const fileUrls = files.map((file) => file.url);

    const zip = new JSZip();
    const folderName = `Uploaded Files - ${upload.title}`;
    const folder = zip.folder(folderName);

    // Add files to the zip folder
    for (let i = 0; i < fileUrls.length; i++) {
      const response = await axios.get(fileUrls[i], {
        responseType: "arraybuffer",
      });

      folder.file(files[i].filename, response.data, { binary: true });
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: "nodebuffer" });

    // Set the headers for the download
    res.set({
      "Content-Disposition": `attachment; filename=${folderName}.zip`,
      "Content-Type": "application/zip",
    });

    // Send the zip file to the client
    res.send(content);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Sorry, something went wrong :/" });
  }
});

// Download solution files
routes.get("/solutions/:id/download", async (req, res) => {
  try {
    const upload = await UploadModel.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    const files = upload.solution;
    const fileUrls = files.map((file) => file.url);

    const zip = new JSZip();
    const folderName = `Solution Files - ${upload.title}`;
    const folder = zip.folder(folderName);

    // Add files to the zip folder
    for (let i = 0; i < fileUrls.length; i++) {
      const response = await axios.get(fileUrls[i], {
        responseType: "arraybuffer",
      });

      folder.file(files[i], response.data, { binary: true });
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: "nodebuffer" });

    // Set the headers for the download
    res.set({
      "Content-Disposition": `attachment; filename=${folderName}.zip`,
      "Content-Type": "application/zip",
    });

    // Send the zip file to the client
    res.send(content);
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
      const user = await UserModel.findById(req.id).exec();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (!req.files) {
        return res
          .status(400)
          .json({ error: "Please upload one or more files" });
      }

      const upload = req.body;
      upload.creator = req.id;
      upload.file = req.files.map((file) => file.originalname);

      // Upload files to Cloudinary
      const uploadedFiles = await Promise.all(
        req.files.map((file) => uploads(file.path, "uploads"))
      );

      // Generate download URL for the zip file
      const fileUrls = uploadedFiles
        .map((file) => file.url)
        .filter((url) => url.endsWith(".pdf"));
      const zipUrl = await uploads(fileUrls, "uploads");

      // Create new upload record in the database
      const newUpload = await UploadModel.create({
        ...upload,
        files: uploadedFiles.map((file) => file.public_id),
        zipUrl: zipUrl.url,
      });

      // Add the new upload to the user's uploads array
      user.uploads.push(newUpload);
      await user.save();

      return res.status(201).json({ upload: newUpload });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ errors: "Sorry, something went wrong :/", error });
    }
  }
);

routes.patch(
  "/:id/solution",
  fileUploadMiddleware().array("file", 10),
  isAuth,
  async (req, res) => {
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

      if (!req.files) {
        return res
          .status(400)
          .json({ error: "Please upload one or more files" });
      }

      // Create a zip file containing all the uploaded files
      const zipName = `${upload.title}_solution.zip`;
      const output = fs.createWriteStream(zipName);
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(output);
      req.files.forEach((file) => {
        archive.append(fs.createReadStream(file.path), {
          name: file.originalname,
        });
      });
      await archive.finalize();

      // Upload the zip file to Cloudinary
      const result = await uploads(zipName, "solutions");

      // Save the download URL in the solution field of the UploadModel
      upload.solution = result.url;
      upload.status = "submitted";
      await upload.save();

      // Delete the zip file from the server
      fs.unlinkSync(zipName);

      res.json({ message: "Solution posted successfully." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Sorry, something went wrong :/" });
    }
  }
);

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

routes.patch("/:id/confirm-solution", isAuth, async (req, res) => {
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

routes.patch("/:id/reject-solution", isAuth, async (req, res) => {
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
    if (post.creator.toString() !== req.id && !req.isAdmin) {
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
