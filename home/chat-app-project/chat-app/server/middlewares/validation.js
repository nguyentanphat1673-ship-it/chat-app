/**
 * Validation Middleware
 * Input validation and sanitization
 */

const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateUserInput = (req, res, next) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  // Validate name
  if (name && (name.length < 2 || name.length > 50)) {
    return res.status(400).json({
      success: false,
      message: 'Name must be between 2 and 50 characters',
    });
  }

  // Validate email
  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
    });
  }

  // Validate phone
  if (phone && !validatePhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format',
    });
  }

  // Validate password
  if (password && !validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters',
    });
  }

  // Validate password confirmation
  if (password && confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match',
    });
  }

  next();
};

const validateLoginInput = (req, res, next) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({
      success: false,
      message: 'Login and password are required',
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid password',
    });
  }

  next();
};

const validateMessageInput = (req, res, next) => {
  const { content, recipientId, groupId } = req.body;

  if (!content && !req.file) {
    return res.status(400).json({
      success: false,
      message: 'Message content or file is required',
    });
  }

  if (!recipientId && !groupId) {
    return res.status(400).json({
      success: false,
      message: 'Recipient or group is required',
    });
  }

  next();
};

const validateGroupInput = (req, res, next) => {
  const { name } = req.body;

  if (!name || name.length < 2 || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Group name must be between 2 and 100 characters',
    });
  }

  next();
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  validateUserInput,
  validateLoginInput,
  validateMessageInput,
  validateGroupInput,
};
