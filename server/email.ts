import * as net from 'node:net';
import * as tls from 'node:tls';

export interface EmailMessage {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text: string;
}

export interface SmtpSocketLike {
  write(data: string): void;
  end(): void;
  on(
    event: 'data' | 'error' | 'close' | 'end',
    listener: (...args: never[]) => void,
  ): void;
  destroy(): void;
  setTimeout(ms: number): void;
}

export interface SmtpConnect {
  (port: number, host: string, secure: boolean): SmtpSocketLike;
}

export function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n\0]/g, '');
}

function crlf(value: string): string {
  return value.replace(/\r\n|\r|\n/g, '\r\n');
}

export function buildSmtpMessage(message: EmailMessage): string {
  const fromName = message.fromName ? sanitizeHeader(message.fromName) : '';
  const from = sanitizeHeader(message.from);
  const to = sanitizeHeader(message.to);
  const subject = sanitizeHeader(message.subject);
  const fromHeader = fromName ? fromName + ' <' + from + '>' : from;
  return [
    'From: ' + fromHeader,
    'To: ' + to,
    'Subject: ' + subject,
    '',
    crlf(message.text),
  ].join('\r\n');
}

export interface SmtpSendResult {
  ok: boolean;
  code?: string;
  error?: string;
}

export interface SendSmtpEmailInput {
  host: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
  message: EmailMessage;
  connect?: SmtpConnect;
  timeoutMs?: number;
}

interface SmtpReply {
  code: string;
  lines: string[];
  valid: boolean;
}

interface ReplyReader {
  buffer: string;
  pending: ((reply: SmtpReply | null) => void) | null;
}

interface TimeoutSocketLike {
  on(event: 'timeout', listener: (...args: never[]) => void): void;
}

function defaultConnect(port: number, host: string, secure: boolean): SmtpSocketLike {
  if (secure) {
    return tls.connect({ port, host, rejectUnauthorized: true }) as unknown as SmtpSocketLike;
  }
  return net.connect({ port, host }) as unknown as SmtpSocketLike;
}

function replyFromBuffer(reader: ReplyReader): SmtpReply | null {
  const lines = reader.buffer.split('\r\n');
  if (lines.length < 2 || lines[lines.length - 1] !== '') return null;

  const completeLines = lines.slice(0, -1);
  const terminalIndex = completeLines.findIndex((line) => /^\d{3} /.test(line));
  if (terminalIndex < 0) return null;

  const replyLines = completeLines.slice(0, terminalIndex + 1);
  const terminal = replyLines[replyLines.length - 1];
  if (!terminal) return null;

  const code = terminal.slice(0, 3);
  const valid = replyLines.every((line) => new RegExp('^' + code + '(?:-| )').test(line));
  reader.buffer = lines.slice(terminalIndex + 1).join('\r\n');
  return { code, lines: replyLines, valid };
}

function replyError(reply: SmtpReply, expected: string): string {
  const detail = reply.lines[reply.lines.length - 1]?.slice(4).trim();
  return detail
    ? 'Expected ' + expected + ', received ' + reply.code + ': ' + detail
    : 'Expected ' + expected + ', received ' + reply.code;
}

