import mongoose, { Document, Schema, Model, Mongoose } from "mongoose";
import bcrypt from "bcryptjs";
import { NextFunction } from "express";
import { x } from "joi";

const emailRegex: RegExp = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,5})?$/;

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: { public_id: string; url: string };
  role: string;
  isVerified: boolean;
  courses: Array<{ courseId: string }>;
  comparePassword: (password: string) => Promise<boolean>;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Please enter your name"] },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      validate: {
        validator: function (emailVal: string) {
          return emailRegex.test(emailVal);
        },
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      select: false,
      minlength: [6, "Password must be at least 6 characters"],
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        courseId: String,
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

const userModel: Model<IUser> = mongoose.model("User", userSchema);
export default userModel;