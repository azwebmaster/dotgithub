import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export function readActionYml(tmpDir: string): any {
  const actionYmlPath = path.join(tmpDir, 'action.yml');
  if (!fs.existsSync(actionYmlPath)) throw new Error('action.yml not found in repo root');
  const ymlContent = fs.readFileSync(actionYmlPath, 'utf8');
  return yaml.parse(ymlContent);
}
