import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../../common/Icon';
import './ApiRequestTester.css';
import type {
  HttpMethod,
  BodyMode,
  RequestConfig,
  ResponseState,
  HistoryEntry,
} from './types';
import { createId, HTTP_METHODS, methodAllowsBody, methodHasNoBody } from './types';

const EMPTY_RESPONSE: ResponseState = {
  status: null,
  statusText: null,
  headers: {},
  body: null,
  bodyIsJson: false,
  durationMs: null,
  sizeBytes: null,
  error: null,
  isCorsError: false,
  isNetworkError: false,
  isAbortError: false,
  isValidationError: false,
  validationMessage: null,
};

const STATUS_CLASSES: Record<string, string> = {
  2: 'status-code--success',
  3: 'status-code--redirect',
  4: 'status-code--error',
  5: 'status-code--error',
};

function getStatusClass(status: number | null): string {
  if (!status) return '';
  const prefix = String(status)[0];
  return STATUS_CLASSES[prefix] || '';
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isJsonContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return lower.includes('application/json') || lower.includes('application/*+json');
}

export default function ApiRequestTester() {
  const [config, setConfig] = useState<RequestConfig>({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    params: [],
    headers: [],
    bodyMode: 'none',
    body: '',
  });

  const [response, setResponse] = useState<ResponseState>(EMPTY_RESPONSE);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form state for new params/headers
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  // Validation
  const urlError = config.url && !/^https?:\/\/.+/i.test(config.url)
    ? 'URL must use http:// or https://'
    : config.url && !/^https?:\/\/.+/i.test(config.url)
      ? null
      : null;

  const isUrlValid = config.url.trim() && /^https?:\/\/.+/i.test(config.url);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUrlValid) return;

    setIsSubmitting(true);
    setResponse(EMPTY_RESPONSE);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    // Build URL with query params
    let requestUrl: string;
    try {
      const urlObj = new URL(config.url);
      config.params
        .filter((p) => p.enabled && p.key.trim())
        .forEach((p) => {
          urlObj.searchParams.append(p.key, p.value);
        });
      requestUrl = urlObj.toString();
    } catch {
      setResponse({
        ...EMPTY_RESPONSE,
        error: 'Invalid URL',
        isValidationError: true,
        validationMessage: 'The URL is invalid',
        durationMs: 0,
      });
      setIsSubmitting(false);
      return;
    }

    // Prepare body
    let bodyInit: BodyInit | undefined;
    const requestBody = config.bodyMode === 'none' ? '' : config.body;

    if (config.bodyMode === 'json' && requestBody.trim()) {
      try {
        bodyInit = JSON.parse(requestBody);
      } catch {
        setResponse({
          ...EMPTY_RESPONSE,
          error: 'Invalid JSON in request body',
          isValidationError: true,
          validationMessage: 'Please enter valid JSON',
          durationMs: 0,
        });
        setIsSubmitting(false);
        return;
      }
    } else if (config.bodyMode === 'text' && requestBody.trim()) {
      bodyInit = requestBody;
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {};
    config.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        requestHeaders[h.key] = h.value;
      });

    // Add Content-Type based on body mode
    if (config.bodyMode === 'json' && requestBody.trim()) {
      requestHeaders['Content-Type'] = 'application/json';
    } else if (config.bodyMode === 'text' && requestBody.trim() && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'text/plain';
    }

    // Don't send body for GET/HEAD
    if (methodHasNoBody(config.method)) {
      bodyInit = undefined;
    }

    const startTime = performance.now();

    try {
      const response = await fetch(requestUrl, {
        method: config.method,
        headers: requestHeaders,
        body: bodyInit,
        signal: abortCtrl.signal,
      });

      const durationMs = Math.round(performance.now() - startTime);

      let responseBody: string | null = null;
      let responseIsJson = false;

      const contentType = response.headers.get('content-type');
      if (contentType && isJsonContentType(contentType)) {
        responseIsJson = true;
      }

      try {
        responseBody = await response.text();
      } catch {
        responseBody = null;
      }

      if (responseIsJson && responseBody) {
        try {
          JSON.parse(responseBody);
        } catch {
          responseIsJson = false;
        }
      }

      if (!responseBody || responseBody.length === 0) {
        responseIsJson = false;
        responseBody = null;
      }

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        bodyIsJson: responseIsJson,
        durationMs,
        sizeBytes: responseBody ? new TextEncoder().encode(responseBody).length : null,
        error: null,
        isCorsError: false,
        isNetworkError: false,
        isAbortError: false,
        isValidationError: false,
        validationMessage: null,
      });

      // Add to history
      const historyEntry: HistoryEntry = {
        id: createId(),
        method: config.method,
        url: config.url,
        status: response.status,
        statusText: response.statusText,
        durationMs,
        timestamp: Date.now(),
        config: { ...config },
      };
      setHistory((prev) => [historyEntry, ...prev].slice(0, 50));
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      const err = error as Error;

      if (abortCtrl.signal.aborted || err.name === 'AbortError') {
        setResponse({
          ...EMPTY_RESPONSE,
          error: 'Request aborted',
          isAbortError: true,
          durationMs,
        });
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        // CORS or network error
        setResponse({
          ...EMPTY_RESPONSE,
          error: 'Network error or CORS blocked. The browser may have blocked this request due to CORS restrictions.',
          isCorsError: true,
          isNetworkError: true,
          durationMs,
        });
      } else {
        setResponse({
          ...EMPTY_RESPONSE,
          error: err.message || 'Unknown error',
          isNetworkError: true,
          durationMs,
        });
      }
    } finally {
      setIsSubmitting(false);
      setHasActiveRequest(false);
      abortControllerRef.current = null;
    }
  }, [config, isUrlValid]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setHasActiveRequest(false);
  }, []);

