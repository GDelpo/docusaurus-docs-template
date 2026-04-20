---
id: structure-example
title: Structure example
description: How to organise docs under the docs/ tree.
sidebar_position: 2
---

# Structure example

This page shows how you can organise larger documentation sets. In this scaffold we kept the `docs/` tree almost empty so you can shape it freely; a typical layout looks like this:

```
docs/
├── inicio/                   # Getting started / home section
│   ├── _category_.json
│   ├── welcome/index.md
│   └── structure-example/index.md
├── product/                  # One top-level section per product/area
│   ├── _category_.json
│   └── feature-x/index.md
└── operations/
    ├── _category_.json
    └── runbooks/index.md
```

Each directory can hold an `_category_.json` to customise its sidebar label, position, and landing page. See the [Docusaurus docs](https://docusaurus.io/docs/sidebar/items#category-item) for the full schema.

> This page is a placeholder — feel free to delete it once you've set up your own section structure.
