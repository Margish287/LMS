import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";

export const errorMiddleware = (
  error: any,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  error.statusCode = error.statusCode || 500;
  error.message = error.message || "Internal Server Error";

  // wrong mongodb id error
  if (error.name === "CastError") {
    const message = "Resourse not found. Invalid " + error.path;
    error = new ErrorHandler(message, 400);
  }

  // duplicate key error
  if (error.code === 11000) {
    const message = `Duplicate ${Object.keys(error.keyValue)} entered`;
    error = new ErrorHandler(message, 400);
  }

  // wrong JWT error
  if (error.name === "JsonWebTokenError") {
    const message = "JSON Web Token is invalid. Try again";
    error = new ErrorHandler(message, 400);
  }

  // JWT expired error
  if (error.name === "TokenExpiredError") {
    const message = "JSON Web Token is expired. Try again";
    error = new ErrorHandler(message, 400);
  }

  response.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};
