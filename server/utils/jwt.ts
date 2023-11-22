require('dotenv').config();
import { IUser } from '../models/user.model';
import { redis } from './redis';
import { Response } from 'express';

interface TokenOption {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none' | undefined;
  secure?: boolean;
}

// parse env variable
const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || '300',
  10
);
const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || '300',
  10
);

// cookies
export const accessTokenOptions: TokenOption = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
};
export const refreshTokenOptions: TokenOption = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
};

export const sendToken = (
  user: IUser,
  statusCode: number,
  response: Response
) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // upload this to redis
  redis.set(user._id, JSON.stringify(user) as any);
  // set secure to true in only production
  if (process.env.NODE_ENV === 'production') {
    accessTokenOptions.secure = true;
  }

  response.cookie('access_token', accessToken, accessTokenOptions);
  response.cookie('refresh_token', refreshToken, refreshTokenOptions);

  response.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
