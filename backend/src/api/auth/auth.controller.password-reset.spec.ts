import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../domain/auth/auth.service';
import { PasswordResetService } from '../../domain/auth/password-reset.service';
import { PasswordChangeService } from '../../domain/auth/password-change.service';

describe('AuthController — password reset', () => {
  let controller: AuthController;
  const reset = {
    requestReset: jest.fn(),
    isTokenValid: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    reset.requestReset.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: PasswordResetService, useValue: reset },
        { provide: PasswordChangeService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('answers forgot-password identically for a known and an unknown address', async () => {
    const known = await controller.forgotPassword({
      email: 'jane@example.com',
    });
    const unknown = await controller.forgotPassword({
      email: 'nobody@example.com',
    });

    expect(known).toBeUndefined();
    expect(unknown).toBeUndefined();
    expect(reset.requestReset).toHaveBeenNthCalledWith(1, 'jane@example.com');
    expect(reset.requestReset).toHaveBeenNthCalledWith(2, 'nobody@example.com');
  });

  it('reports token validity', async () => {
    reset.isTokenValid.mockResolvedValue(false);
    await expect(controller.validateResetToken('abc')).resolves.toEqual({
      valid: false,
    });
  });

  it('returns an access token on a successful reset', async () => {
    reset.resetPassword.mockResolvedValue('signed.jwt.token');

    await expect(
      controller.resetPassword({ token: 'abc', password: 'new-password' }),
    ).resolves.toEqual({ accessToken: 'signed.jwt.token' });

    expect(reset.resetPassword).toHaveBeenCalledWith('abc', 'new-password');
  });

  it('lets the service’s rejection through unchanged', async () => {
    const failure = new Error('This reset link is no longer valid.');
    reset.resetPassword.mockRejectedValue(failure);

    await expect(
      controller.resetPassword({ token: 'abc', password: 'new-password' }),
    ).rejects.toThrow(failure);
  });
});
