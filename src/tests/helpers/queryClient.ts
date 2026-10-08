import { QueryClient } from '@tanstack/react-query';

const clients = new Set<QueryClient>();

export const createTestQueryClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  clients.add(client);
  return client;
};

export const clearTestQueryClients = () => {
  clients.forEach((client) => client.clear());
  clients.clear();
};
