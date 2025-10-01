export function toProperCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Generates a function name (camelCase) from an action name
 * @param actionName - The action name to convert
 * @returns The camelCase function name
 */
export function generateFunctionName(actionName: string): string {
  const cleanName = actionName.replace(/[^a-zA-Z0-9]/g, ' ');
  const properCase = toProperCase(cleanName);
  return properCase.charAt(0).toLowerCase() + properCase.slice(1);
}

export function dedent(str: string): string {
  const lines = str.split('\n');
  
  // Remove leading and trailing empty lines
  while (lines.length > 0 && lines[0]?.trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }
  
  if (lines.length === 0) return '';
  
  // Find minimum indentation (ignoring empty lines)
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  if (nonEmptyLines.length === 0) return '';
  
  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match?.[1]?.length ?? 0;
    })
  );
  
  // Remove the common indentation
  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
}
