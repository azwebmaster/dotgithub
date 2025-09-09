const semver = require('semver');

const tags = ['v4.1.2', 'v4.1.1', 'v4.1.0', 'v4.0.0', 'v4', 'v3.6.0', 'v3.5.3', 'v3', 'v2.7.0', 'v2'];

console.log('Testing semver validation and parsing:');
tags.forEach(tag => {
  const valid = semver.valid(tag);
  const parsed = semver.parse(tag);
  const normalized = tag.replace(/^v/, '');
  const majorVersionPattern = /^\d+$/;
  const isMajorOnly = majorVersionPattern.test(normalized);
  
  console.log(`${tag}: valid=${!!valid}, parsed=${!!parsed}, normalized=${normalized}, isMajorOnly=${isMajorOnly}`);
  if (parsed) {
    console.log(`  - major=${parsed.major}, minor=${parsed.minor}, patch=${parsed.patch}, prerelease=${JSON.stringify(parsed.prerelease)}`);
  }
});

console.log('\nTesting major version filtering:');
const validTags = tags.filter(tag => semver.valid(tag)).sort(semver.rcompare);
console.log('Valid tags sorted:', validTags);

const majorVersionTags = validTags.filter(tag => {
  const parsed = semver.parse(tag);
  if (!parsed || parsed.prerelease.length > 0) return false;
  
  const normalizedTag = tag.replace(/^v/, '');
  const majorVersionPattern = /^\d+$/;
  return majorVersionPattern.test(normalizedTag);
});

console.log('Major version tags:', majorVersionTags);
console.log('Preferred tag:', majorVersionTags.length > 0 ? majorVersionTags[0] : validTags[0]);