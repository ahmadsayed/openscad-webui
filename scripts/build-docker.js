#!/usr/bin/env node

import { execSync } from 'child_process';

// Generate timestamp tag in format: MMDDHHMM
function generateTag() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${month}${day}${hour}${minute}`;
}

// Configuration
const IMAGE_NAME = 'ahmadsayed/promptscad';
const PLATFORMS = 'linux/arm/v7,linux/arm64/v8,linux/amd64';

function main() {
  try {
    console.log('🚀 Starting Docker build process...');
    
    // Generate tag
    const tag = generateTag();
    const fullImageName = `${IMAGE_NAME}:${tag}`;
    
    console.log(`📦 Building image: ${fullImageName}`);
    console.log(`🏗️  Platforms: ${PLATFORMS}`);
    
    // Build and push Docker image
    const buildCommand = `docker buildx build --platform ${PLATFORMS} -t ${fullImageName} --push .`;
    
    console.log('⚡ Executing build command...');
    console.log(`Command: ${buildCommand}`);
    
    execSync(buildCommand, { stdio: 'inherit' });
    
    console.log('✅ Docker build and push completed successfully!');
    console.log(`📋 Image tag: ${tag}`);
    console.log(`🐳 Full image: ${fullImageName}`);
    console.log('💡 To update Kubernetes deployment, run: npm run k8s:update');
    
  } catch (error) {
    console.error('❌ Docker build failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
