#!/usr/bin/env node

/**
 * Simplified Build Script
 * Single script for Docker build and deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Simple configuration
const IMAGE_NAME = 'ahmadsayed/promptscad';
const DEPLOYMENT_FILE = 'kubernetes/deployment.yaml';

function generateTag() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function main() {
  try {
    const tag = generateTag();
    const fullImageName = `${IMAGE_NAME}:${tag}`;
    
    console.log(`🚀 Building Docker image: ${fullImageName}`);
    
    // Simple docker build (single platform for most use cases)
    execSync(`docker build -t ${fullImageName} .`, { stdio: 'inherit' });
    
    console.log('✅ Build complete!');
    console.log(`🐳 Image: ${fullImageName}`);
    
    // Optional: Update deployment file
    if (fs.existsSync(DEPLOYMENT_FILE)) {
      console.log('🔄 Updating Kubernetes deployment...');
      
      let content = fs.readFileSync(DEPLOYMENT_FILE, 'utf8');
      content = content.replace(/(image:\s*ahmadsayed\/promptscad):[\w\d]+/g, `$1:${tag}`);
      fs.writeFileSync(DEPLOYMENT_FILE, content);
      
      console.log(`✅ Updated ${DEPLOYMENT_FILE} with tag: ${tag}`);
      console.log('\n🎯 Next steps:');
      console.log(`   docker push ${fullImageName}`);
      console.log(`   kubectl apply -f ${DEPLOYMENT_FILE}`);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();