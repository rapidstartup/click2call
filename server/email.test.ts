import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSmtpMessage,
  createLeadEmailSender,
  sanitizeHeader,
  sendSmtpEmail,
} from './email';
import type { SmtpConnect, SmtpSocketLike } from './email';

class FakeSocket implements SmtpSocketLike {
  readonly writes: string[] = [];
  private readonly listeners = new Map<string, (...args: never[]) => void>();
  private readonly failAuth: boolean;

  constructor(failAuth = false) {
    this.failAuth = failAuth;
    queueMicrotask(() => this.emit('data', '220 smtp.example.test ready\r\n'));
  }

  write(data: string): void {
    this.writes.push(data);
    if (data === 'EHLO click2call.ai\r\n') {
      this.emit('data', '250-smtp.example.test\r\n250 AUTH LOGIN\r\n');
    } else if (data === 'AUTH LOGIN\r\n') {
      this.emit('data', '334 VXNlcm5hbWU6\r\n');
    } else if (data === Buffer.from('user@example.com', 'utf8').toString('base64') + '\r\n') {
      this.emit('data', '334 UGFzc3dvcmQ6\r\n');
    } else if (data === Buffer.from('secret', 'utf8').toString('base64') + '\r\n') {
      this.emit('data', this.failAuth ? '535 Authentication failed\r\n' : '235 Authentication successful\r\n');
    } else if (data === 'MAIL FROM:<sender@example.com>\r\n') {
      this.emit('data', '250 Sender accepted\r\n');
    } else if (data === 'RCPT TO:<owner@example.com>\r\n') {
      this.emit('data', '250 Recipient accepted\r\n');
    } else if (data === 'DATA\r\n') {
      this.emit('data', '354 End data with <CR><LF>.<CR><LF>\r\n');
    } else if (data.endsWith('\r\n.\r\n')) {
      this.emit('data', '250 Message accepted\r\n');
    }
  }

  end(): void {}

  on(
    event: 'data' | 'error' | 'close' | 'end',
    listener: (...args: never[]) => void,
  ): void {
    this.listeners.set(event, listener);
  }

  destroy(): void {}

  setTimeout(ms: number): void { void ms; }

  emit(event: string, data?: string): void {
    const listener = this.listeners.get(event);
    if (listener) listener(data as never);
  }
}

function connectFor(socket: FakeSocket): SmtpConnect {
  return () => socket;
}

const message = {
  to: 'owner@example.com',
  from: 'sender@example.com',
  subject: 'New lead',
  text: 'Hello from the caller.',
};

test('sanitizeHeader removes line breaks and null bytes', () => {
  assert.equal(sanitizeHeader('Hi\r\nBcc: x@y.com\0'), 'HiBcc: x@y.com');
});

test('buildSmtpMessage uses CRLF headers and does not add an SMTP terminator', () => {
  const payload = buildSmtpMessage({
    ...message,
    subject: 'New\r\nBcc: attacker@example.com',
  });
  assert.match(payload, /From: sender@example.com\r\n/);
  assert.match(payload, /To: owner@example.com\r\n/);
  assert.match(payload, /Subject: NewBcc: attacker@example.com\r\n/);
  assert.match(payload, /\r\n\r\nHello from the caller\./);
  assert.equal(payload.includes('\r\n.\r\n'), false);

  const named = buildSmtpMessage({ ...message, fromName: 'Click2Call' });
  assert.match(named, /From: Click2Call <sender@example.com>\r\n/);
});

test('sendSmtpEmail sequences the SMTP dialogue and sends the DATA payload', async () => {
  const socket = new FakeSocket();
  const result = await sendSmtpEmail({
    host: 'smtp.example.test',
    port: 587,
    user: 'user@example.com',
    pass: 'secret',
    message,
    connect: connectFor(socket),
  });

  assert.deepEqual(result, { ok: true, code: '250' });
  assert.equal(socket.writes[0], 'EHLO click2call.ai\r\n');
  assert.equal(socket.writes[1], 'AUTH LOGIN\r\n');
  assert.equal(socket.writes[2], Buffer.from('user@example.com', 'utf8').toString('base64') + '\r\n');
  assert.equal(socket.writes[3], Buffer.from('secret', 'utf8').toString('base64') + '\r\n');
  assert.equal(socket.writes[4], 'MAIL FROM:<sender@example.com>\r\n');
  assert.equal(socket.writes[5], 'RCPT TO:<owner@example.com>\r\n');
  assert.equal(socket.writes[6], 'DATA\r\n');
  assert.match(socket.writes[7], /Subject: New lead\r\n\r\nHello from the caller\.\r\n\.\r\n/);
  assert.equal(socket.writes[8], 'QUIT\r\n');
});

test('sendSmtpEmail returns the SMTP error code without throwing', async () => {
  const socket = new FakeSocket(true);
  const result = await sendSmtpEmail({
    host: 'smtp.example.test',
    user: 'user@example.com',
    pass: 'secret',
    message,
    connect: connectFor(socket),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, '535');
});

test('sendSmtpEmail returns a failed result when connect throws', async () => {
  const result = await sendSmtpEmail({
    host: 'smtp.example.test',
    user: 'user@example.com',
    pass: 'secret',
    message,
    connect: () => {
      throw new Error('connect failed');
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.error || '', /connect failed/);
});

test('createLeadEmailSender reports missing SMTP configuration', async () => {
  const sender = createLeadEmailSender({});
  assert.deepEqual(await sender(message), {
    delivered: false,
    reason: 'SMTP not configured',
  });
});

test('createLeadEmailSender maps an injected successful SMTP send', async () => {
  let capturedFrom = '';
  const sender = createLeadEmailSender({
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'user@example.com',
    SMTP_PASS: 'secret',
    SMTP_PORT: '587',
    EMAIL_FROM: 'sender@example.com',
    EMAIL_FROM_NAME: 'Click2Call',
  }, async (input) => {
    capturedFrom = input.message.from;
    return { ok: true, code: '250' };
  });

  assert.deepEqual(await sender(message), { delivered: true });
  assert.equal(capturedFrom, 'sender@example.com');
});

