import { jest } from '@jest/globals';

// Mock console
const mockConsole = {
  log: jest.fn()
};
global.console = mockConsole;

// Import the function we want to test
import { verifyTheMath } from '../server/services/openscad/math.js';

describe('[Simplified] math.js - verifyTheMath coverage', () => {

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

    const mathMock = jest.fn(() => 'mocked modules');
    global.formatModulesForPrompt = mathMock;
  });

  describe('Core Functionality Tests', () => {

    it('should call API with correct parameters', async () => {
      const expectedResponse = 'math verification complete';
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: expectedResponse } }]
      });

      const result = await verifyTheMath('sphere(10);', 'make it larger', mockOpenAI, null);

      expect(result).toBe(expectedResponse);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
        model: 'deepseek-chat',
        max_tokens: 800
      }));
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Network timeout');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(
        verifyTheMath('sphere(10);', 'test', mockOpenAI, null)
      ).rejects.toThrow('Network timeout');
    });

    it('should handle empty choices array', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({ choices: [] });

      await expect(
        verifyTheMath('sphere(10);', 'test', mockOpenAI, null)
      ).rejects.toThrow(TypeError);
    });

    it('should handle unicode and special characters', async () => {
      const unicodeCode = 'sphere(10); // 球体の半径 radius';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'unicode handled' } }]
      });

      const result = await verifyTheMath(unicodeCode, 'increase the 球体', mockOpenAI, null);

      expect(result).toBe('unicode handled');
    });
  });
});