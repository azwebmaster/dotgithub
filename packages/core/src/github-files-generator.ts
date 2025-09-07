import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface GenerateGithubFilesOptions {
  outputDir: string;
  files: { [relativePath: string]: string };
  overwrite?: boolean;
  createDirectories?: boolean;
}

export interface GenerateGithubFilesResult {
  generatedFiles: string[];
  skippedFiles: string[];
  createdDirectories: string[];
}

export function generateGithubFiles(options: GenerateGithubFilesOptions): GenerateGithubFilesResult {
  const result: GenerateGithubFilesResult = {
    generatedFiles: [],
    skippedFiles: [],
    createdDirectories: []
  };

  // Ensure base output directory exists
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
    result.createdDirectories.push(options.outputDir);
  }

  for (const [relativePath, content] of Object.entries(options.files)) {
    const fullPath = path.join(options.outputDir, relativePath);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (options.createDirectories !== false && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      result.createdDirectories.push(dir);
    }

    // Check if file exists and handle overwrite logic
    if (fs.existsSync(fullPath) && !options.overwrite) {
      result.skippedFiles.push(fullPath);
      continue;
    }

    // Write the file
    fs.writeFileSync(fullPath, content, 'utf8');
    result.generatedFiles.push(fullPath);
  }

  return result;
}

export interface DependabotConfig {
  version: number;
  updates: DependabotUpdate[];
}

export interface DependabotUpdate {
  'package-ecosystem': 'npm' | 'pip' | 'docker' | 'github-actions' | 'gomod' | 'cargo' | 'composer' | 'gradle' | 'maven' | 'nuget' | 'bundler';
  directory: string;
  schedule: {
    interval: 'daily' | 'weekly' | 'monthly';
    time?: string;
    timezone?: string;
    day?: string;
  };
  'open-pull-requests-limit'?: number;
  reviewers?: string[];
  assignees?: string[];
  labels?: string[];
  milestone?: string;
  'commit-message'?: {
    prefix?: string;
    'prefix-development'?: string;
    include?: 'scope';
  };
  'rebase-strategy'?: 'disabled' | 'auto';
  'ignore'?: Array<{
    'dependency-name': string;
    versions?: string[];
  }>;
}

export function generateDependabotConfig(updates: DependabotUpdate[]): string {
  const config: DependabotConfig = {
    version: 2,
    updates
  };

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

export interface CodeownersEntry {
  pattern: string;
  owners: string[];
}

export function generateCodeowners(entries: CodeownersEntry[]): string {
  const lines = [
    '# This file defines code ownership for the repository',
    '# See: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners',
    ''
  ];

  for (const entry of entries) {
    const ownersStr = entry.owners.join(' ');
    lines.push(`${entry.pattern} ${ownersStr}`);
  }

  return lines.join('\n') + '\n';
}

export interface IssueTemplate {
  name: string;
  about: string;
  title?: string;
  labels?: string[];
  assignees?: string[];
  body: Array<{
    type: 'markdown' | 'textarea' | 'input' | 'dropdown' | 'checkboxes';
    id?: string;
    attributes: {
      label?: string;
      description?: string;
      placeholder?: string;
      value?: string;
      render?: string;
      options?: string[];
      multiple?: boolean;
    };
    validations?: {
      required?: boolean;
    };
  }>;
}

export function generateIssueTemplate(template: IssueTemplate): string {
  return yaml.dump(template, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

export interface PullRequestTemplate {
  description: string;
  checklist?: string[];
  additionalSections?: { title: string; content: string }[];
}

export function generatePullRequestTemplate(template: PullRequestTemplate): string {
  const lines = [template.description, ''];

  if (template.checklist && template.checklist.length > 0) {
    lines.push('## Checklist', '');
    for (const item of template.checklist) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push('');
  }

  if (template.additionalSections) {
    for (const section of template.additionalSections) {
      lines.push(`## ${section.title}`, '', section.content, '');
    }
  }

  return lines.join('\n');
}

export interface FundingConfig {
  github?: string | string[];
  patreon?: string;
  'open_collective'?: string;
  ko_fi?: string;
  tidelift?: string;
  'community_bridge'?: string;
  liberapay?: string;
  issuehunt?: string;
  otechie?: string;
  'buy_me_a_coffee'?: string;
  custom?: string | string[];
}

export function generateFundingConfig(config: FundingConfig): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

export interface SecurityPolicy {
  reportingInstructions: string;
  supportedVersions?: Array<{
    version: string;
    supported: boolean;
  }>;
  contactInfo?: {
    email?: string;
    url?: string;
  };
}

export function generateSecurityPolicy(policy: SecurityPolicy): string {
  const lines = [
    '# Security Policy',
    '',
    '## Supported Versions',
    ''
  ];

  if (policy.supportedVersions) {
    lines.push('| Version | Supported |');
    lines.push('| ------- | --------- |');
    for (const version of policy.supportedVersions) {
      const supported = version.supported ? '✅' : '❌';
      lines.push(`| ${version.version} | ${supported} |`);
    }
    lines.push('');
  }

  lines.push('## Reporting a Vulnerability', '');
  lines.push(policy.reportingInstructions);

  if (policy.contactInfo) {
    lines.push('', '## Contact Information', '');
    if (policy.contactInfo.email) {
      lines.push(`**Email:** ${policy.contactInfo.email}`);
    }
    if (policy.contactInfo.url) {
      lines.push(`**URL:** ${policy.contactInfo.url}`);
    }
  }

  return lines.join('\n') + '\n';
}

export const GitHubFilesGenerators = {
  dependabot: generateDependabotConfig,
  codeowners: generateCodeowners,
  issueTemplate: generateIssueTemplate,
  pullRequestTemplate: generatePullRequestTemplate,
  funding: generateFundingConfig,
  security: generateSecurityPolicy
};

export type SupportedGitHubFile = keyof typeof GitHubFilesGenerators;