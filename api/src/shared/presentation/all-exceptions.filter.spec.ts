import { ArgumentsHost } from '@nestjs/common';
import { ForbiddenError, UnauthorizedError } from '../domain/errors';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(e: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(e, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('unauthorized → 401 e forbidden → 403', () => {
    expect(run(new UnauthorizedError('x'))).toEqual({
      status: 401,
      body: { statusCode: 401, message: 'x', error: 'Unauthorized' },
    });
    expect(run(new ForbiddenError('y'))).toEqual({
      status: 403,
      body: { statusCode: 403, message: 'y', error: 'Forbidden' },
    });
  });
});
