import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatestTag } from './github';

// Mock the Octokit import
const mockListTags = vi.fn();
vi.mock('octokit', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listTags: mockListTags
      }
    }
  }))
}));

describe('getLatestTag version selection', () => {
  beforeEach(() => {
    mockListTags.mockReset();
  });

  it('should prefer major version tags over specific versions', async () => {
    // Mock response with both major and specific version tags
    mockListTags.mockResolvedValue({
      data: [
        { name: 'v4.1.2' },
        { name: 'v4.1.1' },
        { name: 'v4.1.0' },
        { name: 'v4.0.0' },
        { name: 'v4' },        // This should be preferred
        { name: 'v3.6.0' },
        { name: 'v3.5.3' },
        { name: 'v3' },        // This would be second choice if v4 wasn't available
        { name: 'v2.7.0' },
        { name: 'v2' }
      ]
    });

    const result = await getLatestTag('actions', 'checkout');
    expect(result).toBe('v4');
  });

  it('should fallback to latest semver when no major version tags exist', async () => {
    // Mock response with only specific version tags (no major-only tags)
    mockListTags.mockResolvedValue({
      data: [
        { name: 'v4.1.2' },
        { name: 'v4.1.1' },
        { name: 'v4.1.0' },
        { name: 'v3.6.0' },
        { name: 'v3.5.3' },
        { name: 'v2.7.0' }
      ]
    });

    const result = await getLatestTag('actions', 'checkout');
    expect(result).toBe('v4.1.2');
  });

  it('should handle version tags without "v" prefix', async () => {
    // Mock response with tags without "v" prefix
    mockListTags.mockResolvedValue({
      data: [
        { name: '4.1.2' },
        { name: '4.1.1' },
        { name: '4.1.0' },
        { name: '4.0.0' },
        { name: '4' },        // This should be preferred
        { name: '3.6.0' },
        { name: '3' }
      ]
    });

    const result = await getLatestTag('actions', 'checkout');
    expect(result).toBe('4');
  });

  it('should prefer the latest major version tag when multiple exist', async () => {
    // Mock response with multiple major version tags
    mockListTags.mockResolvedValue({
      data: [
        { name: 'v5.1.0' },
        { name: 'v5' },        // This should be preferred (latest major)
        { name: 'v4.2.1' },
        { name: 'v4' },
        { name: 'v3' },
        { name: 'v2' }
      ]
    });

    const result = await getLatestTag('actions', 'checkout');
    expect(result).toBe('v5');
  });

  it('should handle prerelease versions correctly', async () => {
    // Mock response with prerelease versions (should be ignored for major version preference)
    mockListTags.mockResolvedValue({
      data: [
        { name: 'v4.1.2' },
        { name: 'v4.1.0-beta.1' },  // Prerelease - should be ignored for major version detection
        { name: 'v4.0.0' },
        { name: 'v4' },        // This should be preferred
        { name: 'v3.6.0' }
      ]
    });

    const result = await getLatestTag('actions', 'checkout');
    expect(result).toBe('v4');
  });
});