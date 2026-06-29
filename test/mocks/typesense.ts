export const Typesense = {
  Client: vi.fn().mockImplementation(() => ({
    collections: vi.fn().mockReturnThis(),
    documents: vi.fn().mockReturnThis(),
    search: vi.fn().mockResolvedValue({ hits: [] }),
  })),
};

export default Typesense;
