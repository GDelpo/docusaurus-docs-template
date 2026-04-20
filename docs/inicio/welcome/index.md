---
id: welcome
title: Welcome
description: Placeholder welcome page — replace with your own content.
sidebar_position: 1
---

# Welcome

> This is a **placeholder page**. Replace its content with your own organization's documentation.

This scaffold includes a few reusable MDX components so you can see how a typical page is composed. Try editing this file at `docs/inicio/welcome/index.md` and the dev server (`npx docusaurus start`) will hot-reload.

## Example components

import Alert from '@site/src/components/Alert';
import Card from '@site/src/components/Card';
import CardGrid from '@site/src/components/CardGrid';
import { Steps, Step } from '@site/src/components/Steps';

<Alert type="info">
  Replace this alert with your own message. Types: `info`, `success`, `warning`, `danger`, `tip`.
</Alert>

<CardGrid>
  <Card title="Card one" icon="book-open">
    Short description of a section or link.
  </Card>
  <Card title="Card two" icon="settings">
    Another card with different content.
  </Card>
</CardGrid>

## Steps example

<Steps>
  <Step title="Install dependencies">
    Run `npm install` in the project root.
  </Step>
  <Step title="Start the dev server">
    Run `npx docusaurus start` and open `http://localhost:3000`.
  </Step>
  <Step title="Edit this page">
    Replace this file's content with your own Markdown/MDX.
  </Step>
</Steps>

## Next steps

- Replace the example pages under `docs/` with your own content.
- Adjust `docusaurus.config.js` (title, URL, navbar, footer).
- See the README for the full list of reusable components.
