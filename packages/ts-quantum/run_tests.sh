#!/bin/bash

# Clear or create the passing and failing files
> "./passing"
> "./failing"

# Go through each test file (including those in subfolders)
find ./__tests__ -name "*.test.ts" | while read test_file; do
  filename=$(basename "$test_file")
  relative_path=${test_file#./__tests__/}
  echo "Running test: $relative_path"
  
  # Run the test and capture the exit code
  pnpm test "$test_file" --silent
  
  if [ $? -eq 0 ]; then
    # Test passed
    echo "$filename" >> "./passing"
  else
    # Test failed
    echo "$filename" >> "./failing"
  fi
done

echo "Done. Check 'passing' and 'failing' files for results."