const handleClear = useCallback(() => {
    setResponse(EMPTY_RESPONSE);
    setConfig({
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      params: [],
      headers: [],
      bodyMode: 'none',
      body: '',
    });
    setNewParamKey('');
    setNewParamValue('');
    setNewHeaderKey('');
    setNewHeaderValue('');
    setHasActiveRequest(false);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setConfig(entry.config);
    setNewParamKey('');
    setNewParamValue('');
    setNewHeaderKey('');
    setNewHeaderValue('');
  }, []);

  const handleAddParam = useCallback(() => {
    if (!newParamKey.trim()) return;
    setConfig((prev) => ({
      ...prev,
      params: [
        ...prev.params,
        { id: createId(), key: newParamKey, value: newParamValue, enabled: true },
      ],
    }));
    setNewParamKey('');
    setNewParamValue('');
  }, [newParamKey, newParamValue]);

  const handleRemoveParam = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      params: prev.params.filter((p) => p.id !== id),
    }));
  }, []);

  const handleAddHeader = useCallback(() => {
    if (!newHeaderKey.trim()) return;
    setConfig((prev) => ({
      ...prev,
      headers: [
        ...prev.headers,
        { id: createId(), key: newHeaderKey, value: newHeaderValue, enabled: true },
      ],
    }));
    setNewHeaderKey('');
    setNewHeaderValue('');
  }, [newHeaderKey, newHeaderValue]);

  const handleRemoveHeader = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      headers: prev.headers.filter((h) => h.id !== id),
    }));
  }, []);

  const handleMethodChange = useCallback((method: HttpMethod) => {
    setConfig((prev) => {
      const next = { ...prev, method };
      if (methodHasNoBody(method)) {
        next.bodyMode = 'none';
      }
      return next;
    });
  }, []);

  const handleBodyModeChange = useCallback((mode: BodyMode) => {
    setConfig((prev) => ({ ...prev, bodyMode: mode }));
  }, []);

  const handleUrlChange = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, url }));
    setResponse(EMPTY_RESPONSE);
  }, []);

  const handleParamEnabledChange = useCallback((id: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      params: prev.params.map((p) => (p.id === id ? { ...p, enabled } : p)),
    }));
  }, []);

  const handleParamKeyChange = useCallback((id: string, key: string) => {
    setConfig((prev) => ({
      ...prev,
      params: prev.params.map((p) => (p.id === id ? { ...p, key } : p)),
    }));
  }, []);

  const handleParamValueChange = useCallback((id: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      params: prev.params.map((p) => (p.id === id ? { ...p, value } : p)),
    }));
  }, []);

  const handleHeaderEnabledChange = useCallback((id: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      headers: prev.headers.map((h) => (h.id === id ? { ...h, enabled } : h)),
    }));
  }, []);

  const handleHeaderKeyChange = useCallback((id: string, key: string) => {
    setConfig((prev) => ({
      ...prev,
      headers: prev.headers.map((h) => (h.id === id ? { ...h, key } : h)),
    }));
  }, []);

  const handleHeaderValueChange = useCallback((id: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      headers: prev.headers.map((h) => (h.id === id ? { ...h, value } : h)),
    }));
  }, []);

  const handleBodyChange = useCallback((body: string) => {
    setConfig((prev) => ({ ...prev, body }));
  }, []);

  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(config.body);
      setConfig((prev) => ({ ...prev, body: JSON.stringify(parsed, null, 2) }));
    } catch {
      // Invalid JSON - ignore
    }
  }, [config.body]);

  const handleCopyResponse = useCallback(async () => {
    if (!response.body) return;
    try {
      await navigator.clipboard.writeText(response.body);
    } catch {
      // Ignore clipboard errors
    }
  }, [response.body]);

  const handleCopyCurl = useCallback(async () => {
    let curl = `curl -X "${config.method}" "${config.url}`;
    const urlObj = new URL(config.url);
    config.params.filter((p) => p.enabled && p.key.trim()).forEach((p) => {
      urlObj.searchParams.append(p.key, p.value);
    });
    curl = `curl -X "${config.method}" "${urlObj.toString()}"`;

    config.headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      curl += ` -H "${h.key}: ${h.value}"`;
    });

    if (config.bodyMode === 'json' && config.body.trim()) {
      curl += ` -d '${config.body}'`;
      curl += ` --header "Content-Type: application/json"`;
    } else if (config.bodyMode === 'text' && config.body.trim()) {
      curl += ` -d '${config.body}'`;
    }

    try {
      await navigator.clipboard.writeText(curl);
    } catch {
      // Ignore
    }
  }, [config]);

  return (
    <div className="api-request-tester">
      {/* URL Validation Error */}
      {urlError && (
        <div className="api-request-tester__url-error" role="alert">
          {urlError}
        </div>
      )}

      {/* Request Builder */}
      <form
        className="api-request-tester__builder"
        onSubmit={handleSend}
        aria-label="API Request Builder"
      >
        {/* Method + URL */}
        <div className="api-request-tester__method-url">
          <div className="api-request-tester__method-group">
            <label className="api-request-tester__label" htmlFor="method-select">
              Method
            </label>
            <select
              id="method-select"
              value={config.method}
              onChange={(e) => handleMethodChange(e.target.value as HttpMethod)}
              className="api-request-tester__select"
              disabled={isSubmitting}
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="api-request-tester__url-group">
            <label className="api-request-tester__label" htmlFor="url-input">
              URL
            </label>
            <input
              type="text"
              id="url-input"
              value={config.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://jsonplaceholder.typicode.com/posts/1"
              className="api-request-tester__input"
              disabled={isSubmitting}
            />
            {urlError && (
              <span className="api-request-tester__error-text">{urlError}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="api-request-tester__actions">
          <button
            type="submit"
            className="api-request-tester__button api-request-tester__button--primary"
            disabled={isSubmitting || !isUrlValid}
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
<button
              type="button"
              className="api-request-tester__button"
              onClick={handleCancel}
              disabled={isSubmitting || !hasActiveRequest}
            >
            Cancel
          </button>
          <button
            type="button"
            className="api-request-tester__button"
            onClick={handleClear}
          >
            Clear Request
          </button>
        </div>

        {/* Body Mode Tabs */}
        <div className="api-request-tester__body-mode-tabs" role="tablist">
          <button
            role="tab"
            className={`api-request-tester__body-mode-tab${config.bodyMode === 'none' ? ' api-request-tester__body-mode-tab--active' : ''}`}
            onClick={() => handleBodyModeChange('none')}
            disabled={isSubmitting}
          >
            None
          </button>
          <button
            role="tab"
            className={`api-request-tester__body-mode-tab${config.bodyMode === 'json' ? ' api-request-tester__body-mode-tab--active' : ''}`}
            onClick={() => handleBodyModeChange('json')}
            disabled={isSubmitting || methodHasNoBody(config.method)}
          >
            JSON
          </button>
          <button
            role="tab"
            className={`api-request-tester__body-mode-tab${config.bodyMode === 'text' ? ' api-request-tester__body-mode-tab--active' : ''}`}
            onClick={() => handleBodyModeChange('text')}
            disabled={isSubmitting || methodHasNoBody(config.method)}
          >
            Text
          </button>
        </div>

        {/* Query Parameters */}
        <div className="api-request-tester__section">
          <div className="api-request-tester__section-header">
            <h3 className="api-request-tester__section-title">Query Parameters</h3>
            <button
              type="button"
              className="api-request-tester__button--small"
              onClick={handleAddParam}
              disabled={isSubmitting || !newParamKey.trim()}
            >
              Add
            </button>
          </div>

          {config.params.length === 0 ? (
            <div className="api-request-tester__empty-state">
              No query parameters. Add parameters to append them to the URL.
            </div>
          ) : (
            <div className="api-request-tester__table-wrap">
              <table className="api-request-tester__table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={config.params.every((p) => p.enabled)}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            params: prev.params.map((p) => ({ ...p, enabled: e.target.checked })),
                          }))
                        }
                        disabled={isSubmitting}
                        aria-label="Enable/disable all parameters"
                      />
                    </th>
                    <th>Key</th>
                    <th>Value</th>
                    <th style={{ width: '40px' }} />
                  </tr>
                </thead>
                <tbody>
                  {config.params.map((param) => (
                    <tr key={param.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={(e) => handleParamEnabledChange(param.id, e.target.checked)}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => handleParamKeyChange(param.id, e.target.value)}
                          placeholder="param key"
                          disabled={isSubmitting}
                          className="api-request-tester__table-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleParamValueChange(param.id, e.target.value)}
                          placeholder="param value"
                          disabled={isSubmitting}
                          className="api-request-tester__table-input"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="api-request-tester__remove-btn"
                          onClick={() => handleRemoveParam(param.id)}
                          disabled={isSubmitting}
                          aria-label="Remove parameter"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Headers */}
        <div className="api-request-tester__section">
          <div className="api-request-tester__section-header">
            <h3 className="api-request-tester__section-title">Headers</h3>
            <button
              type="button"
              className="api-request-tester__button--small"
              onClick={handleAddHeader}
              disabled={isSubmitting || !newHeaderKey.trim()}
            >
              Add
            </button>
          </div>

          {config.headers.length === 0 ? (
            <div className="api-request-tester__empty-state">
              No headers. Add headers to customize the request.
            </div>
          ) : (
            <div className="api-request-tester__table-wrap">
              <table className="api-request-tester__table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={config.headers.every((h) => h.enabled)}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            headers: prev.headers.map((h) => ({ ...h, enabled: e.target.checked })),
                          }))
                        }
                        disabled={isSubmitting}
                        aria-label="Enable/disable all headers"
                      />
                    </th>
                    <th>Key</th>
                    <th>Value</th>
                    <th style={{ width: '40px' }} />
                  </tr>
                </thead>
                <tbody>
                  {config.headers.map((header) => (
                    <tr key={header.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={header.enabled}
                          onChange={(e) => handleHeaderEnabledChange(header.id, e.target.checked)}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => handleHeaderKeyChange(header.id, e.target.value)}
                          placeholder="header name"
                          disabled={isSubmitting}
                          className="api-request-tester__table-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => handleHeaderValueChange(header.id, e.target.value)}
                          placeholder="header value"
                          disabled={isSubmitting}
                          className="api-request-tester__table-input"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="api-request-tester__remove-btn"
                          onClick={() => handleRemoveHeader(header.id)}
                          disabled={isSubmitting}
                          aria-label="Remove header"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Body */}
        {methodAllowsBody(config.method) ? (
          <div className="api-request-tester__section">
            <h3 className="api-request-tester__section-title">Request Body</h3>
            {config.bodyMode === 'none' ? (
              <div className="api-request-tester__empty-state">
                No body. Select JSON or Text to add a request body.
              </div>
            ) : config.bodyMode === 'json' ? (
              <>
                <textarea
                  value={config.body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  placeholder='{ "key": "value" }'
                  className="api-request-tester__textarea"
                  rows={6}
                  disabled={isSubmitting}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                />
                <div className="api-request-tester__body-actions">
                  <button
                    type="button"
                    className="api-request-tester__button--small"
                    onClick={handleFormatJson}
                    disabled={isSubmitting || !config.body.trim()}
                  >
                    Format JSON
                  </button>
                  <span className="api-request-tester__hint">
                    Content-Type: application/json will be set automatically
                  </span>
                </div>
              </>
            ) : config.bodyMode === 'text' ? (
              <>
                <textarea
                  value={config.body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  placeholder="Enter request body text..."
                  className="api-request-tester__textarea"
                  rows={6}
                  disabled={isSubmitting}
                  spellCheck={false}
                />
                <span className="api-request-tester__hint">
                  Set Content-Type: text/plain manually if needed
                </span>
              </>
            ) : null}
            <p className="api-request-tester__note">
              Body will not be sent for GET/HEAD methods. Content-Type is set based on selected mode.
            </p>
          </div>
        ) : (
          <div className="api-request-tester__section">
            <h3 className="api-request-tester__section-title">Request Body</h3>
            <div className="api-request-tester__empty-state">
              The {config.method} method does not support a request body.
            </div>
          </div>
        )}
      </form>

      {/* Response */}
      <div className="api-request-tester__response">
        {/* Response Summary */}
        {response.status !== null || response.error !== null ? (
          <div className="api-request-tester__response-summary">
            <div className={`api-request-tester__status-row ${getStatusClass(response.status)}`}>
              <span className="api-request-tester__status-code">
                {response.status ?? '\u2014'}
              </span>
              <span className="api-request-tester__status-text">
                {response.statusText ?? ''}
              </span>
            </div>
            {response.durationMs !== null && (
              <span className="api-request-tester__duration">
                {response.durationMs} ms
              </span>
            )}
            {response.sizeBytes !== null && (
              <span className="api-request-tester__size">
                {formatBytes(response.sizeBytes)}
              </span>
            )}
          </div>
        ) : (
          <div className="api-request-tester__empty-state">
            Make a request to see the response here.
          </div>
        )}

        {/* Response Tabs */}
        {(response.status !== null || response.error !== null) && (
          <div className="api-request-tester__response-tabs" role="tablist">
            <button
              role="tab"
              className={`api-request-tester__response-tab${activeTab === 'body' ? ' api-request-tester__response-tab--active' : ''}`}
              onClick={() => setActiveTab('body')}
            >
              Body
            </button>
            <button
              role="tab"
              className={`api-request-tester__response-tab${activeTab === 'headers' ? ' api-request-tester__response-tab--active' : ''}`}
              onClick={() => setActiveTab('headers')}
            >
              Headers
            </button>
          </div>
        )}

        {/* Body Tab */}
        {(response.status !== null || response.error !== null) && activeTab === 'body' && (
          <div className="api-request-tester__response-body">
            {response.isCorsError ? (
              <div className="api-request-tester__cors-error">
                <strong>CORS Restricted:</strong> Your browser blocked access to this response because of CORS restrictions. This does not necessarily mean the API is unavailable. The API server may need to allow requests from this origin.
              </div>
            ) : response.bodyIsJson && response.body ? (
              <pre className="api-request-tester__json-response">
                {response.body}
              </pre>
            ) : response.body ? (
              <pre className="api-request-tester__text-response">
                {response.body}
              </pre>
            ) : response.error && response.isValidationError ? (
              <div className="api-request-tester__validation-error">
                <strong>Validation Error:</strong> {response.validationMessage}
              </div>
            ) : response.error ? (
              <div className="api-request-tester__error-message">
                <strong>Error:</strong> {response.error}
              </div>
            ) : (
              <div className="api-request-tester__empty-response">
                No response body
              </div>
            )}

            {response.body && !response.bodyIsJson && !response.isCorsError && !response.error && !response.validationMessage && (
              <div className="api-request-tester__response-actions">
                <button
                  type="button"
                  className="api-request-tester__button--small"
                  onClick={handleCopyResponse}
                >
                  <Icon name="copy" size={14} /> Copy
                </button>
                <button
                  type="button"
                  className="api-request-tester__button--small"
                  onClick={() => setResponse(EMPTY_RESPONSE)}
                >
                  <Icon name="trash-2" size={14} /> Clear
                </button>
                <button
                  type="button"
                  className="api-request-tester__button--small"
                  onClick={handleCopyCurl}
                >
                  <Icon name="copy" size={14} /> Copy as cURL
                </button>
              </div>
            )}
          </div>
        )}

        {/* Headers Tab */}
        {(response.status !== null || response.error !== null) && activeTab === 'headers' && (
          <div className="api-request-tester__response-headers">
            {Object.keys(response.headers).length === 0 ? (
              <div className="api-request-tester__empty-state">
                No response headers
              </div>
            ) : (
              <div className="api-request-tester__headers-list">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="api-request-tester__header-row"
                  >
                    <span className="api-request-tester__header-key">{key}</span>
                    <span className="api-request-tester__header-value">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="api-request-tester__note">
              Browsers only expose certain response headers to JavaScript due to CORS.
            </p>
          </div>
        )}
      </div>

      {/* Request History */}
      {history.length > 0 && (
        <div className="api-request-tester__history-panel">
          <div className="api-request-tester__history-header">
            <span className="api-request-tester__history-title">Request History</span>
            <button
              className="api-request-tester__button--link"
              onClick={handleClearHistory}
            >
              Clear History
            </button>
          </div>
          <div className="api-request-tester__history-list">
            {history.map((entry) => (
              <button
                key={entry.id}
                className="api-request-tester__history-item"
                onClick={() => handleHistorySelect(entry)}
                type="button"
              >
                <span className="api-request-tester__history-method">{entry.method}</span>
                <span className="api-request-tester__history-url">
                  {entry.url.length > 80
                    ? entry.url.substring(0, 80) + '\u2026'
                    : entry.url}
                </span>
                <span className="api-request-tester__history-status">
                  {entry.status ? `${entry.status} ${entry.statusText ?? ''}`.trim() : '\u2014'}
                </span>
                <span className="api-request-tester__history-duration">
                  {entry.durationMs ?? '\u2014'} ms
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}