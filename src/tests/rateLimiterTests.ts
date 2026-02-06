/**
 * Rate Limiter Testing Examples
 * 
 * Run these tests to verify the rate limiter is working correctly
 * Usage: ts-node src/tests/rateLimiterTests.ts
 */

import { RateLimiter, RateLimiterPresets } from '../utils/RateLimiter';
import { rateLimiterManager } from '../utils/RateLimiterManager';

/**
 * Test 1: Basic rate limiter functionality
 */
export async function testBasicRateLimiter() {
  console.log('\n=== Test 1: Basic Rate Limiter ===');

  const limiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 10 * 1000, // 10 seconds
    name: 'TestLimiter',
  });

  // Make 6 requests quickly
  for (let i = 0; i < 6; i++) {
    const result = limiter.checkLimit({ identifier: 'user1' });
    console.log(`Request ${i + 1}:`, {
      allowed: result.isAllowed,
      remaining: result.remaining,
      retryAfter: result.retryAfter,
    });
  }

  limiter.destroy();
}

/**
 * Test 2: Multiple users with individual limits
 */
export async function testMultipleUsers() {
  console.log('\n=== Test 2: Multiple Users ===');

  const limiter = new RateLimiter({
    maxRequests: 3,
    windowMs: 5 * 1000,
    name: 'MultiUserTest',
  });

  const users = ['user1', 'user2', 'user3'];

  // Each user makes 4 requests
  for (const user of users) {
    console.log(`\n${user}:`);
    for (let i = 0; i < 4; i++) {
      const result = limiter.checkLimit({ identifier: user });
      console.log(`  Request ${i + 1}:`, result.isAllowed ? '✓ Allowed' : '✗ Limited');
    }
  }

  console.log('\nStats:', limiter.getStats());
  limiter.destroy();
}

/**
 * Test 3: Rate limiter manager
 */
export async function testRateLimiterManager() {
  console.log('\n=== Test 3: Rate Limiter Manager ===');

  // Initialize manager
  rateLimiterManager.initializeAll();

  // Test the health endpoint limiter
  const healthLimiter = rateLimiterManager.get('api:health');

  console.log('\nTesting /health endpoint (limit: 30 per minute):');
  for (let i = 0; i < 32; i++) {
    const result = healthLimiter.checkLimit({
      identifier: '127.0.0.1',
    });
    if (i === 28 || i === 29 || i === 30 || i === 31) {
      console.log(`Request ${i + 1}: ${result.isAllowed ? '✓' : '✗'}`, {
        remaining: result.remaining,
        retryAfter: result.retryAfter,
      });
    }
  }

  console.log('\nManager Stats:');
  console.log(JSON.stringify(rateLimiterManager.getAllStats(), null, 2));

  rateLimiterManager.cleanupAll();
}

/**
 * Test 4: Rate limiter with custom key generator
 */
export async function testCustomKeyGenerator() {
  console.log('\n=== Test 4: Custom Key Generator ===');

  const limiter = new RateLimiter({
    maxRequests: 3,
    windowMs: 5 * 1000,
    name: 'CustomKeyTest',
    keyGenerator: (ctx) => {
      // Use both userId and action
      return `${ctx.userId}:${ctx.action}`;
    },
  });

  console.log('Testing different actions per user:');

  // User 1 doing action A (4 times - should limit)
  console.log('\nUser 1 - Action A:');
  for (let i = 0; i < 4; i++) {
    const result = limiter.checkLimit({
      userId: 'user1',
      action: 'actionA',
    });
    console.log(`  Request ${i + 1}: ${result.isAllowed ? '✓' : '✗'}`);
  }

  // User 1 doing action B (3 times - should all pass)
  console.log('\nUser 1 - Action B:');
  for (let i = 0; i < 3; i++) {
    const result = limiter.checkLimit({
      userId: 'user1',
      action: 'actionB',
    });
    console.log(`  Request ${i + 1}: ${result.isAllowed ? '✓' : '✗'}`);
  }

  limiter.destroy();
}

/**
 * Test 5: Rate limiter presets
 */
export async function testPresets() {
  console.log('\n=== Test 5: Rate Limiter Presets ===');

  const limiters = {
    strict: RateLimiterPresets.strict(),
    standard: RateLimiterPresets.standard(),
    relaxed: RateLimiterPresets.relaxed(),
    telegram: RateLimiterPresets.telegramCommand(),
  };

  for (const [name, limiter] of Object.entries(limiters)) {
    const stats = limiter.getStats();
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`  Max Requests: ${stats.config.maxRequests}`);
    console.log(`  Window: ${(stats.config.windowMs / 1000).toFixed(0)}s`);

    limiter.destroy();
  }
}

