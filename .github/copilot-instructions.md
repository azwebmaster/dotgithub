<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

- [x] Clarify Project Requirements (If Not Provided)**
	- User has specified: TypeScript monorepo, pnpm, Bun as primary runtime, Vitest, jsii (Python target), @dotgithub scope, packages: cli and core.

- [ ] Scaffold the Project Using the Right Tool**
	- Call project setup tool with:
		- projectType: 'other' (custom monorepo)
		- language: 'typescript'
	- Run the scaffolding command from setup info
	- Use '.' as the working directory
	- Fall back to default scaffolding if needed

- [ ] Customize the project
	- Develop a plan to modify the codebase according to the user's requirements. Ignore this step for a "Hello World" project.
	- Apply the modifications in the plan to the codebase using the right tools and user-provided references below.

- [ ] Install required VS Code extensions using the extension installer tool (if `requiredExtensions` is defined)

- [ ] Compile the project
	- Install any missing dependencies.
	- Run diagnostics and resolve any issues.
	- Check for markdown files in the project folder that may contain relevant instructions to help with this step.

- [ ] Create and run a task based on project structure and metadata using the right tool
  <!-- 	Create a task based on the package.json, README.md, and project structure and pass that as input to the tool. -->

- [ ] Launch the project (prompt user for debug mode, launch only if confirmed)

- [ ] Ensure README.md exists and is up to date

## Execution Guidelines
- After completing each step, check it off and add a one-line summary
- Avoid verbose explanations or printing full command outputs
- If a step is skipped, state that briefly (e.g. "No extensions needed")
- Use '.' as the working directory unless user specifies otherwise
- Do not explain project structure unless asked
- Do not create folders unless user instructs
- Avoid adding media or external links unless explicitly requested
- Use placeholders only with a note that they should be replaced
- Use VS Code API tool only for VS Code extension projects
- Completion = project scaffolded, copilot-instructions + README exist, task runnable, debug launch offered

<!--
# Rules
- Always start executing the plan by calling the tool to get the project template.
- Before executing, provide the user with a high-level plan outlining the steps and the command that you will use to create the project. Do not list unnecessary details—keep it concise and actionable.
- Help the user execute this plan by calling the appropriate tools.
- Once the project is created, it is already opened in Visual Studio Code—do not suggest commands to open this project in Visual Studio again.
- Do not print and explain the project structure to the user unless explicitly requested.
- If the project setup information has additional rules, follow them strictly.
- Follow the rules below strictly.

## Folder Creation Rules
- Always use the current directory as the project root.
- If you are running any terminal commands, use the '.' argument to ensure that the current working directory is used ALWAYS.
- Do not create a new folder unless the user explicitly requests it besides a .vscode folder for a tasks.json file.
- If any of the scaffolding commands mention that the folder name is not correct, let the user know to create a new folder with the correct name and then reopen it again in vscode. Do not attempt to move it yourself. And do not proceed with next steps.

## Extension Installation Rules
- If the project setup lists `requiredExtensions`, use extension installer tool to check and install ALL the listed `requiredExtensions` before proceeding.

## Project Content Rules
- If the user has not specified project details, assume they want a "Hello World" project as a starting point.
- Avoid adding links of any type (URLs, files, folders, etc.) or integrations that are not explicitly required.
- Avoid generating images, videos, or any other media files unless explicitly requested.
- If you need to use any media assets as placeholders, let the user know that these are placeholders and should be replaced with the actual assets later.
- Ensure all generated components serve a clear purpose within the user's requested workflow.
- If a feature is assumed but not confirmed, prompt the user for clarification before including it.
- If you are working on a VS Code extension, use the VS Code API tool with a query to find relevant VS Code API references and samples related to that query.

## Task Completion Rules
- Your task is complete when:
  - The project is successfully created without errors.
  - The user has clear instructions on how to launch their code in debug mode within Visual Studio Code.
  - A `copilot-instructions.md` exists in the project root under the `.github` directory.
  - A README.md file in the root of the project is up to date.
  - A `tasks.json` file exists in the project root under the `.vscode` directory.
-->

Before starting a new task in the above plan, update progress in the plan.
