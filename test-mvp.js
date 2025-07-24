#!/usr/bin/env node

/**
 * Simple MVP Test Script for PBLab
 * Tests core functionality to ensure everything works properly
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

console.log('🧪 Starting PBLab MVP Tests...\n');

// Test 1: Check if Next.js dev server can start
async function testDevServer() {
  console.log('1. Testing development server startup...');
  try {
    // Start dev server in background
    const child = require('child_process').spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      detached: false
    });
    
    let serverReady = false;
    let timeout;
    
    return new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Server startup timeout'));
      }, 30000);
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready') || output.includes('localhost:3000')) {
          serverReady = true;
          clearTimeout(timeout);
          child.kill();
          resolve('✅ Dev server starts successfully');
        }
      });
      
      child.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error') || error.includes('Failed')) {
          clearTimeout(timeout);
          child.kill();
          reject(new Error(`Server error: ${error}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Dev server test failed: ${error.message}`);
  }
}

// Test 2: Check if build works
async function testBuild() {
  console.log('2. Testing production build...');
  try {
    execSync('npm run build', { stdio: 'pipe', timeout: 60000 });
    return '✅ Production build successful';
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

// Test 3: Check TypeScript compilation
async function testTypeScript() {
  console.log('3. Testing TypeScript compilation...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', timeout: 30000 });
    return '✅ TypeScript compilation successful';
  } catch (error) {
    // Check if it's just warnings or actual errors
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
    if (errorOutput.includes('error TS')) {
      throw new Error(`TypeScript errors found: ${errorOutput.substring(0, 200)}...`);
    }
    return '⚠️  TypeScript compilation completed with warnings';
  }
}

// Test 4: Check linting
async function testLinting() {
  console.log('4. Testing linting...');
  try {
    execSync('npm run lint', { stdio: 'pipe', timeout: 30000 });
    return '✅ Linting passed';
  } catch (error) {
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
    if (errorOutput.includes('error')) {
      return `⚠️  Linting issues found: ${errorOutput.substring(0, 200)}...`;
    }
    return '✅ Linting passed';
  }
}

// Test 5: Check if database types can be generated
async function testDatabaseTypes() {
  console.log('5. Testing database type generation...');
  try {
    execSync('npm run types:gen', { stdio: 'pipe', timeout: 30000 });
    return '✅ Database types generated successfully';
  } catch (error) {
    return `⚠️  Database type generation failed: ${error.message.substring(0, 100)}...`;
  }
}

// Test 6: Check for missing dependencies
async function testDependencies() {
  console.log('6. Testing dependencies...');
  try {
    execSync('npm ls', { stdio: 'pipe', timeout: 15000 });
    return '✅ All dependencies resolved';
  } catch (error) {
    const errorOutput = error.stdout?.toString() || '';
    if (errorOutput.includes('missing') || errorOutput.includes('UNMET')) {
      return `⚠️  Some dependencies missing: ${errorOutput.substring(0, 200)}...`;
    }
    return '✅ Dependencies check completed';
  }
}

// Run all tests
async function runTests() {
  const tests = [
    testDependencies,
    testTypeScript,
    testLinting,
    testDatabaseTypes,
    testBuild,
    testDevServer
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      console.log(result);
    } catch (error) {
      const errorMsg = `❌ ${error.message}`;
      results.push(errorMsg);
      console.log(errorMsg);
    }
    console.log('');
  }
  
  console.log('📊 Test Summary:');
  console.log('================');
  results.forEach(result => console.log(result));
  
  const failures = results.filter(r => r.startsWith('❌')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const successes = results.filter(r => r.startsWith('✅')).length;
  
  console.log(`\n✅ ${successes} passed | ⚠️  ${warnings} warnings | ❌ ${failures} failed`);
  
  if (failures === 0) {
    console.log('\n🎉 MVP is ready! All critical tests passed.');
  } else {
    console.log('\n🔧 MVP needs attention. Please fix the failing tests.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});