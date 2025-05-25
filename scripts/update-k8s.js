#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Configuration
const DEPLOYMENT_FILE = 'kubernetes/deployment.yaml';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function getCurrentImageTag() {
  try {
    const deploymentPath = path.resolve(DEPLOYMENT_FILE);
    const deploymentContent = fs.readFileSync(deploymentPath, 'utf8');
    
    // Extract current image tag
    const imageMatch = deploymentContent.match(/image:\s*ahmadsayed\/promptscad:([\w\d]+)/);
    return imageMatch ? imageMatch[1] : 'unknown';
  } catch (error) {
    console.error('❌ Failed to read current deployment:', error.message);
    return 'unknown';
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
    return true;
    
  } catch (error) {
    console.error('❌ Failed to update Kubernetes deployment:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🔄 Kubernetes Deployment Updater');
    console.log('================================');
    
    // Show current image tag
    const currentTag = getCurrentImageTag();
    console.log(`📋 Current image tag: ${currentTag}`);
    
    // Ask for new tag
    const newTag = await askQuestion('🏷️  Enter new image tag: ');
    
    if (!newTag.trim()) {
      console.log('❌ No tag provided. Exiting...');
      rl.close();
      return;
    }
    
    // Update deployment
    console.log(`🔄 Updating deployment from ${currentTag} to ${newTag}...`);
    
    const success = updateKubernetesDeployment(newTag.trim());
    
    if (success) {
      console.log('✅ Deployment file updated successfully!');
      
      // Ask if user wants to apply the deployment
      const applyDeployment = await askQuestion('🚀 Apply deployment to Kubernetes cluster? (y/N): ');
      
      if (applyDeployment.toLowerCase() === 'y' || applyDeployment.toLowerCase() === 'yes') {
        console.log('🚀 Applying Kubernetes deployment...');
        execSync(`kubectl apply -f ${DEPLOYMENT_FILE}`, { stdio: 'inherit' });
        console.log('✅ Kubernetes deployment applied successfully!');
      } else {
        console.log('💡 To apply manually, run: kubectl apply -f kubernetes/deployment.yaml');
      }
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();
