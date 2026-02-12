/**
 * Map ABP error codes to human-readable messages with hints.
 */
export function mapAbpError(statusCode: number, errorData?: unknown): string {
  const data = errorData as Record<string, unknown> | null;

  if (!data || typeof data !== 'object') {
    return getGenericMessage(statusCode);
  }

  // ABP wraps errors in { error: { ... } }
  const error = ('error' in data ? data.error : data) as Record<string, unknown>;

  const code = error.code as string | undefined;
  const message = error.message as string | undefined;

  // Map specific ABP error codes
  if (code) {
    switch (code) {
      case 'Volo.Abp.Authorization:010001':
        return `Authorization failed: ${message}. Check that the API key has the required permission.`;
      case 'Volo.Abp.Validation':
        return formatValidationError(error);
      default:
        return `${code}: ${message}`;
    }
  }

  return message ?? getGenericMessage(statusCode);
}

function formatValidationError(error: Record<string, unknown>): string {
  const parts = [error.message as string ?? 'Validation failed'];

  if (error.validationErrors && Array.isArray(error.validationErrors)) {
    for (const v of error.validationErrors as Array<{ message: string; members?: string[] }>) {
      const fields = v.members?.join(', ') ?? 'general';
      parts.push(`  ${fields}: ${v.message}`);
    }
  }

  return parts.join('\n');
}

function getGenericMessage(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'Bad request — check the parameters';
    case 401: return 'Unauthorized — check your API key (FINIQ_API_KEY)';
    case 403: return 'Forbidden — the API key lacks the required permission';
    case 404: return 'Not found — the resource does not exist';
    case 409: return 'Conflict — the resource was modified by another request';
    case 500: return 'Internal server error';
    default: return `HTTP ${statusCode}`;
  }
}
