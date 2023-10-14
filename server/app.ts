require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
export const app = express();
import { errorMiddleware } from "./middleware/error";

// body parser
app.use(express.json({ limit: "50mb" })); // limits the size of the data that can be sent to the server

// cookie parser - if we want to send or receive cookies from front end then we need to use cookie parser
app.use(cookieParser());

// cors - cross origin resource sharing
app.use(cors({ origin: process.env.ORIGIN }));

// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ success: true, message: "API is working !" });
});

// unknown routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`${req.originalUrl} not found :(`) as any;
  err.statusCode = 400;
  next(err);
});

app.use(errorMiddleware);
