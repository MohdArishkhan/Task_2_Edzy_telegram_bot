# Telegram Joke Bot 

A robust, enterprise-grade Telegram bot that delivers jokes to users at configurable intervals. Built with Node.js, TypeScript, Express, MongoDB, Agenda job scheduler, and comprehensive rate limiting.

## Overview

The Telegram Joke Bot is a production-ready application that manages user subscriptions and automatically delivers jokes on a persistent schedule. Features enterprise-level rate limiting, job persistence across server restarts, and comprehensive debugging capabilities.

## Features

✨ **Core Features:**
- 🤖 Telegram bot with rate-limited command processing
- 📅 Persistent joke scheduling with MongoDB-backed job storage
- 🛡️ Enterprise-grade rate limiting with sliding window algorithm
- 💾 MongoDB persistence for user preferences and job queues
- ⚙️ Configurable joke delivery frequency (1 to 1440 minutes)
- 🔄 Enable/disable joke delivery with automatic job management
- ✅ Health check and status endpoints with rate limiting
- 📊 Real-time job monitoring and debugging capabilities
- 🔄 Server restart resilience - jobs persist across restarts
- ⚡ Concurrent job processing with configurable limits

✅ **User Commands:**
- `/start` - Initialize bot and create user account
- `/enable` - Resume joke delivery with persistent scheduling
- `/disable` - Pause joke delivery and cancel active jobs
- `/frequency <n>` - Set delivery interval (1-1440 minutes)
- `/status` - View current settings and last joke sent
- `/test` - Get an immediate joke for testing
- `/jobstatus` - View job queue status (debugging)
- `/help` - Display available commands

🛡️ **Rate Limiting Features:**
- Telegram command rate limiting (5 requests per 5 seconds per user)
- API endpoint protection (30 requests per minute per IP)
- Sliding window algorithm for accurate rate calculation
- Automatic cleanup of expired rate limit data
- Configurable rate limits per endpoint and command type

## Technologies Used

### Backend Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| **Node.js** | Runtime environment | Latest |
| **TypeScript** | Type-safe JavaScript | ^5.2.2 |
| **Express** | Web server framework | ^4.18.2 |
| **MongoDB** | NoSQL database | Cloud Atlas |
| **Mongoose** | MongoDB ODM | ^7.6.3 |
| **Agenda** | MongoDB-based job scheduler | ^5.0.0 |
| **node-telegram-bot-api** | Telegram bot SDK | ^0.63.0 |
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
│   │   ├── database.ts              # MongoDB connection setup
│   │   └── rateLimitConfig.ts       # Rate limiting configuration
│   ├── models/
│   │   └── User.ts                  # Mongoose User schema & interface
│   ├── services/
│   │   ├── AgendaScheduler.ts       # MongoDB-backed persistent job scheduler
│   │   ├── JokeService.ts           # Fetch & format jokes from external API
│   │   ├── JokeScheduler.ts         # Wrapper around AgendaScheduler
│   │   ├── TelegramBotService.ts    # Rate-limited Telegram bot handlers
│   │   └── UserService.ts           # User CRUD operations
│   ├── utils/
│   │   ├── RateLimiter.ts           # Core rate limiting engine
│   │   ├── RateLimiterManager.ts    # Centralized rate limiter management
│   │   └── rateLimitMiddleware.ts   # Express rate limiting middleware
│   └── index.ts                     # Application entry point & Express setup
├── types/
│   └── node-telegram-bot-api.d.ts   # TypeScript declarations for telegram API
├── .env                             # Environment variables (not in git)
├── .env.example                     # Environment template
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
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
- Handles all Telegram bot interactions with rate limiting
- Processes `/start`, `/enable`, `/disable`, `/frequency`, `/status`, `/test`, `/jobstatus`, `/help` commands
- Rate-limited command processing (5 requests per 5 seconds per user)
- Manages message sending to users with error handling
- Integrated with AgendaScheduler for job management

### 2. **AgendaScheduler**
- MongoDB-backed persistent job scheduler using Agenda
- Jobs survive server restarts and crashes
- Configurable job processing (every 10 seconds)
- Automatic duplicate job prevention
- Event-driven job monitoring and error handling
- Supports up to 20 concurrent job executions

### 3. **JokeScheduler**
- Wrapper around AgendaScheduler maintaining API compatibility
- Handles job lifecycle management (create, update, cancel)
- Integrates with UserService for enabled user management
- Provides testing and debugging capabilities

