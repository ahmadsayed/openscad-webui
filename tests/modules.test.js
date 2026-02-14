import { jest } from '@jest/globals';

// Mock console
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
global.console = mockConsole;

// Import the function we want to test
import { filterModulesByRequirements } from '../server/services/openscad/modules.js';

describe('modules.js - Basic Functionality Tests', () => {

  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
  });

  describe('Core Success Paths', () => {

    it('should handle basic valid response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              filtered_modules: { sphere: { signature: 'sphere(r)', priority: 'High' } },
              analysis: { keywords_found: ['sphere'] }
            })
          }
        }]
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await filterModulesByRequirements('make a sphere', '', mockOpenAI);

      expect(result.filtered_modules).toBeDefined();
      expect(result.analysis).toBeDefined();
    });

    it('should handle response with markdown code blocks', async () => {
      const responseData = JSON.stringify({
        filtered_modules: { cube: { priority: 'High' } },
        analysis: { keywords_found: ['cube'] }
      });

      const markdownResponse = {
        choices: [{
          message: {
            content: '```json\n' + responseData + '\n```'
          }
        }]
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(markdownResponse);

      const result = await filterModulesByRequirements('create a cube', '', mockOpenAI);

      expect(result.filtered_modules).toBeDefined();
    });
  });

  describe('Error Handling', () => {

    it('should handle missing choices gracefully', async () => {
      const mockResponse = {
        choices: [] // Empty choices
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(
        filterModulesByRequirements('test', 'code', mockOpenAI)
      ).rejects.toThrow('Invalid response format from OpenAI API');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'invalid json content'
          }
        }]
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await filterModulesByRequirements('test', 'code', mockOpenAI);

      expect(result.filtered_modules).toEqual({});
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const apiError = new Error('API timeout');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(
        filterModulesByRequirements('test', 'code', mockOpenAI)
      ).rejects.toThrow('API timeout');
    });
  });

  describe('Edge Cases', () => {

    it('should log API interactions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"filtered_modules": {}}'
          }
        }]
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await filterModulesByRequirements('test prompt', 'test code', mockOpenAI);

      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle unicode in prompts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({ filtered_modules: {}, analysis: {} })
          }
        }]
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await filterModulesByRequirements('create 球体 sphere', '', mockOpenAI);

      expect(result.filtered_modules).toEqual({});
    });
  });
});