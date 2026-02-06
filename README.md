# Telegram Joke Bot 

A robust Telegram bot that delivers jokes to users at configurable intervals. Built with Node.js, TypeScript, Express, MongoDB, and Telegram Bot API.

## Overview

The Telegram Joke Bot is a full-stack application that manages user subscriptions and automatically delivers jokes on a schedule. Users can enable/disable joke delivery, customize the frequency of incoming jokes (1-1440 minutes), and check their current settings.

## Features

✨ **Core Features:**
- 🤖 Telegram bot that responds to commands
- 📅 Automatic joke scheduling at user-defined intervals
- 💾 MongoDB persistence for user preferences
- ⚙️ Configurable joke delivery frequency (1 to 1440 minutes)
- 🔄 Enable/disable joke delivery on demand
- ✅ Health check and status endpoints
- 📊 Real-time active schedules monitoring

✅ **User Commands:**
- `/start` - Initialize bot and create user account
- `/enable` - Resume joke delivery
- `/disable` - Pause joke delivery
- `/frequency <n>` - Set delivery interval (1-1440 minutes)
- `/status` - View current settings and last joke sent
- `/help` - Display available commands

## Technologies Used

### Backend Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| **Node.js** | Runtime environment | Latest |
| **TypeScript** | Type-safe JavaScript | ^5.2.2 |
| **Express** | Web server framework | ^4.18.2 |
| **MongoDB** | NoSQL database | Cloud Atlas |
| **Mongoose** | MongoDB ODM | ^7.6.3 |
| **node-telegram-bot-api** | Telegram bot SDK | ^0.63.0 |
| **node-cron** | Job scheduling | ^3.0.3 |
| **axios** | HTTP client | ^1.6.0 |
| **dotenv** | Environment variables | ^16.3.1 |

### Development Tools
- **ts-node** - TypeScript execution for Node.js
- **Mocha/Jest** - Testing frameworks (ready for integration)
- **ESLint/Prettier** - Code quality tools (recommended)

## Project Structure

```
telegram-joke-bot/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection setup
│   ├── models/
│   │   └── User.ts              # Mongoose User schema & interface
│   ├── services/
│   │   ├── JokeService.ts       # Fetch & format jokes from external API
│   │   ├── JokeScheduler.ts     # Cron-based scheduling system
│   │   ├── TelegramBotService.ts# Telegram bot command handlers
│   │   └── UserService.ts       # User CRUD operations
│   └── index.ts                 # Application entry point & Express setup
├── types/
│   └── node-telegram-bot-api.d.ts # TypeScript declarations for telegram API
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Prerequisites

Before running the application, ensure you have:

- **Node.js** (v16 or higher)
- **npm** or **pnpm** package manager
- **MongoDB Atlas** account (Cloud database)
- **Telegram Bot Token** (from @BotFather on Telegram)

### Getting Telegram Bot Token

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts to create a new bot
4. Copy the token provided (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### MongoDB Setup

1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and database user
3. Get connection string: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>`

## Installation & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd telegram-joke-bot
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# MongoDB Configuration
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Build TypeScript
```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Running the Application

### Development Mode (with hot reload)
```bash
npm run dev
```
Runs with **ts-node** - TypeScript compiles on-the-fly.

### Production Mode
```bash
npm run build
npm start
```
Compiles TypeScript, then runs the compiled JavaScript.

### Type Checking
```bash
npm run type-check
```
Validates TypeScript without compiling.

## API Endpoints

### Health Check
```
GET /health
Response: 
{
  "status": "healthy",
  "timestamp": "2026-02-06T12:00:00.000Z",
  "activeSchedules": 42
}
```

### Server Status
```
GET /status
Response:
{
  "bot": "running",
  "scheduler": "running",
  "activeUsers": 42,
  "timestamp": "2026-02-06T12:00:00.000Z"
}
```

## Architecture & Components

### 1. **TelegramBotService**
- Handles all Telegram bot interactions
- Processes `/start`, `/enable`, `/disable`, `/frequency`, `/status`, `/help` commands
- Manages message sending to users
- Error handling and logging

### 2. **JokeScheduler**
- Uses `node-cron` to schedule joke delivery
- Maintains active schedules for each user
- Dynamically creates/updates/cancels cron jobs
- Integrates with JokeService for content

### 3. **JokeService**
- Fetches random jokes from Official Joke API
- Formats jokes for readability
- Error handling for API failures
- Caches formatted jokes (recommended for improvement)

### 4. **UserService**
- CRUD operations for user management
- Validates frequency range (1-1440 minutes)
- Tracks last joke sent timestamp
- Fetches all enabled users for scheduling

### 5. **Database Layer**
- MongoDB Atlas cloud database
- Mongoose schemas with TypeScript types
- Indexed chatId for fast lookups
- Timestamps for auditing (createdAt, updatedAt)

## Testing Guide

### 1. Manual Testing via Telegram
Start the bot and interact directly:
```bash
npm run dev
```
Open Telegram and search for your bot → Send commands

### 2. Test Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| User Registration | Send `/start` | User created in DB, welcome message |
| Enable Jokes | Send `/enable` | Confirmation message, scheduler starts |
| Set Frequency | Send `/frequency 5` | Joke scheduled every 5 minutes |
| Disable Jokes | Send `/disable` | Confirmation, scheduler paused |
| Check Status | Send `/status` | Display frequency, last joke time |
| Invalid Frequency | Send `/frequency 2000` | Error: must be 1-1440 |
| Get Help | Send `/help` | List all commands |

### 3. HTTP Endpoint Testing
Using curl or Postman:
```bash
# Health check
curl http://localhost:3000/health

