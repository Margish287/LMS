import { Response } from 'express';
import userModel from '../models/user.model';
import { redis } from '../utils/redis';

// get user by ID
export const getUserById = async (userId: string, response: Response) => {
  // const user = await userModel.findById(userId);
  const userStr = await redis.get(userId);
  if (userStr) {
    const user = JSON.parse(userStr as string);
    response.status(200).json({
      success: true,
      user,
    });
  }
};
