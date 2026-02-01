#!/bin/sh
set -x

file_vars=$(env | grep -E '^[^=]+_FILE=' | cut -d'=' -f1)

for file_var in $file_vars; do
    # Derive base var name (remove _FILE suffix; POSIX supports %)
    base_var="${file_var%_FILE}"
    
    # Get the file path (use eval for indirect access)
    eval "file_path=\${$file_var:-}"
    
    # Check if base var is set (eval to check existence)
    eval "base_value=\${$base_var:-}"
    if [ -n "$base_value" ]; then
        echo "Skipped $base_var: already set" >&2
        continue
    fi
    if [ -z "$file_path" ]; then
        echo "Skipped $base_var: $file_var is empty/unset" >&2
        continue
    fi
    if [ ! -f "$file_path" ]; then
        echo "Skipped $base_var: file does not exist ($file_path)" >&2
        continue
    fi
    if [ ! -r "$file_path" ]; then
        echo "Skipped $base_var: file not readable ($file_path)" >&2
        continue
    fi
    
    # Read file contents, trim trailing newlines (POSIX: use sed)
    value=$(cat "$file_path" | sed 's/[\n\r]*$//')
    
    # Export the base var (use eval to set dynamically)
    eval "$base_var=\"$value\""
    export "$base_var"
    echo "Set $base_var from $file_var ($file_path)" >&2
done


echo "Starting web server"

node server.js

