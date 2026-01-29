/**
 * Test script to verify NestJS backend endpoints are working
 * This tests actual connectivity to the backend API
 * 
 * Usage:
 *   node scripts/test-backend-endpoints.js
 *   node scripts/test-backend-endpoints.js https://your-backend-app.ondigitalocean.app
 *   NEXT_PUBLIC_ECOM_API_URL=https://your-backend-app.ondigitalocean.app node scripts/test-backend-endpoints.js
 */

// Get URL from command line argument or environment variable
const urlFromArg = process.argv[2];
const API_URL = urlFromArg 
  ? urlFromArg.replace(/\/$/, '')
  : (process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000');

console.log('🧪 Testing Backend Endpoints');
console.log('============================\n');
console.log(`Backend URL: ${API_URL}\n`);

const testResults = [];

async function testEndpoint(method, endpoint, description, options = {}) {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const status = response.status;
    const statusText = response.statusText;
    
    let data = null;
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      // Not JSON, that's okay
    }

    if (response.ok || status === 404 || status === 401) {
      // 404 and 401 are expected for some endpoints without proper setup
      console.log(`✅ ${description}`);
      console.log(`   Status: ${status} ${statusText}`);
      if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) {
          console.log(`   Records: ${data.data.length}`);
        } else if (data.message) {
          console.log(`   Message: ${data.message}`);
        }
      }
      testResults.push({ endpoint, description, status, success: true });
    } else {
      console.log(`⚠️  ${description}`);
      console.log(`   Status: ${status} ${statusText}`);
      if (data?.message) {
        console.log(`   Error: ${data.message}`);
      }
      testResults.push({ endpoint, description, status, success: false, error: statusText });
    }
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('fetch')) {
      console.log(`   ⚠️  Cannot connect to backend. Is it running at ${API_URL}?`);
    }
    testResults.push({ endpoint, description, success: false, error: error.message });
  }
  console.log('');
}

async function runTests() {
  console.log('Testing Public/Catalog Endpoints:\n');
  
  // Public endpoints (no auth required)
  await testEndpoint('GET', '/catalog/products', 'GET /catalog/products - List products');
  await testEndpoint('GET', '/catalog/products?page=1&pageSize=5', 'GET /catalog/products - With pagination');
  
  // Cart endpoints (public, creates cart)
  await testEndpoint('POST', '/cart', 'POST /cart - Create cart', {
    body: { currency: 'ZMW' },
  });

  // Payment endpoints
  await testEndpoint('GET', '/payments/enabled-methods', 'GET /payments/enabled-methods - Get payment methods');
  await testEndpoint('GET', '/payments/bank-details', 'GET /payments/bank-details - Get bank details');

  console.log('\nTesting Protected Endpoints (expected to fail without auth):\n');
  
  // Protected endpoints (require auth - these should return 401)
  await testEndpoint('GET', '/orders/me', 'GET /orders/me - Get user orders (requires auth)');
  await testEndpoint('GET', '/addresses/me', 'GET /addresses/me - Get user addresses (requires auth)');
  await testEndpoint('GET', '/admin/products', 'GET /admin/products - Admin products (requires auth)');

  console.log('\n📊 Test Summary');
  console.log('===============\n');
  
  const successful = testResults.filter(r => r.success);
  const failed = testResults.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${testResults.length}`);
  console.log(`❌ Failed: ${failed.length}/${testResults.length}\n`);

  if (successful.length > 0) {
    console.log('✅ Working Endpoints:');
    successful.forEach(r => {
      console.log(`   - ${r.description} (${r.status})`);
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('❌ Failed Endpoints:');
    failed.forEach(r => {
      const reason = r.error || `Status: ${r.status}`;
      console.log(`   - ${r.description}: ${reason}`);
    });
    console.log('');
  }

  // Check if backend is accessible
  const networkErrors = failed.filter(r => r.error && r.error.includes('fetch'));
  if (networkErrors.length > 0) {
    console.log('⚠️  Backend Connection Issues:');
    console.log(`   Cannot connect to ${API_URL}`);
    console.log('   Please check:');
    console.log('   1. Is the backend running?');
    console.log('   2. Is the URL correct?');
    console.log('   3. Is CORS configured properly?');
    console.log('   4. Check firewall/network settings\n');
  }

  // Check for CORS issues
  const corsIssues = failed.filter(r => r.error && r.error.includes('CORS'));
  if (corsIssues.length > 0) {
    console.log('⚠️  CORS Issues Detected:');
    console.log('   The backend may not be configured to allow requests from this origin');
    console.log('   Check FRONTEND_URL in backend environment variables\n');
  }

  console.log('💡 Tips:');
  console.log('   - 401 errors are expected for protected endpoints without authentication');
  console.log('   - 404 errors may indicate the endpoint path is incorrect');
  console.log('   - Network errors indicate the backend is not accessible\n');
}

// Run tests
runTests().catch(console.error);

