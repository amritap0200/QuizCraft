const express = require('express');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const auth = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to routes that need it
router.use(auth);

// Debug logging for quiz routes
router.use((req, res, next) => {
  console.log(`Quiz API: ${req.method} ${req.path}`, {
    user: req.user?._id,
    query: req.query,
    body: req.method === 'POST' ? { ...req.body, questions: req.body.questions ? '[...]' : 'none' } : null
  });
  next();
});

// Get all public quizzes with filters
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 10, myQuizzes } = req.query;
    
    let filter = { isPublic: true };
    
    // If myQuizzes is true, show only user's quizzes
    if (myQuizzes === 'true') {
      filter = { createdBy: req.user._id };
    }
    
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Quiz filter:', filter);
    const quizzes = await Quiz.find(filter)
      .populate('createdBy', 'username profile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Quiz.countDocuments(filter);

    console.log(`Found ${quizzes.length} quizzes out of ${total} total`);
    res.json({
      quizzes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single quiz - allow public access or owner access
router.get('/:id', async (req, res) => {
  try {
    console.log('Fetching single quiz:', req.params.id);
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'username profile');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is public OR user is the owner
    const isOwner = req.user && quiz.createdBy._id.toString() === req.user._id.toString();
    
    console.log('Quiz visibility check:', {
      isPublic: quiz.isPublic,
      isOwner: isOwner,
      quizOwner: quiz.createdBy._id.toString(),
      currentUser: req.user._id.toString()
    });
    
    if (!quiz.isPublic && !isOwner) {
      return res.status(403).json({ message: 'Access denied. This quiz is private.' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error fetching single quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz
router.post('/', async (req, res) => {
  try {
    console.log('Creating quiz for user:', req.user._id);
    const quizData = {
      ...req.body,
      createdBy: req.user._id
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    // Update user's quiz count
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'profile.quizzesCreated': 1 }
    });

    // Populate the createdBy field before sending response
    await quiz.populate('createdBy', 'username profile');

    console.log('Quiz created successfully:', quiz._id);
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Quiz creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's own quizzes
router.get('/user/my-quizzes', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    console.log('Fetching user quizzes for:', req.user._id);
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .populate('createdBy', 'username profile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Quiz.countDocuments({ createdBy: req.user._id });

    console.log(`Found ${quizzes.length} user quizzes out of ${total} total`);
    res.json({
      quizzes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching user quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete quiz - only owner can delete
router.delete('/:id', async (req, res) => {
  try {
    console.log('Delete request for quiz:', req.params.id);
    console.log('User making request:', req.user._id);
    
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log('Quiz owner:', quiz.createdBy.toString());
    console.log('Request user:', req.user._id.toString());

    // Check if user is the owner
    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own quizzes.' });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    
    // Update user's quiz count
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'profile.quizzesCreated': -1 }
    });

    console.log('Quiz deleted successfully');
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start quiz attempt
router.post('/:id/attempt', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is public or user is the owner
    const isOwner = quiz.createdBy.toString() === req.user._id.toString();
    
    if (!quiz.isPublic && !isOwner) {
      return res.status(403).json({ message: 'Access denied. This quiz is private.' });
    }

    // Check max attempts
    const attemptCount = await QuizAttempt.countDocuments({
      user: req.user._id,
      quiz: quiz._id
    });

    if (attemptCount >= quiz.maxAttempts) {
      return res.status(400).json({ message: 'Maximum attempts reached' });
    }

    const attempt = new QuizAttempt({
      user: req.user._id,
      quiz: quiz._id,
      totalQuestions: quiz.questions.length,
      answers: []
    });

    await attempt.save();

    // Return quiz without correct answers
    const quizForAttempt = {
      ...quiz.toObject(),
      questions: quiz.questions.map(q => ({
        ...q.toObject(),
        correctAnswer: undefined
      }))
    };

    res.json({
      attemptId: attempt._id,
      quiz: quizForAttempt,
      timeLimit: quiz.timeLimit
    });
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit answer
router.post('/:id/answer', async (req, res) => {
  try {
    const { attemptId, questionIndex, selectedOption, timeTaken } = req.body;
    
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      user: req.user._id,
      completed: false
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found or completed' });
    }

    const quiz = await Quiz.findById(req.params.id);
    const question = quiz.questions[questionIndex];
    const isCorrect = selectedOption === question.correctAnswer;

    // Update or add answer
    const existingAnswerIndex = attempt.answers.findIndex(
      a => a.questionIndex === questionIndex
    );

    if (existingAnswerIndex !== -1) {
      attempt.answers[existingAnswerIndex] = {
        questionIndex,
        selectedOption,
        isCorrect,
        timeTaken
      };
    } else {
      attempt.answers.push({
        questionIndex,
        selectedOption,
        isCorrect,
        timeTaken
      });
    }

    await attempt.save();
    res.json({ isCorrect, correctAnswer: question.correctAnswer });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete attempt
router.post('/:id/complete', async (req, res) => {
  try {
    const { attemptId, timeSpent } = req.body;

    const attempt = await QuizAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        user: req.user._id,
        completed: false
      },
      {
        completed: true,
        timeSpent,
        completedAt: new Date()
      },
      { new: true }
    ).populate('user', 'username profile')
     .populate('quiz', 'title category difficulty');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Calculate final score
    let score = 0;
    attempt.answers.forEach(answer => {
      if (answer.isCorrect) {
        const question = attempt.quiz.questions[answer.questionIndex];
        score += question.points || 10;
      }
    });

    const totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0);
    const percentage = Math.round((score / totalPoints) * 100);

    attempt.score = percentage;
    attempt.correctAnswers = attempt.answers.filter(a => a.isCorrect).length;
    await attempt.save();

    // Update quiz stats
    await Quiz.findByIdAndUpdate(req.params.id, {
      $inc: { 'stats.totalAttempts': 1 },
      $set: {
        'stats.averageScore': await calculateAverageScore(req.params.id),
        'stats.bestScore': await calculateBestScore(req.params.id)
      }
    });

    // Update user stats
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        'profile.quizzesTaken': 1,
        'profile.score': percentage 
      }
    });

    res.json(attempt);
  } catch (error) {
    console.error('Error completing attempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper functions
async function calculateAverageScore(quizId) {
  const result = await QuizAttempt.aggregate([
    { $match: { quiz: require('mongoose').Types.ObjectId(quizId), completed: true } },
    { $group: { _id: null, averageScore: { $avg: '$score' } } }
  ]);
  return result.length > 0 ? result[0].averageScore : 0;
}

async function calculateBestScore(quizId) {
  const result = await QuizAttempt.aggregate([
    { $match: { quiz: require('mongoose').Types.ObjectId(quizId), completed: true } },
    { $group: { _id: null, bestScore: { $max: '$score' } } }
  ]);
  return result.length > 0 ? result[0].bestScore : 0;
}

module.exports = router;