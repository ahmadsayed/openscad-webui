#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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
const DEPLOYMENT_FILE = 'kubernetes/deployment.yaml';

function main() {
  try {
    console.log('🚀 Starting Docker build and deploy process...');
    
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
    
    // Update Kubernetes deployment
    console.log('🔄 Updating Kubernetes deployment...');
    updateKubernetesDeployment(tag);
    
    console.log('🎉 Build and deploy process completed successfully!');
    console.log(`📋 Image tag: ${tag}`);
    console.log(`🐳 Full image: ${fullImageName}`);
    
  } catch (error) {
    console.error('❌ Build and deploy failed:', error.message);
    process.exit(1);
  }
}

function updateKubernetesDeployment(tag) {
  try {
    // Read the deployment file
    const deploymentPath = path.resolve(DEPLOYMENT_FILE);
    let deploymentContent = fs.readFileSync(deploymentPath, 'utf8');
    
    // Update the image tag using regex
    const imageRegex = /(image:\s*ahmadsayed\/promptscad):[\w\d]+/g;
    const newImageLine = `$1:${tag}`;
    
    deploymentContent = deploymentContent.replace(imageRegex, newImageLine);
    
    // Write back the updated content
    fs.writeFileSync(deploymentPath, deploymentContent, 'utf8');
    
    console.log(`✅ Updated ${DEPLOYMENT_FILE} with new tag: ${tag}`);
    
    // Apply the deployment (optional - uncomment if you want auto-apply)
    // console.log('🚀 Applying Kubernetes deployment...');
    // execSync(`kubectl apply -f ${DEPLOYMENT_FILE}`, { stdio: 'inherit' });
    // console.log('✅ Kubernetes deployment applied successfully!');
    
  } catch (error) {
    console.error('❌ Failed to update Kubernetes deployment:', error.message);
    throw error;
  }
}

// Run the script
main();
