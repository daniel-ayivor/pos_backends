#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 POS Backend Setup Script');
console.log('============================\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      runSetup();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  runSetup();
}

function runSetup() {
  console.log('\n📝 Environment Configuration');
  console.log('Please provide the following information:\n');

  const questions = [
    {
      name: 'PORT',
      question: 'Server port (default: 5000): ',
      default: '5000'
    },
    {
      name: 'DB_HOST',
      question: 'Database host (default: localhost): ',
      default: 'localhost'
    },
    {
      name: 'DB_PORT',
      question: 'Database port (default: 5432): ',
      default: '5432'
    },
    {
      name: 'DB_NAME',
      question: 'Database name (default: pos_database): ',
      default: 'pos_database'
    },
    {
      name: 'DB_USER',
      question: 'Database user (default: postgres): ',
      default: 'postgres'
    },
    {
      name: 'DB_PASSWORD',
      question: 'Database password: ',
      default: ''
    },
    {
      name: 'JWT_SECRET',
      question: 'JWT secret (press enter for auto-generate): ',
      default: generateJWTSecret()
    },
    {
      name: 'CORS_ORIGIN',
      question: 'CORS origin (default: http://localhost:3000): ',
      default: 'http://localhost:3000'
    }
  ];

  let currentQuestion = 0;
  const answers = {};

  function askQuestion() {
    if (currentQuestion >= questions.length) {
      createEnvFile(answers);
      return;
    }

    const q = questions[currentQuestion];
    rl.question(q.question, (answer) => {
      answers[q.name] = answer.trim() || q.default;
      currentQuestion++;
      askQuestion();
    });
  }

  askQuestion();
}

function generateJWTSecret() {
  return require('crypto').randomBytes(64).toString('hex');
}

function createEnvFile(answers) {
  const envContent = `# Server Configuration
PORT=${answers.PORT}
NODE_ENV=development

# Database Configuration
DB_HOST=${answers.DB_HOST}
DB_PORT=${answers.DB_PORT}
DB_NAME=${answers.DB_NAME}
DB_USER=${answers.DB_USER}
DB_PASSWORD=${answers.DB_PASSWORD}

# JWT Configuration
JWT_SECRET=${answers.JWT_SECRET}
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=${answers.CORS_ORIGIN}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
`;

  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ .env file created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Create PostgreSQL database: createdb pos_database');
  console.log('3. Run migrations: npm run migrate');
  console.log('4. Start the server: npm run dev');
  console.log('\n🔗 Health check: http://localhost:' + answers.PORT + '/health');
  
  rl.close();
} 