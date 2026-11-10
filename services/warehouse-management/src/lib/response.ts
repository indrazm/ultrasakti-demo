export const ok = (data: unknown, message = "OK") => ({
  success: true,
  message,
  data,
});

export const paginated = <T>(data: T[], total: number, page: number, limit: number) => ({
  success: true,
  message: "OK",
  data,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
});

export const err = (message: string, status = 400) => {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  throw e;
};
