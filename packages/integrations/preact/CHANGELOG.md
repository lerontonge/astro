# @astrojs/preact

## 0.2.0

### Minor Changes

- [#3652](https://github.com/withastro/astro/pull/3652) [`7373d61c`](https://github.com/withastro/astro/commit/7373d61cdcaedd64bf5fd60521b157cfa4343558) Thanks [@natemoo-re](https://github.com/natemoo-re)! - Add support for passing named slots from `.astro` => framework components.

  Each `slot` is be passed as a top-level prop. For example:

  ```jsx
  // From .astro
  <Component>
    <h2 slot="title">Hello world!</h2>
    <h2 slot="slot-with-dash">Dash</h2>
    <div>Default</div>
  </Component>;

  // For .jsx
  export default function Component({ title, slotWithDash, children }) {
    return (
      <>
        <div id="title">{title}</div>
        <div id="slot-with-dash">{slotWithDash}</div>
        <div id="main">{children}</div>
      </>
    );
  }
  ```

## 0.1.3

### Patch Changes

- [#3455](https://github.com/withastro/astro/pull/3455) [`e9a77d86`](https://github.com/withastro/astro/commit/e9a77d861907adccfa75811f9aaa555f186d78f8) Thanks [@natemoo-re](https://github.com/natemoo-re)! - Update client hydration to check for `ssr` attribute. Requires `astro@^1.0.0-beta.36`.

## 0.1.2

### Patch Changes

- [#3166](https://github.com/withastro/astro/pull/3166) [`70263cf7`](https://github.com/withastro/astro/commit/70263cf7481b11e42152c422acc6cfe90fe10ad2) Thanks [@natemoo-re](https://github.com/natemoo-re)! - Fix integration to use updateConfig rather than returning a partial config object

## 0.1.1

### Patch Changes

- [`815d62f1`](https://github.com/withastro/astro/commit/815d62f151a36fef7d09590d4962ca71bda61b32) Thanks [@FredKSchott](https://github.com/FredKSchott)! - no changes.

## 0.1.0

### Minor Changes

- [#2979](https://github.com/withastro/astro/pull/2979) [`9d7a4b59`](https://github.com/withastro/astro/commit/9d7a4b59b53f8cb274266f5036d1cef841750252) Thanks [@FredKSchott](https://github.com/FredKSchott)! - Welcome to the Astro v1.0.0 Beta! Read the [official announcement](https://astro.build/blog/astro-1-beta-release/) for more details.

## 0.0.2

### Patch Changes

- [#2885](https://github.com/withastro/astro/pull/2885) [`6b004363`](https://github.com/withastro/astro/commit/6b004363f99f27e581d1e2d53a2ebff39d7afb8a) Thanks [@bholmesdev](https://github.com/bholmesdev)! - Add README across Astro built-in integrations

* [#2847](https://github.com/withastro/astro/pull/2847) [`3b621f7a`](https://github.com/withastro/astro/commit/3b621f7a613b45983b090794fa7c015f23ed6140) Thanks [@tony-sull](https://github.com/tony-sull)! - Adds keywords to the official integrations to support discoverability on Astro's Integrations site

- [#2872](https://github.com/withastro/astro/pull/2872) [`098f6f6b`](https://github.com/withastro/astro/commit/098f6f6b06396441c576dc689d8552629ef260e1) Thanks [@bholmesdev](https://github.com/bholmesdev)! - Fix `isSelfAccepting` errors when using the Preact integration with the Astro dev server

## 0.0.2-next.1

### Patch Changes

- [#2872](https://github.com/withastro/astro/pull/2872) [`098f6f6b`](https://github.com/withastro/astro/commit/098f6f6b06396441c576dc689d8552629ef260e1) Thanks [@bholmesdev](https://github.com/bholmesdev)! - Fix `isSelfAccepting` errors when using the Preact integration with the Astro dev server

## 0.0.2-next.0

### Patch Changes

- [#2847](https://github.com/withastro/astro/pull/2847) [`3b621f7a`](https://github.com/withastro/astro/commit/3b621f7a613b45983b090794fa7c015f23ed6140) Thanks [@tony-sull](https://github.com/tony-sull)! - Adds keywords to the official integrations to support discoverability on Astro's Integrations site
