/**
 * Money-zen — Catégories prédéfinies (spec section 12 + 14).
 * L'utilisateur peut créer / modifier / réordonner / archiver ces catégories.
 * Les catégories système ne sont jamais supprimées physiquement.
 */
import type { Category, CategoryType } from '@types/index';

export interface CategorySeed {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES_SEED: CategorySeed[] = [
  // ─── Dépenses ────────────────────────────────────────────────────────────
  { name: 'Alimentation', type: 'expense', icon: '🍔', color: '#D08B5C', isSystem: true, sortOrder: 1 },
  { name: 'Transport', type: 'expense', icon: '🚕', color: '#6B8CAE', isSystem: true, sortOrder: 2 },
  { name: 'Logement', type: 'expense', icon: '🏠', color: '#A67C52', isSystem: true, sortOrder: 3 },
  { name: 'Santé', type: 'expense', icon: '💊', color: '#C97B7B', isSystem: true, sortOrder: 4 },
  { name: 'Loisirs', type: 'expense', icon: '🎮', color: '#7DA68C', isSystem: true, sortOrder: 5 },
  { name: 'Éducation', type: 'expense', icon: '📚', color: '#B5946A', isSystem: true, sortOrder: 6 },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#A0588B', isSystem: true, sortOrder: 7 },
  { name: 'Abonnements', type: 'expense', icon: '🔁', color: '#7B8DC9', isSystem: true, sortOrder: 8 },
  { name: 'Factures', type: 'expense', icon: '📄', color: '#C99A52', isSystem: true, sortOrder: 9 },
  { name: 'Restaurant', type: 'expense', icon: '🍽️', color: '#D69968', isSystem: true, sortOrder: 10 },
  { name: 'Cadeau', type: 'expense', icon: '🎁', color: '#B8907D', isSystem: true, sortOrder: 11 },
  { name: 'Autre dépense', type: 'expense', icon: '➖', color: '#9B9489', isSystem: true, sortOrder: 99 },
  // ─── Revenus ─────────────────────────────────────────────────────────────
  { name: 'Salaire', type: 'income', icon: '💼', color: '#5C9C7A', isSystem: true, sortOrder: 1 },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#7AA8B8', isSystem: true, sortOrder: 2 },
  { name: 'Commerce', type: 'income', icon: '📦', color: '#B8905A', isSystem: true, sortOrder: 3 },
  { name: 'Investissement', type: 'income', icon: '📈', color: '#6B8FB0', isSystem: true, sortOrder: 4 },
  { name: 'Remboursement', type: 'income', icon: '↩️', color: '#7B9C8E', isSystem: true, sortOrder: 5 },
  { name: 'Autre revenu', type: 'income', icon: '➕', color: '#9B9489', isSystem: true, sortOrder: 99 },
  // ─── Épargne ─────────────────────────────────────────────────────────────
  { name: 'Épargne', type: 'savings', icon: '🐷', color: '#D6A47C', isSystem: true, sortOrder: 1 },
];

export function isCategoryDeletable(category: Category): boolean {
  // Les catégories système ne sont JAMAIS supprimables (archivage uniquement).
  if (category.isSystem) return false;
  return true;
}

export const CATEGORY_COLORS = [
  '#D08B5C', '#6B8CAE', '#A67C52', '#C97B7B',
  '#7DA68C', '#B5946A', '#A0588B', '#7B8DC9',
  '#C99A52', '#D69968', '#B8907D', '#5C9C7A',
  '#7AA8B8', '#B8905A', '#6B8FB0', '#7B9C8E',
  '#9B9489',
];

export const CATEGORY_ICONS = [
  '🍔', '🚕', '🏠', '💊', '🎮', '📚', '🛍️', '🔁',
  '📄', '🍽️', '🎁', '➖', '💼', '💻', '📦', '📈',
  '↩️', '➕', '🐷', '🚗', '✈️', '🎓', '💻', '🏥',
  '⚡', '📱', '🛡️', '🪙', '🏡', '🌱',
];
