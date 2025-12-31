const express = require('express');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const auth = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, profile, preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username, email, profile, preferences },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's quiz attempts
router.get('/attempts', auth, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    const attempts = await QuizAttempt.find({ user: req.user._id })
      .populate('quiz', 'title category difficulty')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await QuizAttempt.countDocuments({ user: req.user._id });

    res.json({
      attempts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific attempt with detailed results
router.get('/attempts/:id', auth, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id)
      .populate('user', 'username profile')
      .populate('quiz');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check if the attempt belongs to the user
    if (attempt.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ attempt, quiz: attempt.quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's created quizzes
router.get('/quizzes', auth, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Quiz.countDocuments({ createdBy: req.user._id });

    res.json({
      quizzes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { category, timeframe = 'all' } = req.query;
    
    let matchStage = {};
    
    // Filter by category if provided
    if (category) {
      const quizzes = await Quiz.find({ category }).select('_id');
      matchStage.quiz = { $in: quizzes.map(q => q._id) };
    }
    
    // Filter by timeframe
    if (timeframe !== 'all') {
      const date = new Date();
      switch (timeframe) {
        case 'week':
          date.setDate(date.getDate() - 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() - 1);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() - 1);
          break;
      }
      matchStage.completedAt = { $gte: date };
    }

    const leaderboard = await QuizAttempt.aggregate([
      { $match: { ...matchStage, completed: true } },
      {
        $group: {
          _id: '$user',
          totalScore: { $sum: '$score' },
          totalQuizzes: { $sum: 1 },
          averageScore: { $avg: '$score' }
        }
      },
      { $sort: { totalScore: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          'user.password': 0,
          'user.email': 0
        }
      }
    ]);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;