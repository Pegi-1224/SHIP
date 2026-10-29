/**
 * Display formatting.
 *
 * Every formatter here distinguishes "missing" from "zero". A value the
 * publisher never reported renders as a dash with an explanation, never as
 * `0` or `$0`.
 */
import type { IsoDateString } from '@/shared/types/common';

/** What the UI shows when a number was never reported. */
export const NOT_REPORTED = '—'; // em dash

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** `$152,000`. Returns the em dash for `null`/`undefined`. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  return usdCompact.format(value);
}

/** `$152k`, for tight spaces such as chart axes. */
export function formatUsdShort(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`;
  return usdCompact.format(value);
}

/** `34%`. Returns the em dash for `null`/`undefined`. */
export function formatPercent(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  return `${value.toFixed(fractionDigits)}%`;
}

/** `12 weeks` / `1 week`. */
export function formatWeeks(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  return `${value} ${value === 1 ? 'week' : 'weeks'}`;
}

/** `18 months` / `1 month`. */
export function formatMonths(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  return `${value} ${value === 1 ? 'month' : 'months'}`;
}

/** `5 submissions` / `1 submission`. */
export function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** `Apr 10, 2026`. */
export function formatDate(value: IsoDateString | null | undefined): string {
  if (!value) return NOT_REPORTED;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_REPORTED;
  return dateFormatter.format(date);
}

/**
 * `just now`, `3 hours ago`, `Apr 10, 2026`.
 * Used for post and message timestamps.
 */
export function formatRelativeTime(
  value: IsoDateString | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return NOT_REPORTED;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_REPORTED;

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  return formatDate(value);
}

/** Compact relative time for post meta lines: "5m ago", "6h ago", "3d ago", then the date. */
export function formatTimeAgo(value: IsoDateString, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_REPORTED;

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(value);
}

/** Tags are stored bare and displayed with a leading `#`. */
export function formatTag(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

/** Shorten long text for a preview line without cutting mid-word. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trimEnd()}…`;
}

/** Turn `https://www.northwind-systems.example/careers` into `northwind-systems.example`. */
export function formatHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
