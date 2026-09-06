/**
 * Money-zen — ExportService (Phase 14).
 *
 * Spec section 36 : CSV pour les transactions, PDF pour rapport mensuel.
 * Utilise expo-print + expo-sharing.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { listTransactions } from '@database/repositories/transactionRepository';
import { listAccounts } from '@database/repositories/accountRepository';
import { getCategoryById } from '@database/repositories/categoryRepository';
import { formatMoney } from '@utils/money';
import { useSettingsStore } from '@stores/settingsStore';
import { format } from 'date-fns';
import type { ISODateString } from '@types/index';

export const ExportService = {
  /**
   * Export CSV : liste des transactions filtrées par période.
   * Format : date, type, account, category, description, amount, currency, converted, baseCurrency, rate
   */
  async exportTransactionsToCsv(dateFrom?: ISODateString, dateTo?: ISODateString): Promise<string> {
    const baseCurrency = useSettingsStore.getState().settings.baseCurrency;
    const language = useSettingsStore.getState().settings.language;
    const accounts = listAccounts();
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const transactions = listTransactions({ dateFrom, dateTo, limit: 10000 });

    const rows: string[] = [];
    rows.push('Date;Type;Compte;Categorie;Description;Montant;Devise;Montant converti;Devise principale;Taux');
    for (const tx of transactions) {
      const account = tx.accountId ? accountMap.get(tx.accountId) : null;
      const category = tx.categoryId ? getCategoryById(tx.categoryId) : null;
      const escapedDesc = (tx.description ?? '').replace(/"/g, '""');
      rows.push(
        [
          format(new Date(tx.date), 'dd/MM/yyyy'),
          tx.type,
          account?.name ?? '',
          category?.name ?? '',
          `"${escapedDesc}"`,
          tx.amountMinor,
          tx.currencyCode,
          tx.convertedAmountMinor,
          tx.baseCurrencyCode,
          tx.exchangeRate,
        ].join(';'),
      );
    }
    const csv = rows.join('\n');
    const fileName = `money-zen-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    return fileUri;
  },

  async shareTransactionsCsv(dateFrom?: ISODateString, dateTo?: ISODateString): Promise<void> {
    const fileUri = await this.exportTransactionsToCsv(dateFrom, dateTo);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exporter transactions' });
    }
  },

  /**
   * Export PDF : rapport mensuel.
   * Spec : revenus, dépenses, catégories, budgets, patrimoine.
   */
  async exportMonthlyReportPdf(year: number, month: number): Promise<string> {
    const baseCurrency = useSettingsStore.getState().settings.baseCurrency;
    const language = useSettingsStore.getState().settings.language;
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const accounts = listAccounts();
    const transactions = listTransactions({ dateFrom: startDate, dateTo: endDate, limit: 10000 });
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((a, t) => a + t.convertedAmountMinor, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + t.convertedAmountMinor, 0);
    const totalWealth = accounts.reduce((acc, a) => acc + a.currentBalanceMinor, 0);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, 'Helvetica', sans-serif; padding: 24px; color: #3D332B; background: #FBF7F0; }
            h1 { color: #B5533C; }
            .stat { display: inline-block; padding: 12px 16px; margin: 4px; background: white; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #EBE0CD; }
            .positive { color: #5C8B73; }
            .negative { color: #9B4F3C; }
          </style>
        </head>
        <body>
          <h1>Money-zen — Rapport ${format(new Date(year, month - 1, 1), 'MMMM yyyy')}</h1>
          <div class="stat">Patrimoine total : <strong>${formatMoney(totalWealth, baseCurrency, language)}</strong></div>
          <div class="stat positive">Revenus : +${formatMoney(totalIncome, baseCurrency, language)}</div>
          <div class="stat negative">Dépenses : -${formatMoney(totalExpense, baseCurrency, language)}</div>
          <div class="stat">Solde net : ${formatMoney(totalIncome - totalExpense, baseCurrency, language)}</div>
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Compte</th><th>Montant</th><th>Devise</th></tr></thead>
            <tbody>
              ${transactions
                .map(
                  (tx) =>
                    `<tr><td>${format(new Date(tx.date), 'dd/MM')}</td><td>${tx.description}</td><td>${tx.accountId}</td><td>${tx.amountMinor}</td><td>${tx.currencyCode}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  async shareMonthlyReportPdf(year: number, month: number): Promise<void> {
    const uri = await this.exportMonthlyReportPdf(year, month);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Rapport mensuel' });
    }
  },
};
