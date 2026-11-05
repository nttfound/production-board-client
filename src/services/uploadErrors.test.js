import { getUploadErrorMessage } from './uploadErrors';

describe('getUploadErrorMessage', () => {
  test('shows a server permission or validation message', () => {
    expect(getUploadErrorMessage({ response: { data: { error: 'Sem permissao' } } })).toBe('Sem permissao');
  });

  test('shows a storage transport error instead of hiding it behind a generic label', () => {
    expect(getUploadErrorMessage(new Error('The signed upload token is invalid'))).toBe('The signed upload token is invalid');
  });

  test('uses the fallback for unstructured errors', () => {
    expect(getUploadErrorMessage({}, 'Falha no anexo')).toBe('Falha no anexo');
  });
});
