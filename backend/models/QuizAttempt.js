const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean,
    timeTaken: Number // in seconds
  }],
  score: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate score before saving
attemptSchema.pre('save', function(next) {
  if (this.answers.length > 0) {
    this.correctAnswers = this.answers.filter(answer => answer.isCorrect).length;
    this.score = (this.correctAnswers / this.totalQuestions) * 100;
  }
  next();
});

module.exports = mongoose.model('QuizAttempt', attemptSchema);