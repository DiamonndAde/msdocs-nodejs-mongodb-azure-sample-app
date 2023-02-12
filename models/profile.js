const mongoose = require("mongoose");
const { model, Schema, Document, ObjectId } = mongoose;

const ProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    about: {
      type: String,
      default: "",
    },
    contact: {
      type: {
        email: {
          type: String,
          required: true,
          default: "",
        },
        phone: {
          type: String,
          required: true,
          default: "",
        },
      },
    },
    education: {
      type: {
        institution: {
          type: String,
          default: "",
        },
        dateAttended: {
          type: String,
          default: "",
        },
        Faculty: {
          type: String,
          default: "",
        },
        department: {
          type: String,
          default: "",
        },
      },
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const ProfileModel = model("Profile", ProfileSchema);

module.exports = { ProfileModel };
