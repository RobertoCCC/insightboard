export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  date: string;
  client: string;
  category: string;
  description: string;
  amount: number;
  type: TransactionType;
  channel: "Online" | "Loja" | "Parceiro" | "Recorrente";
};

export type Period = "q1" | "q2" | "q3" | "q4" | "year";
