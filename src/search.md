---
layout: layouts/base.njk
title: Search
summary: Find concepts, articles, lab pages, and critiques across the site.
---

<div id="search"></div>
<link href="/pagefind/pagefind-ui.css" rel="stylesheet">
<script src="/pagefind/pagefind-ui.js" defer></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({ element: "#search", showSubResults: true, showImages: false });
  });
</script>

hmmm
