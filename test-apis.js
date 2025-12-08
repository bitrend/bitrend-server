#!/usr/bin/env node

/**
 * Comprehensive API Test Script for Bitrend Server
 *
 * This script analyzes all route files and creates a comprehensive test report
 * without requiring a running server.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function analyzeRouteFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const routes = [];

        // Extract route definitions using regex
        const routeRegex = /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = routeRegex.exec(content)) !== null) {
            const [, method, path] = match;
            routes.push({ method: method.toUpperCase(), path });
        }

        return routes;
    } catch (error) {
        log(`Error reading route file ${filePath}: ${error.message}`, 'red');
        return [];
    }
}

function analyzeSwaggerFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const swagger = JSON.parse(content);
        const endpoints = [];

        for (const [path, methods] of Object.entries(swagger.paths || {})) {
            for (const [method, spec] of Object.entries(methods)) {
                endpoints.push({
                    method: method.toUpperCase(),
                    path: path,
                    summary: spec.summary,
                    description: spec.description,
                    auth: spec.security && spec.security.length > 0,
                    parameters: spec.parameters || [],
                    responses: Object.keys(spec.responses || {})
                });
            }
        }

        return endpoints;
    } catch (error) {
        log(`Error reading swagger file: ${error.message}`, 'red');
        return [];
    }
}

function getControllerInfo(controllerPath) {
    try {
        const content = fs.readFileSync(controllerPath, 'utf8');
        const functions = [];

        // Extract function definitions
        const functionRegex = /(?:const|async function)\s+(\w+)\s*=|(\w+)\s*:\s*async|exports\.(\w+)\s*=/g;
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2] || match[3];
            if (functionName && !functions.includes(functionName)) {
                functions.push(functionName);
            }
        }

        return {
            exists: true,
            functions
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

function main() {
    log('🧪 Bitrend Server API Analysis', 'bright');
    log('================================\n', 'bright');

    const routesDir = path.join(__dirname, 'src', 'routes');
    const controllersDir = path.join(__dirname, 'src', 'controllers');
    const swaggerPath = path.join(__dirname, 'swagger.json');

    // Analyze swagger documentation
    log('📖 Swagger Documentation Analysis', 'blue');
    log('-----------------------------------', 'blue');

    const swaggerEndpoints = analyzeSwaggerFile(swaggerPath);
    if (swaggerEndpoints.length > 0) {
        swaggerEndpoints.forEach(endpoint => {
            const authIcon = endpoint.auth ? '🔒' : '🔓';
            log(`${authIcon} ${endpoint.method} ${endpoint.path}`, 'cyan');
            if (endpoint.summary) {
                log(`   └─ ${endpoint.summary}`, 'yellow');
            }
            if (endpoint.responses.length > 0) {
                log(`   └─ Responses: ${endpoint.responses.join(', ')}`, 'magenta');
            }
        });
    } else {
        log('No swagger endpoints found', 'yellow');
    }

    log('\n📁 Route Files Analysis', 'blue');
    log('------------------------', 'blue');

    const routeFiles = [
        'auth.routes.js',
        'images.routes.js',
        'user.routes.js',
        'github.routes.js',
        'evaluationProject.routes.js',
        'analysis.routes.js',
        'recommendation.routes.js',
        'monitoring.routes.js'
    ];

    const allEndpoints = [];

    routeFiles.forEach(fileName => {
        const filePath = path.join(routesDir, fileName);
        const routeName = fileName.replace('.routes.js', '');

        log(`\n🔍 ${routeName.toUpperCase()} Routes`, 'green');
        log(`File: ${fileName}`, 'yellow');

        if (fs.existsSync(filePath)) {
            const routes = analyzeRouteFile(filePath);
            const controllerPath = path.join(controllersDir, `${routeName}.controller.js`);
            const controllerInfo = getControllerInfo(controllerPath);

            log(`✅ Route file exists`, 'green');
            log(`${controllerInfo.exists ? '✅' : '❌'} Controller file exists`, controllerInfo.exists ? 'green' : 'red');

            if (controllerInfo.exists) {
                log(`📋 Controller functions: ${controllerInfo.functions.join(', ')}`, 'cyan');
            } else {
                log(`❌ Controller error: ${controllerInfo.error}`, 'red');
            }

            if (routes.length > 0) {
                routes.forEach(route => {
                    const fullPath = `/api/${routeName}${route.path}`;
                    log(`   ${route.method} ${fullPath}`, 'white');
                    allEndpoints.push({
                        ...route,
                        fullPath,
                        module: routeName,
                        controllerExists: controllerInfo.exists
                    });
                });
            } else {
                log('   No routes found in file', 'yellow');
            }
        } else {
            log(`❌ Route file does not exist`, 'red');
        }
    });

    // Summary
    log('\n📊 Summary', 'bright');
    log('----------', 'bright');
    log(`Total endpoints found: ${allEndpoints.length}`, 'cyan');

    const workingEndpoints = allEndpoints.filter(e => e.controllerExists);
    const brokenEndpoints = allEndpoints.filter(e => !e.controllerExists);

    log(`✅ Working endpoints: ${workingEndpoints.length}`, 'green');
    log(`❌ Broken endpoints: ${brokenEndpoints.length}`, 'red');

    if (brokenEndpoints.length > 0) {
        log('\n🔧 Broken Endpoints (Missing Controllers):', 'red');
        brokenEndpoints.forEach(e => {
            log(`   ${e.method} ${e.fullPath} (${e.module})`, 'red');
        });
    }

    // Generate test commands
    log('\n🧪 Test Commands (for working endpoints)', 'blue');
    log('---------------------------------------', 'blue');

    // Health check
    log('\n# Health Check (No auth required)', 'green');
    log('curl -X GET http://localhost:3000/health', 'white');

    // Auth endpoints
    const authEndpoints = workingEndpoints.filter(e => e.module === 'auth');
    if (authEndpoints.length > 0) {
        log('\n# Authentication Endpoints', 'green');
        authEndpoints.forEach(e => {
            if (e.method === 'POST' && e.path.includes('callback')) {
                log(`curl -X ${e.method} http://localhost:3000${e.fullPath} \\`, 'white');
                log(`  -H "Content-Type: application/json" \\`, 'white');
                log(`  -d '{"authorizationCode": "test-code"}'`, 'white');
            } else {
                log(`curl -X ${e.method} http://localhost:3000${e.fullPath}`, 'white');
            }
        });
    }

    // Other endpoints (require auth)
    const otherEndpoints = workingEndpoints.filter(e => e.module !== 'auth');
    if (otherEndpoints.length > 0) {
        log('\n# Authenticated Endpoints (Replace TOKEN with actual JWT)', 'green');
        otherEndpoints.forEach(e => {
            if (e.method === 'GET') {
                log(`curl -X ${e.method} http://localhost:3000${e.fullPath} \\`, 'white');
                log(`  -H "Authorization: Bearer TOKEN"`, 'white');
            } else if (e.method === 'POST' || e.method === 'PUT' || e.method === 'PATCH') {
                log(`curl -X ${e.method} http://localhost:3000${e.fullPath} \\`, 'white');
                log(`  -H "Authorization: Bearer TOKEN" \\`, 'white');
                log(`  -H "Content-Type: application/json" \\`, 'white');
                log(`  -d '{}'`, 'white');
            } else {
                log(`curl -X ${e.method} http://localhost:3000${e.fullPath} \\`, 'white');
                log(`  -H "Authorization: Bearer TOKEN"`, 'white');
            }
        });
    }

    log('\n📝 Testing Notes:', 'yellow');
    log('- Start the server first: npm run dev', 'yellow');
    log('- Start Redis and PostgreSQL: docker-compose up -d', 'yellow');
    log('- For authenticated endpoints, you need to get a token from GitHub OAuth first', 'yellow');
    log('- Some endpoints require specific data in the database to work properly', 'yellow');

    log('\n✨ Analysis Complete!', 'bright');
}

if (require.main === module) {
    main();
}

module.exports = { analyzeRouteFile, analyzeSwaggerFile, getControllerInfo };