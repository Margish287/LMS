import { NextFunction, Request, Response } from "express";

export const catchAsyncError =
  (func: any) => (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(func(request, response, next)).catch(next);
  };
