/**
 * Money-zen — Helpers date.
 * Toutes les dates sont stockées en ISO 8601 (UTC) en base.
 * Pour l'affichage, on convertit en locale du device.
 */
import { format, parseISO, startOfDay, startOfMonth, startOfWeek, startOfYear, endOfDay, endOfMonth, endOfWeek, endOfYear, subMonths, subDays, subYears } from 'date-fns';
import type { AnalysisPeriod, ISODateString, PeriodRange } from '@types/index';

export function nowISO(): ISODateString {
  return new Date().toISOString();
}

export function todayISODate(): ISODateString {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Reformate une date ISO en format lisible. */
export function formatDate(iso: ISODateString, pattern: string = 'dd MMM yyyy'): string {
  try {
    const date = parseISO(iso);
    return format(date, pattern);
  } catch {
    return iso;
  }
}

/** Formatage court pour historique (05 SEPT.). */
export function formatShortDate(iso: ISODateString): string {
  try {
    return format(parseISO(iso), 'dd MMM').toUpperCase().replace(/\.$/, '.');
  } catch {
    return iso;
  }
}

/** Convertit un range d'AnalysisPeriod en {start, end} ISO. */
export function periodToRange(period: AnalysisPeriod): PeriodRange {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() };
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), end: endOfWeek(now, { weekStartsOn: 1 }).toISOString() };
    case 'this_month':
      return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth).toISOString(), end: endOfMonth(lastMonth).toISOString() };
    }
    case 'this_year':
      return { start: startOfYear(now).toISOString(), end: endOfYear(now).toISOString() };
    case 'last_year': {
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear).toISOString(), end: endOfYear(lastYear).toISOString() };
    }
    case 'custom':
      return { start: now.toISOString(), end: now.toISOString() };
  }
}

/** Nombre de jours entre deux dates ISO. */
export function daysBetween(startISO: ISODateString, endISO: ISODateString): number {
  const start = parseISO(startISO).getTime();
  const end = parseISO(endISO).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

/** Nombre de mois (approximatif) entre aujourd'hui et une date cible. */
export function monthsUntilNow(targetISO: ISODateString): number {
  const now = new Date();
  const target = parseISO(targetISO);
  if (target.getTime() < now.getTime()) return 0;
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()),
  );
}

/** Soustrait des jours à aujourd'hui. */
export function subDaysFromNow(days: number): ISODateString {
  return subDays(new Date(), days).toISOString();
}

/** Date en format relatif court (aujourd'hui, hier, il y a X jours). */
export function relativeLabel(iso: ISODateString, locale: 'fr' | 'en' = 'fr'): string {
  const date = parseISO(iso);
  const today = new Date();
  const diffDays = Math.round((startOfDay(today).getTime() - startOfDay(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return locale === 'fr' ? 'Aujourd\'hui' : 'Today';
  if (diffDays === 1) return locale === 'fr' ? 'Hier' : 'Yesterday';
  if (diffDays === -1) return locale === 'fr' ? 'Demain' : 'Tomorrow';
  if (diffDays > 0 && diffDays < 7) return locale === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
  return format(date, 'dd MMM yyyy');
}
