const fs = require("fs");
const multer = require("multer");

// Check if the uploads folder exists
if (!fs.existsSync("uploads")) {
  // Create the uploads folder if it doesn't exist
  fs.mkdirSync("uploads");
}

function fileUploadMiddleware() {
  return multer({
    // Where the files will be stored
    dest: "uploads/",

    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // Save the uploaded files to the 'uploads' folder
        cb(null, "uploads/");
      },
      filename: (req, file, cb) => {
        // Use the original file name as the file name
        cb(null, file.originalname);
      },
    }),
  });
}

module.exports = fileUploadMiddleware;
