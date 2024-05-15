#!/bin/bash

# Define the directory containing migration files
MIGRATIONS_DIR="/prisma/migrations"

# Define the output file
OUTPUT_FILE="seed.sql"

# Remove the existing output file if it exists
rm -f "$OUTPUT_FILE"

# Iterate over each child directory in the migrations directory
for dir in "$MIGRATIONS_DIR"/*/; do
    # Get the SQL file in the current directory
    sql_file="$dir/migration.sql"
    
    # Check if the SQL file exists
    if [ -f "$sql_file" ]; then
        echo "Appending data from $sql_file to $OUTPUT_FILE"
        # Append the content of the SQL file to the output file
        cat "$sql_file" >> "$OUTPUT_FILE"
    else
        echo "No SQL file found in $dir"
    fi
done

echo "All SQL files appended to $OUTPUT_FILE"
