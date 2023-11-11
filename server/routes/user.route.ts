import express from 'express';
import {
  activateUser,
  registerUser,
  userLogin,
  userLogout,
} from '../controller/user.controller';
const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', userLogin);
userRouter.get('/logout', userLogout);

export default userRouter;
