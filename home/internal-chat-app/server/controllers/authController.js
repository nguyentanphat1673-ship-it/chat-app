const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const generateUniqueUserId = async () => {
  let user_id;
  let userExists = true;
  while (userExists) {
    user_id = `user_${Math.floor(1000 + Math.random() * 90000)}`;
    const existingUser = await User.findOne({ user_id });
    if (!existingUser) {
      userExists = false;
    }
  }
  return user_id;
};

const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email đã tồn tại." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id = await generateUniqueUserId();

    const user = await User.create({
      email,
      password: hashedPassword,
      user_id,
    });

    res.status(201).json({
      message: "Đăng ký thành công!",
      _id: user._id,
      email: user.email,
      user_id: user.user_id,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server." });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        email: user.email,
        user_id: user.user_id,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server." });
  }
};

const logoutUser = (req, res) => {
  res.status(200).json({ message: "Đăng xuất thành công." });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
};