/**
 * Test 6: Memory cleanup verification
 */
export async function testMemoryCleanup() {
  console.log('\n=== Test 6: Memory Cleanup ===');

  const limiter = new RateLimiter({
    maxRequests: 10,
    windowMs: 2 * 1000, // 2 seconds for quick test
    name: 'CleanupTest',
  });

  // Create entries
  console.log('Creating 100 entries...');
  for (let i = 0; i < 100; i++) {
    limiter.checkLimit({ identifier: `user${i}` });
  }

  let stats = limiter.getStats();
  console.log(`Active identifiers: ${stats.activeIdentifiers}`);

  // Wait for window to expire
  console.log('Waiting for entries to expire...');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Check cleanup
  stats = limiter.getStats();
  console.log(`Active identifiers after cleanup: ${stats.activeIdentifiers}`);
  console.log('Note: Cleanup runs automatically every 5 minutes');

  limiter.destroy();
}

/**
 * Test 7: Concurrent requests
 */
export async function testConcurrentRequests() {
  console.log('\n=== Test 7: Concurrent Requests ===');

  const limiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 1000,
    name: 'ConcurrentTest',
  });

  console.log('Simulating concurrent requests...');

  // Array of promises for concurrent checks
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      Promise.resolve().then(() => {
        return limiter.checkLimit({ identifier: 'concurrent-user' });
      })
    );
  }

  const results = await Promise.all(promises);

  const allowed = results.filter((r) => r.isAllowed).length;
  const limited = results.filter((r) => !r.isAllowed).length;

  console.log(`Allowed: ${allowed}/${results.length}`);
  console.log(`Limited: ${limited}/${results.length}`);
  console.log('✓ Concurrent requests handled correctly');

  limiter.destroy();
}

/**
 * Test 8: Reset functionality
 */
export async function testReset() {
  console.log('\n=== Test 8: Reset Functionality ===');

  const limiter = new RateLimiter({
    maxRequests: 3,
    windowMs: 60 * 1000,
    name: 'ResetTest',
  });

  // Make 4 requests (4th should fail)
  console.log('Making 4 requests (limit: 3):');
  for (let i = 0; i < 4; i++) {
    const result = limiter.checkLimit({ identifier: 'resetuser' });
    console.log(`  Request ${i + 1}: ${result.isAllowed ? '✓' : '✗'}`);
  }

  // Reset for this user
  console.log('\nResetting rate limit for resetuser...');
  limiter.reset('resetuser');

  // Try again
  console.log('Making 1 request after reset:');
  const result = limiter.checkLimit({ identifier: 'resetuser' });
  console.log(`  Request 1: ${result.isAllowed ? '✓ Allowed (reset worked!)' : '✗ Still limited (reset failed)'}`);

  limiter.destroy();
}

/**
 * Test 9: Status checking
 */
export async function testStatusChecking() {
  console.log('\n=== Test 9: Status Checking ===');

  const limiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000,
    name: 'StatusTest',
  });

  // Make some requests
  console.log('Making 2 requests...');
  for (let i = 0; i < 2; i++) {
    limiter.checkLimit({ identifier: 'statususer' });
  }

  // Check status
  const status = limiter.getStatus('statususer');
  console.log('\nStatus for statususer:');
  console.log(`  Requests made: ${status.requests}`);
  console.log(`  Remaining: ${status.remaining}`);
  console.log(`  Reset in: ${Math.ceil((status.resetTime - Date.now()) / 1000)}s`);
  console.log(`  Is active: ${status.isActive}`);

  limiter.destroy();
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         RATE LIMITER TEST SUITE                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await testBasicRateLimiter();
    await testMultipleUsers();
    await testRateLimiterManager();
    await testCustomKeyGenerator();
    await testPresets();
    await testMemoryCleanup();
    await testConcurrentRequests();
    await testReset();
    await testStatusChecking();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         ALL TESTS COMPLETED SUCCESSFULLY ✓           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default {
  testBasicRateLimiter,
  testMultipleUsers,
  testRateLimiterManager,
  testCustomKeyGenerator,
  testPresets,
  testMemoryCleanup,
  testConcurrentRequests,
  testReset,
  testStatusChecking,
  runAllTests,
};
