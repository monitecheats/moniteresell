export function audit(event: string, details: Record<string, unknown>) {
  console.info(`[AUDIT] ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
}

export function security(event: string, details: Record<string, unknown>) {
  console.warn(`[SECURITY] ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
}
