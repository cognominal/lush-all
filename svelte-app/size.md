Biggest offenders in HEAD (examples):

- yaml/tests/json-test-suite/parsers/test_Squeak_JSON_tonyg/Squeak5.1-16549-32bit.image (~35 MB)
- Many compiled binaries under yaml/tests/json-test-suite/parsers/\*_/bin/_ (5–9 MB each)
- Rust build outputs under yaml/tests/json-test-suite/parsers/**/target/** (e.g. .rlib, .dSYM)
- JARs like yaml/tests/json-test-suite/parsers/test_java_jackson_2_8_4/\*.jar

You can confirm locally with:

- git ls-tree -r --long HEAD yaml/tests/json-test-suite/parsers | sort -k4 -n | tail -n 25
- git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | rg '^blob ' | sort -k3 -n | tail -n 30

If you want, tell me “clean it up”, and I’ll propose the exact git filter-repo command to remove those paths from history (so GitHub repo size actually shrinks)
and then force-push safely.
