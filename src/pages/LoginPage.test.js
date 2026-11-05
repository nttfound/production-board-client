import React from 'react';
import LoginPage from './LoginPage';
import { mount, setInput, submit } from '../testUtils';

const mockLogin = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

describe('LoginPage', () => {
  beforeEach(() => mockLogin.mockReset());

  async function fillAndSubmit(container) {
    await setInput(container.querySelector('#login-username'), 'operator');
    await setInput(container.querySelector('#login-password'), 'secret');
    await submit(container.querySelector('form'));
  }

  test('submits credentials through the existing authentication provider', async () => {
    mockLogin.mockResolvedValue({ username: 'operator' });
    const page = await mount(<LoginPage />);
    await fillAndSubmit(page.container);
    expect(mockLogin).toHaveBeenCalledWith('operator', 'secret');
    await page.unmount();
  });

  test('shows a credential error for rejected credentials', async () => {
    mockLogin.mockRejectedValue({ response: { status: 401 } });
    const page = await mount(<LoginPage />);
    await fillAndSubmit(page.container);
    expect(page.container.querySelector('[role="alert"]')?.textContent).toContain('Usuário ou senha inválidos.');
    await page.unmount();
  });

  test('distinguishes network failures from rejected credentials', async () => {
    mockLogin.mockRejectedValue(new Error('Network Error'));
    const page = await mount(<LoginPage />);
    await fillAndSubmit(page.container);
    expect(page.container.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao serviço.');
    await page.unmount();
  });
});
