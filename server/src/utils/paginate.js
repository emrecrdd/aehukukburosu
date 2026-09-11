export const paginate = (query, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    ...query,
    offset,
    limit: parseInt(limit, 10),
  };
};

export const getPaginationData = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};