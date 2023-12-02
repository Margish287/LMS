import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import { catchAsyncError } from './catchAsyncError';
import ErrorHandler from '../utils/ErrorHandler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { redis } from '../utils/redis';
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from '../utils/jwt';
import { getUserById } from '../services/user.service';
import userModel from '../models/user.model';

export const isAuthenticated = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    const accessToken = request.cookies.access_token;

    if (!accessToken) {
      return next(new ErrorHandler('Please login to access!', 400));
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;
    if (!decoded) {
      return next(new ErrorHandler('Access token is not valid', 400));
    }

    const user = await redis.get(decoded.id);
    if (!user) {
      return next(new ErrorHandler('User not found !', 400));
    }

    request.user = JSON.parse(user);
    next();
  }
);

// validate role
export const authRole = (...roles: string[]) => {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!roles.includes(request.user?.role || '')) {
      return next(new ErrorHandler('Invalid Role', 400));
    }

    next();
  };
};

// update access token
export const updateAccessToken = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const ref_token = request.cookies.refresh_token as string;
      const decoded = jwt.verify(
        ref_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      if (!decoded) {
        return next(new ErrorHandler('could not refresh the token', 400));
      }

      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandler('could not refresh the token', 400));
      }

      const user = await JSON.parse(session);
      const access_token = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: '5m' }
      );

      const refresh_token = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: '7d' }
      );

      response.cookie('access_token', access_token, accessTokenOptions);
      response.cookie('refresh_token', refresh_token, refreshTokenOptions);
      response.status(200).json({
        success: true,
        message: 'Access token updated successfully.',
        access_token,
      });
    } catch (error) {}
  }
);

export const getUserInfo = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = request.user?._id;
      getUserById(userId, response);
    } catch (error: any) {
      next(new ErrorHandler(error.message, 400));
    }
  }
);

interface SocialAuthBody {
  name: string;
  email: string;
  avatar: string;
}

// social media auth
export const socialAuth = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email, avatar, name } = request.body as SocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({ email, avatar, name });
        sendToken(newUser, 200, response);
      } else {
        sendToken(user, 200, response);
      }
    } catch (error: any) {
      next(new ErrorHandler(error.message, 400));
    }
  }
);

interface UpdateUserInfo {
  email: string;
  name: string;
}

export const updateUserInfo = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, email } = request.body as UpdateUserInfo;
      const userId = request.user?._id;
      const user = await userModel.findById(userId);

      if (user && email) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler('Email already exist.', 400));
        }

        user.email = email;
      }

      if (user && name) {
        user.name = name;
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user));

      response.status(201).json({
        success: true,
        message: 'Updated successfully',
        user,
      });
    } catch (error: any) {
      next(new ErrorHandler(error.message, 400));
    }
  }
);

interface UpdateUserPassword {
  oldPassword: string;
  newPassword: string;
}

export const updateUserPassword = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = request.body as UpdateUserPassword;
      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler('Please enter old/new password', 400));
      }

      const user = await userModel
        .findById(request.user?._id)
        .select('+password');
      // console.log(user);

      if (user?.password === undefined) {
        // NOTE: if user is log in from the social-auth then they dont have to password
        return next(new ErrorHandler('Invalid user', 400));
      }

      const isPasswordCorrect = await user.comparePassword(oldPassword);
      if (!isPasswordCorrect) {
        return next(new ErrorHandler('Invalid password.', 400));
      }

      user.password = newPassword;

      await user.save(); // update user to database
      await redis.set(request.user?._id, JSON.stringify(user)); // update the user to redis

      response.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      next(new ErrorHandler(error.message, 400));
    }
  }
);

interface UpdateUserProfilePic {
  avatar: string;
}

export const updateUserProfilePic = catchAsyncError(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { avatar } = request.body as UpdateUserProfilePic;
      const userId = request?.user?._id;
      const user = await userModel.findById(userId);

      if (avatar && user) {
        // for social-auth, dont have the public_id in that case we just have to upload the image to cloudinary
        if (user?.avatar.public_id) {
          // delete old avatar
          await cloudinary.v2.uploader.destroy(user.avatar.public_id);

          // upload new avatar
          const myUploadedAvatar = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
          });

          user.avatar = {
            public_id: myUploadedAvatar.public_id,
            url: myUploadedAvatar.secure_url,
          };
        } else {
          const myUploadedAvatar = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
          });

          user.avatar = {
            public_id: myUploadedAvatar.public_id,
            url: myUploadedAvatar.secure_url,
          };
        }
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user));

      response.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      next(new ErrorHandler(error.message, 400));
    }
  }
);

// export const  = catchAsyncError(
//   async (request: Request, response: Response, next: NextFunction) => {
//     try {
//     } catch (error: any) {
//       next(new ErrorHandler(error.message, 400));
//     }
//   }
// );
