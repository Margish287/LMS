import { Request, Response, NextFunction } from 'express';
import { catchAsyncError } from './catchAsyncError';
import ErrorHandler from '../utils/ErrorHandler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { redis } from '../utils/redis';

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
