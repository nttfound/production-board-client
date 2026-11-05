export function getUploadErrorMessage(error, fallback = 'Nao foi possivel enviar o arquivo.') {
  const candidates = [
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.error,
    error?.message,
  ];
  const message = candidates.find(value => typeof value === 'string' && value.trim());
  return message ? message.trim() : fallback;
}
