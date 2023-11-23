import express from 'express';
import {
  activateUser,
  registerUser,
  userLogin,
  userLogout,
} from '../controller/user.controller';
import {
  authRole,
  getUserInfo,
  isAuthenticated,
  socialAuth,
  updateAccessToken,
  updateUserInfo,
  updateUserPassword,
} from '../middleware/auth';
const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', userLogin);
userRouter.get('/logout', isAuthenticated, userLogout);
// userRouter.get('/logout', isAuthenticated, authRole("admin"), userLogout);
userRouter.get('/refresh-token', updateAccessToken);
userRouter.get('/me', isAuthenticated, getUserInfo);
userRouter.post('/social-auth', socialAuth);
userRouter.post('/update-profile', isAuthenticated, updateUserInfo);
userRouter.put('/update-password', isAuthenticated, updateUserPassword);

export default userRouter;
