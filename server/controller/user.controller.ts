require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import userModel, { IUser } from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';
import { catchAsyncError } from '../middleware/catchAsyncError';
import jwt, { Secret } from 'jsonwebtoken';
import ejs from 'ejs';
import path from 'path';
import { sendMail } from '../utils/sendMail';

interface UserRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerUser = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, email, password } = request.body;
      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        // show error when user is already exist
        return next(new ErrorHandler('Email already exists', 400));
      }

      const user: UserRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user); // {token, code}
      const data = {
        username: user.name,
        activationCode: activationToken.activationCode,
      };

      const html = await ejs.renderFile(
        path.join(__dirname, '../mails/activation-mail.ejs'),
        data
      );

      try {
        await sendMail({
          email,
          subject: 'Activate your account',
          template: 'activation-mail.ejs',
          data,
        });

        response.status(200).json({
          success: true,
          message: `Please check your email ${user.email}`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface UserActivationToken {
  token: String;
  activationCode: String;
}

// NOTE: if anything goes wrong in type then check this type of use in param
export const createActivationToken = (
  user: UserRegistrationBody
): UserActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: '5m' }
  );

  return {
    activationCode,
    token,
  };
};

// activate user
interface userActivation {
  activationToken: string;
  activationCode: string;
}

export const activateUser = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { activationCode, activationToken } =
        request.body as userActivation;

      const newUser = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET as string
      ) as {
        user: UserRegistrationBody;
        activationCode: string;
      };

      if (newUser.activationCode !== activationCode) {
        return next(new ErrorHandler('Invalid activation code.', 400));
      }

      const { email, name, password, avatar } = newUser.user;
      const existUser = await userModel.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler('Email already exist', 400));
      }

      const user = await userModel.create({
        name,
        email,
        password,
      });
      response.status(201).json({
        success: true,
        message: 'User Activated Successfully',
      });
    } catch (error) {}
  }
);
