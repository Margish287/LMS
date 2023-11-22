require('dotenv').config();
import mongoose, { Document, Schema, Model, Mongoose } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const emailRegex: RegExp = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,5})?$/;

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: { public_id: string; url: string };
  role: string;
  isVerified: boolean;
  courses: Array<{ courseId: string }>;
  comparePassword: (password: string) => Promise<boolean>; // Promise which must return a boolean value after it resolves can be written as Promise<Boolean>
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please enter your name'] },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      validate: {
        validator: function (emailVal: string) {
          return emailRegex.test(emailVal);
        },
      },
      unique: true,
    },
    password: {
      type: String,
      // required: [true, 'Please enter your password'],
      select: false,
      minlength: [6, 'Password must be at least 6 characters'],
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      default: 'user',
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

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.SignAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || '', {
    expiresIn: '5m',
  });
};

userSchema.methods.SignRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || '', {
    expiresIn: '7d',
  });
};

userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

const userModel: Model<IUser> = mongoose.model('User', userSchema);
export default userModel;
