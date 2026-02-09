// Core WebSocket Hook

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ConnectionState,
  ServerEvent,
  ServerEventType,
  AgentCommand,
} from '@/lib/websocket/types';
import { WS_CONFIG, WS_CLOSE_CODES, WS_ERRORS } from '@/lib/websocket/constants';

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  onMessage?: (event: ServerEvent) => void;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: string) => void;
}

export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  send: (message: AgentCommand) => boolean;
  lastMessage: ServerEvent | null;
  error: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = WS_CONFIG.DEFAULT_URL,
    autoConnect = false,
    autoReconnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [lastMessage, setLastMessage] = useState<ServerEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(autoReconnect);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    cleanup();
    setConnectionState(ConnectionState.Connecting);
    setError(null);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setConnectionState(ConnectionState.Connected);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerEvent;
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      wsRef.current.onerror = () => {
        const errorMsg = WS_ERRORS.CONNECTION_FAILED;
        setError(errorMsg);
        setConnectionState(ConnectionState.Error);
        onError?.(errorMsg);
      };

      wsRef.current.onclose = (event) => {
        setConnectionState(ConnectionState.Disconnected);
        onDisconnect?.(event.code, event.reason);

        // Handle reconnection
        const shouldReconnect =
          shouldReconnectRef.current &&
          event.code !== WS_CLOSE_CODES.NORMAL &&
          event.code !== WS_CLOSE_CODES.AUTH_FAILED &&
          reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS;

        if (shouldReconnect) {
          const delay = Math.min(
            WS_CONFIG.RECONNECT_INTERVAL_BASE *
              Math.pow(WS_CONFIG.RECONNECT_MULTIPLIER, reconnectAttemptsRef.current),
            WS_CONFIG.RECONNECT_INTERVAL_MAX
          );

          reconnectAttemptsRef.current++;
          setConnectionState(ConnectionState.Reconnecting);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      const errorMsg = WS_ERRORS.CONNECTION_FAILED;
      setError(errorMsg);
      setConnectionState(ConnectionState.Error);
      onError?.(errorMsg);
    }
  }, [url, cleanup, onConnect, onMessage, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanup();

    if (wsRef.current) {
      wsRef.current.close(WS_CLOSE_CODES.NORMAL, 'Client disconnect');
      wsRef.current = null;
    }

    setConnectionState(ConnectionState.Disconnected);
  }, [cleanup]);

  const send = useCallback((message: AgentCommand): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connect, cleanup]);

  // Update reconnect preference when option changes
  useEffect(() => {
    shouldReconnectRef.current = autoReconnect;
  }, [autoReconnect]);

  return {
    connectionState,
    connect,
    disconnect,
    send,
    lastMessage,
    error,
  };
}