### 4. **Rate Limiting System**
- **RateLimiter**: Sliding window algorithm implementation
- **RateLimiterManager**: Centralized management of multiple rate limiters
- **rateLimitMiddleware**: Express middleware for API protection
- **rateLimitConfig**: Configurable limits per endpoint and command
- Automatic memory cleanup and optimization

### 5. **JokeService**
- Fetches random jokes from Official Joke API
- Formats jokes for readability
- Error handling for API failures
- Consistent joke delivery format

### 6. **UserService**
- CRUD operations for user management
- Validates frequency range (1-1440 minutes)
- Tracks last joke sent timestamp
- Fetches all enabled users for scheduling

### 5. **Database Layer**
- MongoDB Atlas cloud database with two collections:
  - **users**: User preferences and settings
  - **agenda_jobs**: Persistent job storage for scheduling
- Mongoose schemas with TypeScript types
- Indexed chatId for fast lookups
- Automatic job recovery on server restart
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
| Enable Jokes | Send `/enable` | Confirmation message, persistent job created |
| Set Frequency | Send `/frequency 5` | Old jobs canceled, new job scheduled every 5 minutes |
| Disable Jokes | Send `/disable` | Confirmation, all jobs canceled |
| Check Status | Send `/status` | Display frequency, last joke time |
| Test Immediate Joke | Send `/test` | Immediate joke delivery |
| Job Status | Send `/jobstatus` | Job queue information in console |
| Rate Limiting | Send 6+ commands quickly | Rate limit error after 5th command |
| Invalid Frequency | Send `/frequency 2000` | Error: must be 1-1440 |
| Get Help | Send `/help` | List all commands including new debug commands |

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
- **users** collection with user documents
- **agenda_jobs** collection with scheduled jobs
- Documents have correct structure and timestamps
- Jobs persist across server restarts
- Rate limiting data automatically cleaned up

## Development Workflow

### Code Organization Best Practices
1. **Services** - Business logic separated from controllers
2. **Models** - Database schemas with TypeScript interfaces  
3. **Config** - Centralized configuration management
4. **Utils** - Reusable utilities (rate limiting, etc.)
5. **Error Handling** - Try-catch blocks with structured logging
6. **Types** - Full TypeScript coverage for type safety

### Rate Limiting Configuration
```typescript
// Configurable rate limits in rateLimitConfig.ts
export const rateLimitConfig = {
  api: {
    health: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
    status: { maxRequests: 30, windowMs: 60000 }   // 30 per minute
  },
  telegram: {
    start: { maxRequests: 5, windowMs: 5000 },     // 5 per 5 seconds
    enable: { maxRequests: 5, windowMs: 5000 },    // 5 per 5 seconds
    // ... other commands
  }
};
```

### Job Persistence
Agenda stores jobs in MongoDB for persistence:
- Jobs survive server crashes and restarts
- Automatic job recovery on application startup
- Configurable job processing intervals (10 seconds)
- Event-driven job monitoring and error handling

### Architecture Benefits
- **Scalability**: Rate limiting prevents abuse
- **Reliability**: Persistent jobs ensure delivery
- **Observability**: Comprehensive logging and monitoring
- **Maintainability**: Clean separation of concerns
- **Type Safety**: Full TypeScript implementation

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not responding | Check `TELEGRAM_BOT_TOKEN` in `.env` |
| MongoDB connection fails | Verify connection string and IP whitelist |
| Jobs not executing | Check MongoDB `agenda_jobs` collection for scheduled jobs |
| Rate limiting issues | Commands limited to 5 per 5 seconds per user |
| Jokes not scheduled | Check user is enabled and frequency is valid (1-1440) |
| TypeScript errors | Run `npm install` and clear node_modules if needed |
| Port 3000 in use | Change `PORT` in `.env` or kill process on port |
| Jobs executing multiple times | Restart server - old jobs should be cleaned up automatically |
| /jobstatus command not working | Check console output for job queue information |

### Debugging Commands
- Use `/test` for immediate joke delivery testing
- Use `/jobstatus` to check job queue in database
- Monitor console logs for job execution events
- Check MongoDB `agenda_jobs` collection directly

### Performance Optimization
- Agenda processes jobs every 10 seconds
- Maximum 20 concurrent job executions
- Rate limiting prevents command spam
- Automatic cleanup of expired rate limit data
- Jobs are automatically retried on failure

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
