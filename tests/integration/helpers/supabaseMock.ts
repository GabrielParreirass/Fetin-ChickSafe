import { supabase } from "@/lib/supabase";

export type QueryResult<T = unknown> = {
  data: T;
  error: unknown;
};

export type MockQuery = {
  select: jest.Mock;
  insert: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  then: (
    onFulfilled?: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>;
};

export function createMockQuery<T = unknown>(result: QueryResult<T>): MockQuery {
  const query = {} as MockQuery;
  query.select = jest.fn(() => query);
  query.insert = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.maybeSingle = jest.fn(async () => result);
  query.single = jest.fn(async () => result);
  query.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
}

export function supabaseMocks() {
  return {
    from: supabase.from as jest.Mock,
    rpc: supabase.rpc as jest.Mock,
  };
}

export function resetSupabaseMocks() {
  const { from, rpc } = supabaseMocks();
  from.mockReset();
  rpc.mockReset();
}
