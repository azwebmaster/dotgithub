import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { GitHubActionYml } from './types/index.js';

export function readActionYml(tmpDir: string): GitHubActionYml {
  const actionYmlPath = path.join(tmpDir, 'action.yml');
  if (!fs.existsSync(actionYmlPath))
    throw new Error('action.yml not found in repo root');
  const ymlContent = fs.readFileSync(actionYmlPath, 'utf8');
  return yaml.parse(ymlContent);
}