export async function sendSmtpEmail(input: SendSmtpEmailInput): Promise<SmtpSendResult> {
  const secure = input.secure ?? false;
  const port = input.port ?? (secure ? 465 : 587);
  const timeoutMs = input.timeoutMs ?? 10_000;
  let socket: SmtpSocketLike | null = null;
  let settled = false;
  let resolveResult: ((result: SmtpSendResult) => void) | null = null;
  const reader: ReplyReader = { buffer: '', pending: null };

  const result = new Promise<SmtpSendResult>((resolve) => {
    resolveResult = resolve;
  });

  const settle = (value: SmtpSendResult, destroy: boolean): void => {
    if (settled) return;
    settled = true;
    const pending = reader.pending;
    reader.pending = null;
    pending?.(null);
    if (destroy) socket?.destroy();
    resolveResult?.(value);
  };

  const finishFailure = (error: string, code?: string): void => {
    settle({
      ok: false,
      ...(code ? { code } : {}),
      error,
    }, true);
  };

  try {
    socket = (input.connect || defaultConnect)(port, input.host, secure);
    socket.setTimeout(timeoutMs);
    socket.on('data', ((...args: never[]) => {
      const data: unknown = args[0];
      reader.buffer += Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      if (!reader.pending) return;
      const reply = replyFromBuffer(reader);
      if (!reply) return;
      const pending = reader.pending;
      reader.pending = null;
      pending(reply);
    }) as (...args: never[]) => void);
    socket.on('error', (() => finishFailure('SMTP socket error')) as (...args: never[]) => void);
    socket.on('close', (() => finishFailure('SMTP socket closed')) as (...args: never[]) => void);
    socket.on('end', (() => finishFailure('SMTP socket ended')) as (...args: never[]) => void);
    (socket as unknown as TimeoutSocketLike).on(
      'timeout',
      (() => finishFailure('SMTP socket timed out')) as (...args: never[]) => void,
    );
  } catch (error) {
    settle({
      ok: false,
      error: error instanceof Error ? error.message : 'SMTP connection failed',
    }, false);
    return result;
  }

  const readReply = (): Promise<SmtpReply | null> => new Promise((resolve) => {
    const reply = replyFromBuffer(reader);
    if (reply) {
      resolve(reply);
      return;
    }
    reader.pending = resolve;
  });

  const expect = async (expected: string): Promise<boolean> => {
    const reply = await readReply();
    if (settled || !reply) return false;
    if (!reply.valid || reply.code !== expected) {
      finishFailure(replyError(reply, expected), reply.code);
      return false;
    }
    return true;
  };

  const writeLine = (line: string): void => {
    socket?.write(line + '\r\n');
  };

  if (!await expect('220')) return result;
  writeLine('EHLO click2call.ai');
  if (!await expect('250')) return result;
  writeLine('AUTH LOGIN');
  if (!await expect('334')) return result;
  writeLine(Buffer.from(input.user, 'utf8').toString('base64'));
  if (!await expect('334')) return result;
  writeLine(Buffer.from(input.pass, 'utf8').toString('base64'));
  if (!await expect('235')) return result;
  writeLine('MAIL FROM:<' + sanitizeHeader(input.message.from) + '>');
  if (!await expect('250')) return result;
  writeLine('RCPT TO:<' + sanitizeHeader(input.message.to) + '>');
  if (!await expect('250')) return result;
  writeLine('DATA');
  if (!await expect('354')) return result;
  socket?.write(buildSmtpMessage(input.message) + '\r\n.\r\n');
  if (!await expect('250')) return result;
  writeLine('QUIT');
  socket?.end();
  settle({ ok: true, code: '250' }, false);
  return result;
}

export interface EmailSender {
  (message: EmailMessage): Promise<{ delivered: boolean; reason?: string }>;
}

type SmtpSend = (input: SendSmtpEmailInput) => Promise<SmtpSendResult>;

export function createLeadEmailSender(
  env: Record<string, string | undefined> = process.env,
  send: SmtpSend = sendSmtpEmail,
): EmailSender {
  const host = env.SMTP_HOST?.trim() || '';
  const user = env.SMTP_USER?.trim() || '';
  const pass = env.SMTP_PASS?.trim() || '';
  const from = env.EMAIL_FROM?.trim() || '';
  if (!host || !user || !pass || !from) {
    return async () => ({ delivered: false, reason: 'SMTP not configured' });
  }

  const parsedPort = env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined;
  const port = parsedPort && Number.isFinite(parsedPort) ? parsedPort : undefined;
  const secure = env.SMTP_SECURE?.trim().toLowerCase() === 'true';
  const fromName = env.EMAIL_FROM_NAME?.trim() || undefined;

  return async (message) => {
    try {
      const sendResult = await send({
        host,
        port,
        secure,
        user,
        pass,
        message: { ...message, from, fromName },
      });
      if (sendResult.ok) return { delivered: true };
      return {
        delivered: false,
        reason: sendResult.error || sendResult.code || 'SMTP delivery failed',
      };
    } catch (error) {
      return {
        delivered: false,
        reason: error instanceof Error ? error.message : 'SMTP delivery failed',
      };
    }
  };
}


