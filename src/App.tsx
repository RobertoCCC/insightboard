import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  LineChart,
  Menu,
  PieChart,
  ReceiptText,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { transactions } from "./data";
import type { Period, Transaction, TransactionType } from "./types";

const currency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const periods: Array<{ id: Period; label: string; months: number[] }> = [
  { id: "q1", label: "T1", months: [0, 1, 2] },
  { id: "q2", label: "T2", months: [3, 4, 5] },
  { id: "q3", label: "T3", months: [6, 7, 8] },
  { id: "q4", label: "T4", months: [9, 10, 11] },
  { id: "year", label: "Ano", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

const typeFilters: Array<{
  id: TransactionType | "all";
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "income", label: "Receita" },
  { id: "expense", label: "Despesa" },
];

const revenueGoalByPeriod: Record<Period, number> = {
  q1: 14000,
  q2: 16000,
  q3: 17500,
  q4: 22000,
  year: 70000,
};

const monthLabels = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatCurrency(value: number) {
  return currency.format(value);
}

function getMonth(transaction: Transaction) {
  return new Date(`${transaction.date}T00:00:00`).getMonth();
}

function getPreviousMonths(activePeriod: Period) {
  if (activePeriod === "q1") return [];
  if (activePeriod === "q2") return [0, 1, 2];
  if (activePeriod === "q3") return [3, 4, 5];
  if (activePeriod === "q4") return [6, 7, 8];
  return [0, 1, 2, 3, 4, 5];
}

function summarize(rows: Transaction[]) {
  const revenue = rows
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = rows
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const incomeCount = rows.filter((item) => item.type === "income").length;
  const averageTicket = incomeCount > 0 ? revenue / incomeCount : 0;

  return { revenue, expenses, profit, margin, averageTicket };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function formatChange(value: number) {
  if (value === 0) return "0% vs anterior";
  return `${value > 0 ? "+" : ""}${value}% vs anterior`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function exportTransactionsCsv(rows: Transaction[]) {
  const headers = [
    "Data",
    "Cliente",
    "Categoria",
    "Descricao",
    "Tipo",
    "Canal",
    "Valor",
  ];
  const csv = [
    headers,
    ...rows.map((item) => [
      item.date,
      item.client,
      item.category,
      item.description,
      item.type === "income" ? "Receita" : "Despesa",
      item.channel,
      item.amount,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "insightboard-transacoes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [activePeriod, setActivePeriod] = useState<Period>("year");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const period = periods.find((item) => item.id === activePeriod) ?? periods[4];

  const filteredTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesPeriod = period.months.includes(getMonth(transaction));
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      const matchesQuery =
        normalized.length === 0 ||
        [
          transaction.client,
          transaction.category,
          transaction.description,
          transaction.channel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesPeriod && matchesType && matchesQuery;
    });
  }, [period, query, typeFilter]);

  const comparison = useMemo(() => {
    const currentRows = transactions.filter((transaction) =>
      period.months.includes(getMonth(transaction)),
    );
    const previousMonths = getPreviousMonths(activePeriod);
    const previousRows = transactions.filter((transaction) =>
      previousMonths.includes(getMonth(transaction)),
    );
    const current = summarize(currentRows);
    const previous = summarize(previousRows);

    return {
      revenue: percentChange(current.revenue, previous.revenue),
      expenses: percentChange(current.expenses, previous.expenses),
      profit: percentChange(current.profit, previous.profit),
      margin: current.margin - previous.margin,
    };
  }, [activePeriod, period.months]);

  const insights = useMemo(() => {
    const summary = summarize(filteredTransactions);

    const monthly = monthLabels.map((month, index) => {
      const monthRows = filteredTransactions.filter(
        (item) => getMonth(item) === index,
      );
      const monthRevenue = monthRows
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);
      const monthExpenses = monthRows
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        month,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      };
    });

    const byCategory = filteredTransactions.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.amount;
        return acc;
      },
      {},
    );

    const byChannel = filteredTransactions.reduce<Record<string, number>>(
      (acc, item) => {
        if (item.type === "income") {
          acc[item.channel] = (acc[item.channel] ?? 0) + item.amount;
        }
        return acc;
      },
      {},
    );

    const byClient = filteredTransactions.reduce<Record<string, number>>(
      (acc, item) => {
        if (item.type === "income") {
          acc[item.client] = (acc[item.client] ?? 0) + item.amount;
        }
        return acc;
      },
      {},
    );

    return {
      ...summary,
      monthly,
      topCategories: Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      channels: Object.entries(byChannel).sort((a, b) => b[1] - a[1]),
      topClients: Object.entries(byClient)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [filteredTransactions]);

  const alerts = useMemo(() => {
    const largestExpense = filteredTransactions
      .filter((item) => item.type === "expense")
      .sort((a, b) => b.amount - a.amount)[0];
    const topClient = insights.topClients[0];
    const topClientShare =
      topClient && insights.revenue > 0
        ? Math.round((topClient[1] / insights.revenue) * 100)
        : 0;

    return [
      {
        tone: insights.margin >= 70 ? "positive" : "warning",
        title:
          insights.margin >= 70
            ? "Margem saudável"
            : "Margem a acompanhar",
        body:
          insights.margin >= 70
            ? `A margem líquida está em ${insights.margin}%, acima do alvo interno.`
            : `A margem está em ${insights.margin}%; rever custos e pricing.`
      },
      {
        tone: topClientShare > 30 ? "warning" : "neutral",
        title: "Concentração de cliente",
        body: topClient
          ? `${topClient[0]} representa ${topClientShare}% da receita filtrada.`
          : "Sem receita suficiente para calcular concentração.",
      },
      {
        tone: largestExpense && largestExpense.amount > 1200 ? "warning" : "positive",
        title: "Controlo de despesas",
        body: largestExpense
          ? `Maior despesa: ${largestExpense.category}, ${formatCurrency(
              largestExpense.amount,
            )}.`
          : "Não há despesas no filtro atual.",
      },
    ];
  }, [filteredTransactions, insights.margin, insights.revenue, insights.topClients]);

  const maxMonthlyValue = Math.max(
    1,
    ...insights.monthly.map((item) => Math.max(item.revenue, item.expenses)),
  );
  const maxCategoryValue = Math.max(
    1,
    ...insights.topCategories.map((item) => item[1]),
  );
  const maxChannelValue = Math.max(1, ...insights.channels.map((item) => item[1]));
  const revenueGoal = revenueGoalByPeriod[activePeriod];
  const revenueGoalProgress = Math.min(
    100,
    Math.round((insights.revenue / revenueGoal) * 100),
  );
  const revenueGap = Math.max(0, revenueGoal - insights.revenue);
  const topClient = insights.topClients[0];
  const bestChannel = insights.channels[0];
  const topCategory = insights.topCategories[0];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <LineChart size={21} />
          </div>
          <div>
            <strong>InsightBoard</strong>
            <span>Financeiro & BI</span>
          </div>
          <button
            className="icon-button sidebar-close"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Navegação principal">
          <a className="nav-item active" href="#overview">
            <Gauge size={18} />
            Visão geral
          </a>
          <a className="nav-item" href="#evolucao">
            <BarChart3 size={18} />
            Evolução
          </a>
          <a className="nav-item" href="#categorias">
            <PieChart size={18} />
            Categorias
          </a>
          <a className="nav-item" href="#transacoes">
            <ReceiptText size={18} />
            Transações
          </a>
        </nav>

        <div className="sidebar-summary">
          <span>Resumo executivo</span>
          <strong>{formatCurrency(insights.profit)}</strong>
          <p>
            Resultado líquido no período selecionado, com margem de{" "}
            {insights.margin}%.
          </p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <p className="eyebrow">Business intelligence</p>
            <h1>Dashboard financeiro para PMEs</h1>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar cliente, categoria ou canal"
                aria-label="Pesquisar transações"
              />
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => exportTransactionsCsv(filteredTransactions)}
            >
              <Download size={18} />
              Exportar CSV
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setReportOpen(true)}
            >
              <FileText size={18} />
              Gerar relatório
            </button>
          </div>
        </header>

        <section className="toolbar">
          <div className="periods" aria-label="Filtro por período">
            {periods.map((item) => (
              <button
                className={activePeriod === item.id ? "selected" : ""}
                type="button"
                key={item.id}
                onClick={() => setActivePeriod(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="type-filters" aria-label="Filtro por tipo">
            {typeFilters.map((item) => (
              <button
                className={typeFilter === item.id ? "selected" : ""}
                type="button"
                key={item.id}
                onClick={() => setTypeFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="date-chip">
            <CalendarDays size={16} />
            Dados fictícios de 2026
          </div>
        </section>

        <section className="metric-grid" id="overview" aria-label="Indicadores">
          <MetricCard
            label="Receita"
            value={formatCurrency(insights.revenue)}
            hint={formatChange(comparison.revenue)}
            icon={<ArrowUpRight size={20} />}
            tone="income"
          />
          <MetricCard
            label="Despesas"
            value={formatCurrency(insights.expenses)}
            hint={formatChange(comparison.expenses)}
            icon={<ArrowDownRight size={20} />}
            tone="expense"
          />
          <MetricCard
            label="Resultado"
            value={formatCurrency(insights.profit)}
            hint={formatChange(comparison.profit)}
            icon={<TrendingUp size={20} />}
            tone="profit"
          />
          <MetricCard
            label="Ticket médio"
            value={formatCurrency(insights.averageTicket)}
            hint={`Margem ${comparison.margin >= 0 ? "+" : ""}${comparison.margin} pts`}
            icon={<Wallet size={20} />}
            tone="neutral"
          />
        </section>

        <section className="dashboard-grid">
          <article className="panel goal-panel">
            <div className="panel-heading">
              <div>
                <h2>Meta de receita</h2>
                <p>Acompanhamento do objetivo comercial para o período.</p>
              </div>
              <span className="goal-badge">{revenueGoalProgress}%</span>
            </div>
            <div className="goal-body">
              <div>
                <span>Realizado</span>
                <strong>{formatCurrency(insights.revenue)}</strong>
              </div>
              <div>
                <span>Meta</span>
                <strong>{formatCurrency(revenueGoal)}</strong>
              </div>
            </div>
            <div className="goal-track">
              <span style={{ width: `${revenueGoalProgress}%` }} />
            </div>
            <p className="goal-note">
              {revenueGap > 0
                ? `Faltam ${formatCurrency(revenueGap)} para atingir a meta.`
                : "Meta atingida no período selecionado."}
            </p>
          </article>

          <article className="panel alerts-panel">
            <div className="panel-heading">
              <div>
                <h2>Alertas inteligentes</h2>
                <p>Sinais automáticos para apoiar decisões de gestão.</p>
              </div>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <div className={`alert-item ${alert.tone}`} key={alert.title}>
                  <span>
                    {alert.tone === "positive" ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <AlertTriangle size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel wide" id="evolucao">
            <div className="panel-heading">
              <div>
                <h2>Evolução mensal</h2>
                <p>Receita, despesas e resultado ao longo do período.</p>
              </div>
            </div>
            <div className="chart">
              {insights.monthly.map((item) => {
                const isVisible =
                  period.months.includes(monthLabels.indexOf(item.month)) ||
                  activePeriod === "year";
                return (
                  <div className={`month-group ${isVisible ? "" : "muted"}`} key={item.month}>
                    <div className="bars">
                      <span
                        className="bar income"
                        style={{
                          height: `${Math.max(4, (item.revenue / maxMonthlyValue) * 100)}%`,
                        }}
                      />
                      <span
                        className="bar expense"
                        style={{
                          height: `${Math.max(4, (item.expenses / maxMonthlyValue) * 100)}%`,
                        }}
                      />
                    </div>
                    <span>{item.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <span>
                <i className="legend-income" /> Receita
              </span>
              <span>
                <i className="legend-expense" /> Despesas
              </span>
            </div>
          </article>

          <article className="panel" id="categorias">
            <div className="panel-heading">
              <div>
                <h2>Categorias</h2>
                <p>Maiores blocos de receita e custo.</p>
              </div>
            </div>
            <div className="rank-list">
              {insights.topCategories.map(([category, value]) => (
                <div className="rank-item" key={category}>
                  <div>
                    <strong>{category}</strong>
                    <span>{formatCurrency(value)}</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${(value / maxCategoryValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>Canais</h2>
                <p>Origem da receita no período.</p>
              </div>
            </div>
            <div className="channel-list">
              {insights.channels.map(([channel, value]) => (
                <div className="channel-item" key={channel}>
                  <span>{channel}</span>
                  <strong>{formatCurrency(value)}</strong>
                  <div className="progress-track">
                    <span style={{ width: `${(value / maxChannelValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>Top clientes</h2>
                <p>Clientes com maior receita no período.</p>
              </div>
            </div>
            <div className="client-list">
              {insights.topClients.map(([client, value], index) => (
                <div className="client-item" key={client}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{client}</strong>
                    <small>{formatCurrency(value)}</small>
                  </div>
                </div>
              ))}
              {insights.topClients.length === 0 ? (
                <p className="empty-note">Sem receitas no filtro atual.</p>
              ) : null}
            </div>
          </article>

          <article className="panel transactions-panel" id="transacoes">
            <div className="panel-heading">
              <div>
                <h2>Transações</h2>
                <p>{filteredTransactions.length} movimentos no período selecionado.</p>
              </div>
              <FileText size={20} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Categoria</th>
                    <th>Canal</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-PT")}</td>
                      <td>
                        <strong>{item.client}</strong>
                        <small>{item.description}</small>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.channel}</td>
                      <td>
                        <span className={`type-pill ${item.type}`}>
                          {item.type === "income" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td className={item.type === "income" ? "money in" : "money out"}>
                        {item.type === "income" ? "+" : "-"}
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <strong>Sem transações encontradas</strong>
                  <p>Altera o período, tipo ou termo de pesquisa.</p>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </main>

      {reportOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="report-modal" aria-label="Relatório executivo">
            <div className="report-actions no-print">
              <button
                className="secondary-button"
                type="button"
                onClick={() => window.print()}
              >
                <Download size={18} />
                Exportar PDF
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label="Fechar relatório"
              >
                <X size={18} />
              </button>
            </div>

            <div className="print-report">
              <div className="report-head">
                <div>
                  <p className="eyebrow">Relatório executivo</p>
                  <h2>InsightBoard</h2>
                  <span>
                    Período: {period.label} · Tipo:{" "}
                    {typeFilters.find((item) => item.id === typeFilter)?.label}
                  </span>
                </div>
                <strong>{new Date().toLocaleDateString("pt-PT")}</strong>
              </div>

              <div className="report-grid">
                <ReportMetric label="Receita" value={formatCurrency(insights.revenue)} />
                <ReportMetric label="Despesas" value={formatCurrency(insights.expenses)} />
                <ReportMetric label="Resultado" value={formatCurrency(insights.profit)} />
                <ReportMetric label="Margem" value={`${insights.margin}%`} />
              </div>

              <div className="report-section">
                <h3>Resumo de gestão</h3>
                <p>
                  O período selecionado apresenta {formatCurrency(insights.revenue)} em
                  receita, {formatCurrency(insights.expenses)} em despesas e resultado
                  líquido de {formatCurrency(insights.profit)}. A meta de receita está
                  em {revenueGoalProgress}%.
                </p>
              </div>

              <div className="report-grid compact">
                <ReportMetric
                  label="Top cliente"
                  value={topClient ? topClient[0] : "Sem dados"}
                />
                <ReportMetric
                  label="Melhor canal"
                  value={bestChannel ? bestChannel[0] : "Sem dados"}
                />
                <ReportMetric
                  label="Categoria principal"
                  value={topCategory ? topCategory[0] : "Sem dados"}
                />
                <ReportMetric
                  label="Transações"
                  value={String(filteredTransactions.length)}
                />
              </div>

              <div className="report-section">
                <h3>Alertas</h3>
                <ul>
                  {alerts.map((alert) => (
                    <li key={alert.title}>
                      <strong>{alert.title}:</strong> {alert.body}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "income" | "expense" | "profit" | "neutral";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
