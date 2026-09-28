-- Migration 001: Add display name column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL UNIQUE DEFAULT 'Untitled Room';
