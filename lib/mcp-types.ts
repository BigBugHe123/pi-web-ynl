export type McpExposure = "codemode" | "deferred" | "direct" | "hidden";
export interface McpOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  clientName?: string;
  callbackPort?: number;
  callbackUrl?: string;
  /** OAuth scope string accepted by pi-mcp. */
  scope?: string;
  /** Legacy app-specific form retained for configs already parsed by Pi Web. */
  scopes?: string[];
  clientRegistration?: "auto" | "dcr" | "cimd";
  authServerMetadataUrl?: string;
}
export interface McpStdioServerConfig {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  description?: string;
  enabled?: boolean;
  timeout?: number;
  exposure?: McpExposure;
  toolExposure?: Record<string, McpExposure>;
}
export interface McpHttpServerConfig {
  type?: "http";
  url: string;
  headers?: Record<string, string>;
  oauth?: McpOAuthConfig;
  description?: string;
  enabled?: boolean;
  timeout?: number;
  exposure?: McpExposure;
  toolExposure?: Record<string, McpExposure>;
}
export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;
