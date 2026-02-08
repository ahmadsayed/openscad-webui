import { jest } from '@jest/globals';

// Mock OpenAI module at the very top before any imports
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }));
});

import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { 
  app, 
  validateOpenSCADSyntax, 
  verifyTheMath, 
  generateOpenscad, 
  processRequest 
} from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUEST_DIR = path.join(__dirname, 'requests');

// Define mock variables at top level
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();
const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Mock fs module
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      mkdir: mockMkdir,
      writeFile: mockWriteFile,
      readFile: mockReadFile
    }
  };
});


// Mock server setup
let server;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const appModule = await import('./index.js');

  // Initialize with mock client
  appModule.initializeOpenAI('test-api-key', 'https://api.deepseek.com', mockOpenAI);
  server = appModule.app.listen(0); // Random available port

  // Mock console.log to prevent test interference
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll((done) => {
  server.close(done);
  jest.restoreAllMocks();
});

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /generate-code', () => {
    it('should return requestId and success status', async () => {
      mockMkdir.mockResolvedValue();
      mockWriteFile.mockResolvedValue();

      const response = await request(server)
        .post('/generate-code')
        .send({ prompt: 'test', code: 'cube(10);' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requestId');
      expect(response.body.success).toBe(true);
    });

    it('should handle errors', async () => {
      mockMkdir.mockRejectedValue(new Error('FS error'));
      mockWriteFile.mockRejectedValue(new Error('FS error'));

      const response = await request(server)
        .post('/generate-code')
        .send({ prompt: 'test', code: 'cube(10);' });

      expect(response.status).toBe(200); // Still returns 200 since error happens async
      expect(response.body.success).toBe(true); // Initial response is always success
    });
  });


  describe('POST /save', () => {
    it('should return success', async () => {
      const response = await request(server)
        .post('/save')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.result).toBe('success');
    });
  });

});

describe('Core Functions', () => {
  describe('validateOpenSCADSyntax', () => {
    it('should validate code length', () => {
      const { valid } = validateOpenSCADSyntax('cube(10);');
      expect(valid).toBe(true);
    });

    it('should invalidate short code', () => {
      const { valid } = validateOpenSCADSyntax('x');
      expect(valid).toBe(false);
    });
  });

  describe('verifyTheMath', () => {
    it('should call OpenAI API with correct parameters', async () => {
      const mockCompletion = { choices: [{ message: { content: 'test' } }] };
      mockCreate.mockResolvedValue(mockCompletion);

      const result = await verifyTheMath('cube(10);', 'make bigger', mockOpenAI);

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBe('test');
    }, 10000);
  });

  describe('generateOpenscad', () => {
    it('should generate OpenSCAD code with correct parameters', async () => {
      // Mock for module filtering
      const mockModuleCompletion = {
        choices: [{
          message: {
            content: '{"filtered_modules": {},"analysis": {"keywords_found": ["test"],"primary_category": "basic","confidence": "High"}}'
          }
        }]
      };

      // Mock for code generation
      const mockCodeCompletion = {
        choices: [{
          message: {
            content: '```openscad\ncube(20, center=true);\n```'
          }
        }]
      };

      // First call returns module filtering result, second call returns code
      mockCreate.mockResolvedValueOnce(mockModuleCompletion)
                 .mockResolvedValueOnce(mockCodeCompletion);

      const result = await generateOpenscad('make bigger', 'cube(10, center=true);', 'specs', mockOpenAI);

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBe('cube(20, center=true);');
    }, 10000);

    it('should handle invalid response', async () => {
      // Mock for module filtering (success)
      const mockModuleCompletion = {
        choices: [{
          message: {
            content: '{"filtered_modules": {},"analysis": {"keywords_found": ["test"],"primary_category": "basic","confidence":"Low"}}'
          }
        }]
      };

      // Mock for code generation (invalid - no code block)
      const mockInvalidCodeCompletion = {
        choices: [{ message: { content: 'no code' } }]
      };

      mockCreate.mockResolvedValueOnce(mockModuleCompletion)
                 .mockResolvedValueOnce(mockInvalidCodeCompletion);

      await expect(generateOpenscad('test', 'cube(10);', 'specs', mockOpenAI))
        .rejects.toThrow('No valid OpenSCAD code found in response');
    }, 10000); // 10 second timeout
  });

});
