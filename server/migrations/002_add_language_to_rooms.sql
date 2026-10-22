-- Migration 002: Add language column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS language VARCHAR(20) NOT NULL DEFAULT 'python';
