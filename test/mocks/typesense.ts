export const Typesense = {
  Client: jest.fn().mockImplementation(() => ({
    collections: jest.fn().mockReturnThis(),
    documents: jest.fn().mockReturnThis(),
    search: jest.fn().mockResolvedValue({ hits: [] }),
  })),
};

export default Typesense;
