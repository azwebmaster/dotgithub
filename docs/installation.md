# Installation Guide

This guide covers how to install and set up DotGitHub for your project.

## Prerequisites

Before installing DotGitHub, ensure you have the following:

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Git** for version control
- **GitHub account** (for accessing GitHub Actions)

## Installation Methods

### Global Installation (Recommended)

Install DotGitHub globally to use it across all your projects:

```bash
npm install -g @dotgithub/cli
```

Or using yarn:

```bash
yarn global add @dotgithub/cli
```

### Project Installation

Install DotGitHub as a development dependency in your project:

```bash
npm install --save-dev @dotgithub/cli
```

Or using yarn:

```bash
yarn add --dev @dotgithub/cli
```

### Using npx (No Installation)

Run DotGitHub without installing it:

```bash
npx @dotgithub/cli
```

## Verification

After installation, verify that DotGitHub is working correctly:

```bash
dotgithub --version
```

You should see output similar to:

```
0.1.1
```

## GitHub Token Setup

DotGitHub requires a GitHub token for accessing GitHub Actions metadata. Set up your token:

### 1. Create a GitHub Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "DotGitHub CLI")
4. Select the following scopes:
   - `repo` (for private repositories)
   - `public_repo` (for public repositories)
   - `read:packages` (if using GitHub Packages)

### 2. Set Environment Variable

Set the token as an environment variable:

#### Linux/macOS

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

#### Windows (Command Prompt)

```cmd
set GITHUB_TOKEN=ghp_your_token_here
```

#### Windows (PowerShell)

```powershell
$env:GITHUB_TOKEN="ghp_your_token_here"
```

### 3. Make it Persistent

Add the environment variable to your shell profile:

#### Bash (~/.bashrc or ~/.bash_profile)

```bash
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc
```

#### Zsh (~/.zshrc)

```bash
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.zshrc
```

#### Fish (~/.config/fish/config.fish)

```fish
set -gx GITHUB_TOKEN ghp_your_token_here
```

## Project Setup

### 1. Initialize a New Project

Create a new DotGitHub project:

```bash
dotgithub init
```

This creates:

- `src/dotgithub.json` - Configuration file
- `src/package.json` - Node.js package file
- `src/tsconfig.json` - TypeScript configuration
- `src/index.ts` - Entry point file

### 2. Install Dependencies

Navigate to the generated directory and install dependencies:

```bash
cd src
npm install
```

### 3. Add Your First Action

Add a GitHub Action to your project:

```bash
dotgithub add actions/checkout@v4
```

### 4. Generate Workflows

Create your first workflow:

```bash
dotgithub synth
```

## Configuration

### dotgithub.json

The main configuration file contains:

```json
{
  "version": "1.0.0",
  "rootDir": "src",
  "outputDir": ".github/workflows",
  "actions": [],
  "plugins": [],
  "stacks": [],
  "options": {
    "tokenSource": "env",
    "formatting": {
      "prettier": true
    }
  }
}
```

### Key Configuration Options

- **rootDir** - Directory for generated TypeScript files
- **outputDir** - Directory for generated workflow files
- **actions** - Array of tracked GitHub Actions
- **plugins** - Array of plugin configurations
- **stacks** - Array of stack configurations

## IDE Setup

### Visual Studio Code

Install recommended extensions:

```bash
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
```

### TypeScript Support

DotGitHub generates TypeScript files with full type safety. Your IDE should automatically provide:

- IntelliSense for action inputs/outputs
- Type checking for workflow definitions
- Auto-completion for action parameters

## Troubleshooting

### Common Issues

#### 1. Permission Denied

If you get permission errors on macOS/Linux:

```bash
sudo npm install -g @dotgithub/cli
```

#### 2. GitHub Token Issues

Verify your token is set correctly:

```bash
echo $GITHUB_TOKEN
```

#### 3. Network Issues

If you're behind a corporate firewall, you may need to configure npm proxy settings:

```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

#### 4. Node.js Version Issues

Ensure you're using Node.js 18+:

```bash
node --version
```

If you need to manage multiple Node.js versions, consider using:

- [nvm](https://github.com/nvm-sh/nvm) (Linux/macOS)
- [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows)

### Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [command documentation](command-init.md)
3. Check the [GitHub issues](https://github.com/azwebmaster/dotgithub/issues)
4. Join the [Discord community](https://discord.gg/dotgithub)

## Next Steps

After installation, you can:

1. [Get started with your first workflow](getting-started.md)
2. [Learn about the CLI commands](command-init.md)
3. [Explore plugin development](plugin-development.md)
4. [Read the API reference](api-reference.md)

## Uninstallation

To remove DotGitHub:

### Global Installation

```bash
npm uninstall -g @dotgithub/cli
```

### Project Installation

```bash
npm uninstall @dotgithub/cli
```

### Remove Configuration

```bash
rm -rf src/dotgithub.json src/package.json src/tsconfig.json src/index.ts
```
