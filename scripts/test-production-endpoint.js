#!/usr/bin/env node

/**
 * Production Endpoint Testing Script
 * 
 * This script tests connectivity to the production backend API
 * and verifies that all key endpoints are accessible.
 * 
 * Usage:
 *   NEXT_PUBLIC_ECOM_API_URL=https://api.yourdomain.com node scripts/test-production-endpoint.js
 *   OR
 *   node scripts/test-production-endpoint.js https://api.yourdomain.com
 */

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Get API URL from command line argument or environment variable
const apiUrl = process.argv[2] || process.env.NEXT_PUBLIC_ECOM_API_URL || 'http://localhost:4000';

// Remove trailing slash
const baseUrl = apiUrl.replace(/\/$/, '');

log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
log('  Production Endpoint Testing', 'blue');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

logInfo(`Testing backend URL: ${baseUrl}\n`);

// Test configuration
const tests = [
  {
    name: 'Health Check / Root',
    method: 'GET',
    path: '/',
    expectedStatus: [200, 404], // 404 is OK if root doesn't exist
    description: 'Check if backend is accessible',
  },
  {
    name: 'Catalog Products',
    method: 'GET',
    path: '/catalog/products?page=1&pageSize=5',
    expectedStatus: [200],
    description: 'Test public product listing endpoint',
  },
  {
    name: 'Cart Creation',
    method: 'POST',
    path: '/cart',
    body: { currency: 'ZMW' },
    expectedStatus: [200, 201],
    description: 'Test cart creation endpoint',
  },
  {
    name: 'Coupons List',
    method: 'GET',
    path: '/coupons?page=1&pageSize=10',
    expectedStatus: [200],
    description: 'Test coupons listing endpoint',
  },
];

// Additional tests that require authentication (will show as skipped)
const authTests = [
  {
    name: 'Auth Me (Requires JWT)',
    method: 'GET',
    path: '/auth/me',
    expectedStatus: [200, 401],
    description: 'Test authentication endpoint (401 expected without token)',
    requiresAuth: true,
  },
  {
    name: 'Admin Products (Requires Admin JWT)',
    method: 'GET',
    path: '/admin/products?page=1&pageSize=5',
    expectedStatus: [200, 401],
    description: 'Test admin products endpoint (401 expected without token)',
    requiresAuth: true,
  },
];

// Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Shreeji-Production-Test/1.0',
        ...options.headers,
      },
      timeout: 10000, // 10 second timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
          rawData: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Run a single test
async function runTest(test) {
  const url = `${baseUrl}${test.path}`;
  const startTime = Date.now();

  try {
    const response = await makeRequest(url, {
      method: test.method,
      body: test.body,
    });

    const duration = Date.now() - startTime;
    const isSuccess = test.expectedStatus.includes(response.status);

    if (isSuccess) {
      logSuccess(`${test.name} - Status: ${response.status} (${duration}ms)`);
      
      // Check CORS headers
      if (response.headers['access-control-allow-origin']) {
        logInfo(`   CORS: ${response.headers['access-control-allow-origin']}`);
      } else {
        logWarning(`   CORS header not found`);
      }

      return {
        success: true,
        status: response.status,
        duration,
        cors: response.headers['access-control-allow-origin'],
      };
    } else {
      logError(`${test.name} - Unexpected status: ${response.status} (expected: ${test.expectedStatus.join(' or ')})`);
      if (response.status === 401 && test.requiresAuth) {
        logInfo('   (This is expected for protected endpoints without authentication)');
      }
      return {
        success: false,
        status: response.status,
        duration,
        cors: response.headers['access-control-allow-origin'],
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`${test.name} - Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      logError('   Connection refused - Is the backend running?');
    } else if (error.code === 'ENOTFOUND') {
      logError('   DNS lookup failed - Check the URL');
    } else if (error.message === 'Request timeout') {
      logError('   Request timed out - Backend may be slow or unreachable');
    }

    return {
      success: false,
      error: error.message,
      duration,
    };
  }
}

// Main test runner
async function runTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  log('Running Public Endpoint Tests:\n', 'cyan');

  // Run public tests
  for (const test of tests) {
    results.total++;
    const result = await runTest(test);
    results.details.push({ test: test.name, ...result });

    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log('\nRunning Authentication Tests (401 expected):\n', 'cyan');

  // Run auth tests
  for (const test of authTests) {
    results.total++;
    const result = await runTest(test);
    results.details.push({ test: test.name, ...result });

    // 401 is considered success for auth tests
    if (result.status === 401 || result.success) {
      results.passed++;
      if (result.status === 401) {
        logInfo(`   ${test.name} correctly returned 401 (authentication required)`);
      }
    } else {
      results.failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Print summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('  Test Summary', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  logInfo(`Total Tests: ${results.total}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  }

  // CORS check summary
  const corsResults = results.details.filter((r) => r.cors);
  if (corsResults.length > 0) {
    log('\nCORS Configuration:', 'cyan');
    const uniqueCors = [...new Set(corsResults.map((r) => r.cors))];
    uniqueCors.forEach((cors) => {
      logInfo(`  Allowed Origin: ${cors}`);
    });
  } else {
    logWarning('\n⚠️  No CORS headers found. Make sure FRONTEND_URL is configured in backend.');
  }

  // Recommendations
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('  Recommendations', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  if (results.failed === 0) {
    logSuccess('All tests passed! Your production endpoint is configured correctly.');
    logInfo('\nNext steps:');
    logInfo('1. Set NEXT_PUBLIC_ECOM_API_URL in your frontend environment');
    logInfo('2. Deploy your frontend');
    logInfo('3. Test from the browser using PRODUCTION-TESTING-CHECKLIST.md');
  } else {
    logWarning('Some tests failed. Please check:');
    logInfo('1. Backend is running and accessible at the URL');
    logInfo('2. CORS is configured correctly (FRONTEND_URL in backend)');
    logInfo('3. Network/firewall allows connections');
    logInfo('4. SSL certificate is valid (for HTTPS)');
  }

  log('\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

