# Code organization

Nana's Recipes groups application code by feature and keeps shared domain and
data-access logic in `src/lib`.

## Decomposition review

A feature component approaching 400–500 lines triggers a decomposition review.
This is a review signal, not an automatic failure: cohesion and behavior matter
more than a raw line count. Prefer extracting a module when a file owns more
than one of these responsibilities:

- stateful orchestration and presentational sections;
- forms, rows, filters, grouping, or dialogs;
- reusable mutation or persistence behavior;
- normalization, comparison, ranking, or explanation logic;
- data mapping, hydration, and domain-specific queries.

Keep route components and public compatibility modules small. Extracted modules
should use named exports, explicit props, and direct imports. Authorization stays
at each public server query boundary, while PostgreSQL RLS remains the
defense-in-depth boundary for user-owned data.

Review the largest TypeScript and TSX files periodically:

```powershell
Get-ChildItem src -Recurse -Include *.ts,*.tsx |
  ForEach-Object {
    [pscustomobject]@{
      Lines = (Get-Content -LiteralPath $_.FullName).Count
      File = $_.FullName
    }
  } |
  Sort-Object Lines -Descending |
  Select-Object -First 20
```
