// // routes/auth.js
// import bcrypt from "bcryptjs";
// import express from "express";
// import jwt from "jsonwebtoken";
// import User from "../models/user";

// const router = express.Router();

// // 注册
// router.post("/register", async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newUser = new User({ username, password: hashedPassword });
//     await newUser.save();
//     res.status(201).json({ code: 1, message: "User created", data });
//   } catch (error) {
//     res.status(500).json({ code: 0, message: "Error creating user" });
//   }
// });

// // 登录
// router.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const user = await User.findOne({ username });
//     if (!user) {
//       return res.status(400).json({ code: 0, message: "Invalid credentials" });
//     }
//     const isMatch = bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ code: 0, message: "Invalid credentials" });
//     }
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });
//     res.json({ data: { token } });
//   } catch (error) {
//     res.status(500).json({ code: 0, message: "Error logging in" });
//   }
// });

// export default router;
