#!/bin/sh
# Activa los git hooks versionados del repo (carpeta .githooks).
# Ejecuta una sola vez tras clonar:  sh scripts/setup-hooks.sh
git config core.hooksPath .githooks
echo "✓ git hooks activados (core.hooksPath = .githooks)"
