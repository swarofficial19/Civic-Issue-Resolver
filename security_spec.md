# Security Specification - CivicSolve Portal

## Data Invariants
1. A report must have a valid non-empty ID, ticket number, title, category, description, priority, status, and location object.
2. Status transitions must follow valid workflow progression: `Submitted` -> `Acknowledged` -> `In Progress` -> `Resolved`.
3. Read access to `/reports` is allowed for public or authenticated users to enable citizens to search ticket status and track public complaints.
4. Writes (creates & updates) must satisfy structural type constraints and property boundaries.

## The Dirty Dozen Payload Tests
1. Payload with 1MB title string -> REJECTED (title maxLength 300)
2. Payload with invalid category "Hacking" -> REJECTED (enum constraint)
3. Payload with negative SLA hours -> REJECTED
4. Payload missing required location -> REJECTED
5. Malformed report document ID with forbidden symbols -> REJECTED

## Security Rules Definition
Rules ensure public read access for municipal transparency while enforcing strict schema validation on report creates and updates.
