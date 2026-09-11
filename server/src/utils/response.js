const sanitizeStatusCode = (statusCode, fallback) => {
  const parsedStatusCode = Number.parseInt(statusCode, 10);

  if (
    !Number.isInteger(parsedStatusCode) ||
    parsedStatusCode < 100 ||
    parsedStatusCode > 599
  ) {
    return fallback;
  }

  return parsedStatusCode;
};

export const successResponse = (
  res,
  data = null,
  message = 'İşlem başarılı',
  statusCode = 200,
  meta = null
) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta && typeof meta === 'object') {
    response.meta = meta;
  }

  return res
    .status(sanitizeStatusCode(statusCode, 200))
    .json(response);
};

export const errorResponse = (
  res,
  message = 'İşlem tamamlanamadı',
  statusCode = 500,
  details = null
) => {
  const response = {
    success: false,
    message,
  };

  if (details?.code) {
    response.code = details.code;
  }

  if (details?.errors) {
    response.errors = details.errors;
  }

  if (details?.requestId) {
    response.requestId = details.requestId;
  }

  if (details?.retryable !== undefined) {
    response.retryable = Boolean(details.retryable);
  }

  return res
    .status(sanitizeStatusCode(statusCode, 500))
    .json(response);
};

export const paginatedResponse = (
  res,
  data,
  pagination,
  message = 'Kayıtlar getirildi',
  statusCode = 200
) => {
  const total = Number(pagination?.total) || 0;
  const page = Math.max(Number(pagination?.page) || 1, 1);
  const limit = Math.max(Number(pagination?.limit) || 10, 1);

  const calculatedTotalPages = Math.ceil(total / limit);

  return res
    .status(sanitizeStatusCode(statusCode, 200))
    .json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages:
          Number(pagination?.totalPages) ||
          calculatedTotalPages,
        hasNextPage: page < calculatedTotalPages,
        hasPreviousPage: page > 1,
      },
    });
};