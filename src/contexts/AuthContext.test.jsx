import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import api, { setAuthToken } from '../services/api';
import socket from '../services/socket';
import { flushEffects, mount } from '../testUtils';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  setAuthToken: jest.fn(),
}));
jest.mock('../services/socket', () => ({
  __esModule: true,
  default: { connect: jest.fn(), disconnect: jest.fn(), refreshAuth: jest.fn() },
}));

let currentAuth;
function CaptureAuth() {
  currentAuth = useAuth();
  return null;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    api.get.mockReset();
    setAuthToken.mockReset();
    socket.disconnect.mockReset();
  });

  test('does not invalidate the session after a network failure', async () => {
    api.get.mockRejectedValue({ code: 'ERR_NETWORK' });
    const page = await mount(<AuthProvider><CaptureAuth /></AuthProvider>);
    await flushEffects();
    expect(currentAuth.loading).toBe(false);
    expect(setAuthToken).not.toHaveBeenCalled();
    expect(currentAuth.user).toBeNull();
    await page.unmount();
  });

  test('clears the invalid token after the API rejects the session', async () => {
    api.get.mockRejectedValue({ response: { status: 401 } });
    const page = await mount(<AuthProvider><CaptureAuth /></AuthProvider>);
    await flushEffects();
    expect(currentAuth.loading).toBe(false);
    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(socket.disconnect).toHaveBeenCalled();
    await page.unmount();
  });
});
