import { Response } from 'express';
import userModel from '../models/user.model';

// get user by ID
export const getUserById = async (userId: string, response: Response) => {
  const user = await userModel.findById(userId);
  response.status(200).json({
    success: true,
    user,
  });
};
