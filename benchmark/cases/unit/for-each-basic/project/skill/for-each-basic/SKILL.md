---
name: for-each-basic
description: Test basic FOR iteration over a list of files
---

## Input

$files: $String[]

## Workflow

### Process Files

FOR $file IN $files
  Read the contents of $file using the read_file tool
  Log that you processed $file
END
