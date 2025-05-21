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
  
  // Create mock OpenAI client
  const mockOpenAI = {
    chat: {
      completions: {
        create: mockCreate
      }
    }
  };

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

      const result = await verifyTheMath('cube(10);', 'make bigger');
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: "deepseek-chat",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("OpenSCAD math specialist")
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("cube(10);")
          })
        ])
      });
      expect(result).toBe('test');
    }, 10000);
  });

  describe('generateOpenscad', () => {
    it('should generate OpenSCAD code with correct parameters', async () => {
      const mockCompletion = { 
        choices: [{ 
          message: { 
            content: '```openscad\ncube(20, center=true);\n```' 
          } 
        }] 
      };
      mockCreate.mockResolvedValue(mockCompletion);

      const result = await generateOpenscad('make bigger', 'cube(10, center=true);', 'specs');
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: "deepseek-chat",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("OpenSCAD Expert Protocol")
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("make bigger")
          })
        ]),
        temperature: 0.3
      });
      expect(result).toBe('cube(20, center=true);');
    }, 10000);

    it('should handle invalid response', async () => {
      const mockCompletion = { choices: [{ message: { content: 'no code' } }] };
      mockCreate.mockResolvedValue(mockCompletion);

      await expect(generateOpenscad('test', 'cube(10);', 'specs'))
        .rejects.toThrow('No OpenSCAD code block found');
    }, 10000); // 10 second timeout
  });

});
