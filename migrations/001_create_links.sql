-- Migration: 001_create_links
-- Implements R-007 (schema) and R-008 (idempotent — CREATE TABLE IF NOT EXISTS).
-- Run: psql $DATABASE_URL -f migrations/001_create_links.sql
-- Safe to run multiple times with no error.

CREATE TABLE IF NOT EXISTS links (
  id           SERIAL       PRIMARY KEY,
  shortcode    TEXT         NOT NULL UNIQUE,
  original_url TEXT         NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