# Server status
curl http://localhost:3000/status
```

### 4. Database Validation
Connect to MongoDB Atlas and verify:
- Users collection created
- Documents have correct structure
- Timestamps updated correctly

## Development Workflow

### Code Organization Best Practices
1. **Services** - Business logic separated from controllers
2. **Models** - Database schemas with TypeScript interfaces
3. **Config** - Centralized configuration management
4. **Error Handling** - Try-catch blocks with logging
5. **Types** - Full TypeScript coverage for type safety

### Logging
All services include structured logging:
```
[TelegramBot] User started bot: 123456
[JokeScheduler] Scheduled jokes for user 123456 every 5 minutes
[JokeService] Fetched random joke successfully
```

### Database Transactions
For future improvements, consider MongoDB transactions when:
- Updating user + scheduling in one operation
- Batch enabling/disabling users
- Maintaining consistency across operations

## Future Improvements with BullMQ

**BullMQ** is a Node.js library for queue processing and job scheduling. Below are recommended improvements:

### 1. **Replace node-cron with BullMQ Job Queues**
```typescript
// Current: node-cron (in-memory scheduling)
// Problem: Loses schedules on server restart, not scalable

// Improvement: BullMQ with Redis
import { Queue } from 'bullmq';

const jokeQueue = new Queue('jokes', { connection: redisConnection });

// Schedule recurring jobs with persistence
await jokeQueue.add(
  'send-joke',
  { chatId: 123456 },
  { repeat: { pattern: '*/5 * * * *' } } // Every 5 minutes
);
```

### 2. **Resilient Joke Delivery**
```typescript
// Current: Synchronous, no retry logic
// Improvement: BullMQ with automatic retries and exponential backoff

jokeQueue.process(async (job) => {
  try {
    await sendJokeToUser(job.data.chatId);
  } catch (error) {
    throw error; // BullMQ will retry automatically
  }
});

// Configuration: 3 retries with exponential backoff
await jokeQueue.add(
  'send-joke',
  { chatId: 123456 },
  { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
);
```

### 3. **Background Job Processing**
```typescript
// Separate long-running tasks from request handling
// Example: Bulk user operations, analytics, cleanup

const bulkQueue = new Queue('bulk-operations', { connection: redis });

// Queue bulk enable/disable operations
bulkQueue.add('bulk-enable', { userIds: [...] });
bulkQueue.add('bulk-disable', { userIds: [...] });
```

### 4. **Monitoring & Observability**
```typescript
// Real-time job monitoring
jokeQueue.on('completed', (job) => {
  console.log(`Joke delivered to user ${job.data.chatId}`);
});

jokeQueue.on('failed', (job, err) => {
  console.error(`Failed to deliver joke: ${err.message}`);
});

// Dashboard access via BullMQ UI
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({ queues: [jokeQueue], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());
```

### 5. **Distributed Architecture Support**
```typescript
// Current: Single server, all jobs in memory
// Improvement: Scale to multiple servers with Redis

// Benefits:
// - Jobs persist in Redis
// - Multiple workers process jobs
// - High availability and fault tolerance
// - Load balancing across servers

const worker = new Worker('jokes', jobProcessor, {
  connection: redisConnection,
  concurrency: 10 // Process 10 jokes simultaneously
});
```

### 6. **Priority-Based Delivery**
```typescript
// Different priority levels for different user tiers
await jokeQueue.add(
  'send-joke',
  { chatId: 123456, tier: 'premium' },
  { priority: 1 } // High priority for premium users
);

await jokeQueue.add(
  'send-joke',
  { chatId: 654321, tier: 'free' },
  { priority: 5 } // Lower priority for free users
);
```

### 7. **Scheduled Cleanup Jobs**
```typescript
// Remove old user data, unused schedules
const cleanupQueue = new Queue('maintenance', { connection: redis });

await cleanupQueue.add(
  'cleanup-old-users',
  { olderThanDays: 90 },
  { repeat: { pattern: '0 2 * * *' } } // 2 AM daily
);
```

### Installation (When Ready)
```bash
npm install bullmq redis
```

### Setup Redis
```bash
# Docker
docker run -d -p 6379:6379 redis:latest

# Or use Redis Cloud (free tier available)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not responding | Check `TELEGRAM_BOT_TOKEN` in `.env` |
| MongoDB connection fails | Verify connection string and IP whitelist |
| Jokes not scheduled | Check user is enabled and frequency is valid (1-1440) |
| TypeScript errors | Run `npm install` and clear node_modules if needed |
| Port 3000 in use | Change `PORT` in `.env` or kill process on port |

## Contributing

1. Create a feature branch
2. Commit changes with clear messages
3. Push and submit a pull request
4. Ensure TypeScript validation passes (`npm run type-check`)
5. Code follows project structure conventions

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check this README
- Review TypeScript errors carefully
- Check MongoDB connection string
- Verify Telegram bot token validity

---

**Last Updated:** February 2026  
**Version:** 1.0.0
