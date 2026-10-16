/* ============================================
   FILE: server.js
   LOCATION: backend/ folder
   ============================================ */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ============ USER MODEL ============
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

const User = mongoose.model('User', userSchema);

// ============ APPLICATION MODEL ============
const applicationSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  program: String,
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  appliedDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Application = mongoose.model('Application', applicationSchema);

// ============ AUTH MIDDLEWARE ============
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role: role || 'student' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', protect, (req, res) => {
  res.json({
    success: true,
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }
  });
});

// ============ APPLICATION ROUTES ============

// Submit application
app.post('/api/applications', protect, async (req, res) => {
  try {
    const application = await Application.create({
      ...req.body,
      user: req.user._id
    });
    res.status(201).json({ success: true, application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get my applications
app.get('/api/applications/my', protect, async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user._id }).sort({ appliedDate: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all applications (admin only)
app.get('/api/applications', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const applications = await Application.find()
      .sort({ appliedDate: -1 })
      .populate('user', 'name email');
    res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ CONTACT ROUTE ============
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log('📩 Contact form:', { name, email, subject, message });
  res.json({ success: true, message: 'Message received' });
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Shining Star College API running' });
});

// ============ 404 ============
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    const adminExists = await User.findOne({ email: 'admin@shiningstar.edu' });
    if (!adminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@shiningstar.edu',
        password: 'Admin@123',
        role: 'admin'
      });
      console.log('👤 Admin created: admin@shiningstar.edu / Admin@123');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB Error:', err));
