import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(value: string): string {
  return value.replace(REGEX_SPECIAL_CHARS, '\\$&');
}

const NUMERIC_TYPES = new Set(['int', 'long', 'double', 'decimal']);

export function isNumericBsonType(type: string): boolean {
  return NUMERIC_TYPES.has(type);
}
