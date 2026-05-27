import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
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
import type { Period, Transaction } from "./types";

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
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const period = periods.find((item) => item.id === activePeriod) ?? periods[4];

  const filteredTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesPeriod = period.months.includes(getMonth(transaction));
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

      return matchesPeriod && matchesQuery;
    });
  }, [period, query]);

  const insights = useMemo(() => {
    const revenue = filteredTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = filteredTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const averageTicket =
      filteredTransactions.filter((item) => item.type === "income").length > 0
        ? revenue /
          filteredTransactions.filter((item) => item.type === "income").length
        : 0;

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

    return {
      revenue,
      expenses,
      profit,
      margin,
      averageTicket,
      monthly,
      topCategories: Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      channels: Object.entries(byChannel).sort((a, b) => b[1] - a[1]),
    };
  }, [filteredTransactions]);

  const maxMonthlyValue = Math.max(
    1,
    ...insights.monthly.map((item) => Math.max(item.revenue, item.expenses)),
  );
  const maxCategoryValue = Math.max(
    1,
    ...insights.topCategories.map((item) => item[1]),
  );
  const maxChannelValue = Math.max(1, ...insights.channels.map((item) => item[1]));

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
          <div className="date-chip">
            <CalendarDays size={16} />
            Dados fictícios de 2026
          </div>
        </section>

        <section className="metric-grid" id="overview" aria-label="Indicadores">
          <MetricCard
            label="Receita"
            value={formatCurrency(insights.revenue)}
            hint={`${filteredTransactions.length} movimentos filtrados`}
            icon={<ArrowUpRight size={20} />}
            tone="income"
          />
          <MetricCard
            label="Despesas"
            value={formatCurrency(insights.expenses)}
            hint="Custos operacionais e externos"
            icon={<ArrowDownRight size={20} />}
            tone="expense"
          />
          <MetricCard
            label="Resultado"
            value={formatCurrency(insights.profit)}
            hint={`Margem líquida de ${insights.margin}%`}
            icon={<TrendingUp size={20} />}
            tone="profit"
          />
          <MetricCard
            label="Ticket médio"
            value={formatCurrency(insights.averageTicket)}
            hint="Média por venda registada"
            icon={<Wallet size={20} />}
            tone="neutral"
          />
        </section>

        <section className="dashboard-grid">
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
            </div>
          </article>
        </section>
      </main>
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
