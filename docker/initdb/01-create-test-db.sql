-- Runs automatically on first container start (postgres image convention:
-- anything in /docker-entrypoint-initdb.d/ executes once, against the default DB).
-- Gives integration tests a database isolated from your real dev data, on the same
-- Postgres instance - no second container needed for a project this size.
CREATE DATABASE retailshop_test;
