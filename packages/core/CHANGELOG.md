# @dotgithub/core

## 0.1.5

### Patch Changes

- [#22](https://github.com/azwebmaster/dotgithub/pull/22) [`e7810e8`](https://github.com/azwebmaster/dotgithub/commit/e7810e82892171041a81938b3d4d2dc7b21dbfab) Thanks [@danbot315](https://github.com/danbot315)! - Improve npm package documentation for both core and CLI with clearer usage examples, command flows, and direct documentation links.

## 0.1.4

### Patch Changes

- [#19](https://github.com/azwebmaster/dotgithub/pull/19) [`89c96f3`](https://github.com/azwebmaster/dotgithub/commit/89c96f335f823f27bd19fd891764fdcc14acb5dd) Thanks [@danbot315](https://github.com/danbot315)! - Add package-level README files and npm metadata links (homepage/repository/bugs) so published packages point back to project documentation.

- [`b90f4b9`](https://github.com/azwebmaster/dotgithub/commit/b90f4b933845ad44a75da218e1829ba6c1868431) - Adjust release workflow to commit version changes only after successful npm publish.

## 0.1.3

### Patch Changes

- [`2ab95e2`](https://github.com/azwebmaster/dotgithub/commit/2ab95e28be06b1ea54b6c156cf637b73618f158c) - Switch package publishing to npmjs and align release/snapshot workflows to use `NPM_AUTH_TOKEN`.

## 0.1.2

### Patch Changes

- [`6e8e8d9`](https://github.com/azwebmaster/dotgithub/commit/6e8e8d929ff2bab9aa436690e24d8de8972c0b02) - preview

## 0.1.1

### Patch Changes

- Add changesets package for better release management
  - Install @changesets/cli and @changesets/changelog-github
  - Configure changesets with GitHub integration
  - Update package.json scripts for changeset workflows
  - Configure release workflow to use changesets
  - Set packages to public access for npm publishing
